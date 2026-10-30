import * as THREE from 'three';

const defaultValues = [2, 10, 9, 6, 1, 7, 3, 5, 4, 8];
const palette = [0xf3b6ca, 0xcbb7e9, 0xf6c29f, 0xd99ab8, 0xb9d8c2, 0xe8a0a9, 0xb8c6e8, 0xd9b5dc, 0xf1d09f, 0xc8b2d8];
const algorithm = document.querySelector('.comparison-app').dataset.algorithm;
const codeByAlgorithm = {
  bubble: [
    'def bubble_sort(a):',
    '    n = len(a)',
    '    for i in range(1, n):',
    '        for j in range(0, n - i):',
    '            if a[j] > a[j + 1]:',
    '                a[j], a[j + 1] = a[j + 1], a[j]'
  ],
  selection: [
    'def selection_sort(a):',
    '    for i in range(len(a) - 1):',
    '        min_index = i',
    '        for j in range(i + 1, len(a)):',
    '            if a[j] < a[min_index]:',
    '                min_index = j',
    '        a[i], a[min_index] = a[min_index], a[i]'
  ]
};
const code = codeByAlgorithm[algorithm];

if (!code) throw new Error(`Unknown sorting algorithm: ${algorithm}`);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x211827);
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
camera.position.set(0, 3.4, 12);
camera.lookAt(0, 1.35, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';

scene.add(new THREE.HemisphereLight(0xffd9e7, 0x39263a, 2));
const lamp = new THREE.DirectionalLight(0xffffff, 3);
lamp.position.set(-5, 9, 7);
lamp.castShadow = true;
scene.add(lamp);

const floor = new THREE.Mesh(
  new THREE.BoxGeometry(13, 0.25, 3),
  new THREE.MeshStandardMaterial({ color: 0x493143, roughness: 0.7 })
);
floor.position.y = -0.12;
floor.receiveShadow = true;
scene.add(floor);

const stage = document.getElementById('stage');
const source = document.getElementById('source');
const indicatorElements = {
  comparing: document.getElementById('comparingTag'),
  minimum: document.getElementById('minimumTag'),
  current: document.getElementById('currentTag'),
  scanning: document.getElementById('scanningTag')
};

let originalValues = defaultValues.slice();
let bars = [];
let frames = [];
let frameIndex = 0;
let playing = false;
let motionPaused = false;
let pendingSteps = 0;
let motion = null;
let elapsed = 0;
let last = performance.now();

function makeLabel(value) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const text = String(value);
  const fontSize = Math.max(54, Math.min(150, 1000 / text.length));
  context.fillStyle = '#ffffff';
  context.font = `bold ${fontSize}px Arial`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 256, 132, 480);
  return new THREE.CanvasTexture(canvas);
}

function makeBars(values) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spacing = Math.min(0.9, 9.6 / values.length);
  const width = Math.min(0.72, spacing * 0.76);

  return values.map((value, index) => {
    const height = maximum === minimum ? 1.8 : 0.65 + ((value - minimum) / (maximum - minimum)) * 2.95;
    const material = new THREE.MeshStandardMaterial({
      color: palette[index % palette.length],
      roughness: 0.4,
      metalness: 0.08
    });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(width, height, 1.35), material);
    bar.castShadow = true;
    bar.position.set((index - (values.length - 1) / 2) * spacing, height / 2 + 0.1, 0);
    bar.userData = { value, height, id: index };

    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.82, Math.min(0.7, height * 0.5)),
      new THREE.MeshBasicMaterial({ map: makeLabel(value), transparent: true })
    );
    label.position.z = 0.681;
    bar.add(label);

    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(bar.geometry),
      new THREE.LineBasicMaterial({ color: 0xffe6f0, transparent: true, opacity: 0.95 })
    );
    outline.visible = false;
    outline.renderOrder = 2;
    bar.add(outline);
    bar.userData.outline = outline;
    scene.add(bar);
    return bar;
  });
}

function xAt(index) {
  return (index - (bars.length - 1) / 2) * Math.min(0.9, 9.6 / bars.length);
}

function createFrame(order, state) {
  frames.push({
    order: order.slice(),
    activeIndices: [],
    comparisonIndices: null,
    minimumIndex: null,
    currentIndex: null,
    scanningIndex: null,
    sortedCount: 0,
    sortedFrom: order.length,
    pass: null,
    comparisons: 0,
    swaps: 0,
    line: 1,
    phase: 'Ready',
    operation: 'Ready to begin',
    ...state
  });
}

function buildFrames() {
  frames = [];
  const order = bars.slice();
  let comparisons = 0;
  let swaps = 0;
  createFrame(order, algorithm === 'bubble'
    ? { operation: 'Ready to begin', pass: 1 }
    : {
      line: 3,
      phase: 'Select minimum',
      operation: `Start with ${order[0].userData.value} as the minimum`,
      currentIndex: 0,
      minimumIndex: 0
    });

  if (algorithm === 'bubble') {
    for (let pass = 1; pass < order.length; pass += 1) {
      createFrame(order, {
        line: 3,
        phase: `Pass ${pass}`,
        operation: `Pass ${pass}: scan from left to right`,
        pass,
        comparisons,
        swaps,
        sortedFrom: order.length - pass
      });

      for (let index = 0; index < order.length - pass; index += 1) {
        comparisons += 1;
        const leftValue = order[index].userData.value;
        const rightValue = order[index + 1].userData.value;
        const needsSwap = leftValue > rightValue;
        createFrame(order, {
          line: 5,
          phase: 'Compare',
          operation: needsSwap
            ? `${leftValue} > ${rightValue}: swap`
            : `${leftValue} <= ${rightValue}: no swap`,
          pass,
          comparisonIndices: [index, index + 1],
          activeIndices: [index, index + 1],
          sortedFrom: order.length - pass,
          comparisons,
          swaps
        });

        if (needsSwap) {
          [order[index], order[index + 1]] = [order[index + 1], order[index]];
          swaps += 1;
          createFrame(order, {
            line: 6,
            phase: 'Swap',
            operation: `Swap ${order[index].userData.value} and ${order[index + 1].userData.value}`,
            pass,
            comparisonIndices: [index, index + 1],
            activeIndices: [index, index + 1],
            sortedFrom: order.length - pass,
            comparisons,
            swaps
          });
        }
      }

      createFrame(order, {
        line: 3,
        phase: 'Pass complete',
        operation: `${order[order.length - pass].userData.value} is in its final position`,
        pass,
        sortedFrom: order.length - pass,
        comparisons,
        swaps
      });
    }

    createFrame(order, {
      line: 3,
      phase: 'Complete',
      operation: 'Array sorted',
      pass: order.length - 1,
      sortedFrom: 0,
      comparisons,
      swaps
    });
    return;
  }

  for (let destination = 0; destination < order.length - 1; destination += 1) {
    let minimumIndex = destination;
    if (destination > 0) {
      createFrame(order, {
        line: 3,
        phase: 'Select minimum',
        operation: `Start with ${order[minimumIndex].userData.value} as the minimum`,
        currentIndex: destination,
        minimumIndex,
        comparisons,
        swaps,
        sortedCount: destination
      });
    }

    for (let scanIndex = destination + 1; scanIndex < order.length; scanIndex += 1) {
      comparisons += 1;
      const candidateValue = order[scanIndex].userData.value;
      const minimumValue = order[minimumIndex].userData.value;
      const isNewMinimum = candidateValue < minimumValue;
      createFrame(order, {
        line: 5,
        phase: 'Scan',
        operation: isNewMinimum
          ? `${candidateValue} < ${minimumValue}: new minimum`
          : `${candidateValue} >= ${minimumValue}: keep minimum`,
        comparisonIndices: [minimumIndex, scanIndex],
        activeIndices: [scanIndex],
        currentIndex: destination,
        minimumIndex,
        scanningIndex: scanIndex,
        sortedCount: destination,
        comparisons,
        swaps
      });

      if (isNewMinimum) {
        minimumIndex = scanIndex;
        createFrame(order, {
          line: 6,
          phase: 'New minimum',
          operation: `${order[minimumIndex].userData.value} is the new minimum`,
          comparisonIndices: [minimumIndex, scanIndex],
          activeIndices: [scanIndex],
          currentIndex: destination,
          minimumIndex,
          scanningIndex: scanIndex,
          sortedCount: destination,
          comparisons,
          swaps
        });
      }
    }

    if (minimumIndex !== destination) {
      [order[destination], order[minimumIndex]] = [order[minimumIndex], order[destination]];
      swaps += 1;
      createFrame(order, {
        line: 7,
        phase: 'Place minimum',
        operation: `Move ${order[destination].userData.value} to position ${destination + 1}`,
        comparisonIndices: [destination, minimumIndex],
        activeIndices: [destination, minimumIndex],
        currentIndex: destination,
        minimumIndex: destination,
        sortedCount: destination,
        comparisons,
        swaps
      });
    }

    createFrame(order, {
      line: 2,
      phase: 'Pass complete',
      operation: `${order[destination].userData.value} is in its final position`,
      currentIndex: destination + 1 < order.length - 1 ? destination + 1 : null,
      sortedCount: destination + 1,
      comparisons,
      swaps
    });
  }

  createFrame(order, {
    line: 2,
    phase: 'Complete',
    operation: 'Array sorted',
    sortedCount: order.length,
    comparisons,
    swaps
  });
}

function renderCode(activeLine) {
  source.replaceChildren(...code.map((line, index) => {
    const row = document.createElement('span');
    row.className = `line${index + 1 === activeLine ? ' active' : ''}`;
    const number = document.createElement('span');
    number.className = 'ln';
    number.textContent = String(index + 1);
    row.append(number, document.createTextNode(line));
    return row;
  }));
}

function setTagPosition(element, index, verticalOffset = 0, followBar = true) {
  if (index === null || index < 0 || index >= bars.length) {
    element.style.display = 'none';
    return;
  }

  const bar = frames[frameIndex].order[index];
  const position = new THREE.Vector3(
    followBar ? bar.position.x : xAt(index),
    bar.position.y + bar.userData.height / 2 + 0.45,
    bar.position.z
  );
  position.project(camera);
  element.style.display = 'block';
  element.style.left = `${(position.x + 1) / 2 * stage.clientWidth}px`;
  element.style.top = `${(-position.y + 1) / 2 * stage.clientHeight}px`;
  element.style.setProperty('--indicator-offset', `${verticalOffset}px`);
}

function updateIndicators(frame) {
  if (algorithm === 'bubble') {
    if (!frame.comparisonIndices) {
      indicatorElements.comparing.style.display = 'none';
      return;
    }

    const [left, right] = frame.comparisonIndices;
    const leftBar = frame.order[left];
    const rightBar = frame.order[right];
    const position = new THREE.Vector3(
      (leftBar.position.x + rightBar.position.x) / 2,
      Math.max(
        leftBar.position.y + leftBar.userData.height / 2,
        rightBar.position.y + rightBar.userData.height / 2
      ) + 0.55,
      0
    );
    position.project(camera);
    indicatorElements.comparing.style.display = 'block';
    indicatorElements.comparing.style.left = `${(position.x + 1) / 2 * stage.clientWidth}px`;
    indicatorElements.comparing.style.top = `${(-position.y + 1) / 2 * stage.clientHeight}px`;
    indicatorElements.comparing.style.setProperty('--indicator-offset', '0px');
    return;
  }

  setTagPosition(indicatorElements.minimum, frame.minimumIndex, 0);
  setTagPosition(indicatorElements.current, frame.currentIndex, 25, false);
  setTagPosition(indicatorElements.scanning, frame.scanningIndex, frame.scanningIndex === frame.minimumIndex ? 24 : 0);
}

function updateStatistics(frame) {
  document.getElementById('length').textContent = String(frame.order.length);
  document.getElementById('arrayText').textContent = `[${frame.order.map((bar) => bar.userData.value).join(', ')}]`;
  document.getElementById('operationStat').textContent = frame.operation;
  document.getElementById('comparisonStat').textContent = `Comparisons: ${frame.comparisons}`;
  document.getElementById('swapStat').textContent = `Swaps: ${frame.swaps}`;
  document.getElementById('phaseText').textContent = frame.phase;

  if (algorithm === 'bubble') {
    document.getElementById('passStat').textContent = `Pass: ${frame.pass ?? '—'}`;
    document.getElementById('indicesStat').textContent = frame.comparisonIndices
      ? `Indices: ${frame.comparisonIndices[0] + 1}, ${frame.comparisonIndices[1] + 1}`
      : 'Indices: —';
    return;
  }

  document.getElementById('minimumStat').textContent = frame.minimumIndex === null
    ? 'Minimum: —'
    : `Minimum: ${frame.order[frame.minimumIndex].userData.value} (index ${frame.minimumIndex + 1})`;
  document.getElementById('destinationStat').textContent = frame.currentIndex === null
    ? 'Destination: —'
    : `Destination: ${frame.currentIndex + 1}`;
}

function updateFrame() {
  const frame = frames[frameIndex];
  frame.order.forEach((bar, index) => {
    const isActive = frame.activeIndices.includes(index);
    const isMinimum = frame.minimumIndex === index;
    const isScanning = frame.scanningIndex === index;
    const isCurrent = frame.currentIndex === index;
    const isSorted = index < frame.sortedCount || index >= frame.sortedFrom;
    const color = algorithm === 'bubble' && frame.comparisonIndices
      ? (index === frame.comparisonIndices[0] ? 0xf3b6ca : index === frame.comparisonIndices[1] ? 0xcbb7e9 : palette[bar.userData.id % palette.length])
      : isMinimum
        ? 0xf3b6ca
        : isScanning
          ? 0xcbb7e9
          : palette[bar.userData.id % palette.length];

    bar.material.color.setHex(color);
    bar.material.emissive.setHex(isSorted ? 0x244332 : isActive || isMinimum || isScanning ? 0x38263d : 0x000000);
    bar.material.emissiveIntensity = isSorted ? 0.38 : isActive || isMinimum || isScanning ? 0.2 : 0;
    bar.userData.outline.visible = isCurrent;
    bar.userData.outline.material.color.setHex(0xf1d09f);
  });

  updateStatistics(frame);
  renderCode(frame.line);
  updateIndicators(frame);
}

function startMotion(frame) {
  const moves = [];
  frame.order.forEach((bar, index) => {
    const targetX = xAt(index);
    if (Math.abs(bar.position.x - targetX) > 0.001) {
      moves.push({
        bar,
        startX: bar.position.x,
        startY: bar.position.y,
        startZ: bar.position.z,
        targetX,
        baseY: bar.userData.height / 2 + 0.1,
        direction: bar.position.x < targetX ? 1 : -1
      });
    }
  });

  if (moves.length) motion = { moves, elapsed: 0 };
}

function advanceFrame() {
  if (frameIndex >= frames.length - 1) {
    playing = false;
    return;
  }

  frameIndex += 1;
  elapsed = 0;
  updateFrame();
  startMotion(frames[frameIndex]);

  if (frameIndex === frames.length - 1) playing = false;
}

function disposeBars() {
  bars.forEach((bar) => {
    scene.remove(bar);
    bar.traverse((object) => {
      object.geometry?.dispose();
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => {
          material.map?.dispose();
          material.dispose();
        });
      } else if (object.material) {
        object.material.map?.dispose();
        object.material.dispose();
      }
    });
  });
}

function reset(values = originalValues) {
  playing = false;
  motionPaused = false;
  pendingSteps = 0;
  motion = null;
  elapsed = 0;
  disposeBars();
  originalValues = values.slice();
  bars = makeBars(originalValues);
  buildFrames();
  frameIndex = 0;
  updateFrame();
}

document.getElementById('play').addEventListener('click', () => {
  if (frameIndex >= frames.length - 1) reset();
  motionPaused = false;
  playing = true;
  elapsed = 0;
});

document.getElementById('pause').addEventListener('click', () => {
  playing = false;
  motionPaused = true;
});

document.getElementById('reset').addEventListener('click', () => reset());

document.getElementById('step').addEventListener('click', () => {
  playing = false;
  motionPaused = false;
  if (motion) {
    pendingSteps += 1;
    return;
  }
  advanceFrame();
});

document.getElementById('apply').addEventListener('click', () => {
  const input = document.getElementById('custom');
  const error = document.getElementById('arrayError');
  const entries = input.value.split(',').map((entry) => entry.trim());
  const parsed = entries.map(Number);

  if (entries.length < 2 || entries.length > 14 || entries.some((entry) => entry === '') || parsed.some((value) => !Number.isFinite(value))) {
    error.textContent = 'Enter 2-14 finite numbers separated by commas.';
    return;
  }

  error.textContent = '';
  reset(parsed);
});

function resize() {
  if (!stage.clientWidth || !stage.clientHeight) return;
  renderer.setSize(stage.clientWidth, stage.clientHeight, false);
  camera.aspect = stage.clientWidth / stage.clientHeight;
  camera.position.z = Math.max(
    12,
    10.4 / (2 * Math.tan(THREE.MathUtils.degToRad(34 / 2)) * camera.aspect)
  );
  camera.lookAt(0, 1.35, 0);
  camera.updateProjectionMatrix();
  updateIndicators(frames[frameIndex]);
}

window.addEventListener('resize', resize);
const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(stage);

function animate(now) {
  requestAnimationFrame(animate);
  const delta = Math.min(now - last, 100);
  last = now;

  if (motion && !motionPaused) {
    motion.elapsed += delta;
    const duration = 650 / Number(document.getElementById('speed').value);
    const progress = Math.min(motion.elapsed / duration, 1);
    const eased = progress * progress * (3 - 2 * progress);
    motion.moves.forEach((move) => {
      move.bar.position.x = move.startX + (move.targetX - move.startX) * eased;
      move.bar.position.y = move.startY + (move.baseY - move.startY) * eased
        + Math.sin(progress * Math.PI) * 0.12 * move.direction;
      move.bar.position.z = move.startZ;
    });
    updateIndicators(frames[frameIndex]);

    if (progress === 1) {
      motion.moves.forEach((move) => {
        move.bar.position.set(move.targetX, move.baseY, 0);
      });
      motion = null;
      updateIndicators(frames[frameIndex]);
      if (pendingSteps > 0) {
        pendingSteps -= 1;
        advanceFrame();
      } else {
        elapsed = 0;
      }
    }
  } else if (pendingSteps > 0 && !motionPaused) {
    pendingSteps -= 1;
    advanceFrame();
  } else if (playing) {
    elapsed += delta;
    if (elapsed >= 760 / Number(document.getElementById('speed').value)) advanceFrame();
  }

  renderer.render(scene, camera);
}

reset();
resize();
requestAnimationFrame(animate);
