import * as THREE from 'three';

let initial = [2, 10, 9, 6, 1, 7, 3, 5, 4, 8];
let values = [];
let items = [];
let i = 1;
let j = 0;
let key = null;
let phase = 'select';
let playing = false;
let last = performance.now();
let elapsed = 0;
let celebrationTime = -1;

const colors = [0xf3b6ca, 0xcbb7e9, 0xf6c29f, 0xd99ab8, 0xb9d8c2, 0xe8a0a9, 0xb8c6e8, 0xd9b5dc, 0xf1d09f, 0xc8b2d8];
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x211827);
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
camera.position.set(0, 3.4, 12);
camera.lookAt(0, 1.35, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2.5));
renderer.shadowMap.enabled = true;
document.getElementById('stage').appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffd9e7, 0x39263a, 2));
const lamp = new THREE.DirectionalLight(0xffffff, 3);
lamp.position.set(-5, 9, 7);
lamp.castShadow = true;
scene.add(lamp);
const floor = new THREE.Mesh(new THREE.BoxGeometry(13, 0.25, 3), new THREE.MeshStandardMaterial({ color: 0x493143, roughness: 0.7 }));
floor.position.y = -0.12;
floor.receiveShadow = true;
scene.add(floor);

function labelTexture(value) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = true;
  context.shadowColor = 'rgba(63, 28, 54, 0.75)';
  context.shadowBlur = 12;
  context.shadowOffsetY = 4;
  context.lineWidth = 12;
  context.strokeStyle = '#6f3f5d';
  context.fillStyle = '#ffffff';
  context.font = 'bold 190px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.strokeText(value, 256, 256);
  context.fillText(value, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.needsUpdate = true;
  return texture;
}

function barWidth() {
  return Math.min(0.9, 8.8 / values.length);
}

function barSpacing() {
  return Math.min(0.9, 9.6 / values.length);
}

function makeItem(value, index) {
  const height = 0.55 + value * 0.16;
  const width = barWidth();
  const material = new THREE.MeshStandardMaterial({ color: colors[index % colors.length], roughness: 0.4, metalness: 0.08 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, 1.35), material);
  mesh.castShadow = true;
  mesh.userData = { value, height, tx: 0, ty: 0, tz: 0 };
  const front = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.78, Math.min(0.7, height * 0.5)), new THREE.MeshBasicMaterial({ map: labelTexture(value), transparent: true }));
  front.position.z = 0.681;
  mesh.add(front);
  scene.add(mesh);
  return mesh;
}

function xAt(index) {
  return (index - (values.length - 1) / 2) * barSpacing();
}

function layout() {
  items.forEach((item, index) => {
    if (!item) return;
    item.userData.tx = xAt(index);
    item.userData.ty = item.userData.height / 2 + 0.1;
    item.userData.tz = 0;
  });
  if (key) {
    key.userData.tx = xAt(j + 1);
    key.userData.ty = key.userData.height / 2 + 1;
    key.userData.tz = 0.15;
  }
  document.getElementById('keyTag').style.display = key ? 'block' : 'none';
}

function rebuild() {
  items.forEach((item) => scene.remove(item));
  values = initial.slice();
  items = values.map((value, index) => makeItem(value, index));
  layout();
}

function renderCode() {
  const lines = [
    'def insertion_sort(a):', '    n = len(a)', '    for i in range(1, n):',
    '        key = a[i]', '        j = i - 1', '        while j > 0 and a[j - 1] > key:',
    '            a[j] = a[j - 1]', '            j -= 1', '        a[j] = key'
  ];
  const active = phase === 'select' ? 3 : phase === 'compare' ? 5 : phase === 'shift' ? 6 : 8;
  document.getElementById('source').innerHTML = lines.map((line, index) =>
    `<span class="line ${index + 1 === active ? 'active' : ''}"><span class="ln">${index + 1}</span>${line
      .replace(/(def|for|while|in|and)/g, '<b class="kw">$1</b>')
      .replace(/(insertion_sort|range|len)/g, '<b class="fn">$1</b>')
      .replace(/\b(\d+)\b/g, '<b class="num">$1</b>')}</span>`
  ).join('');
}

function update() {
  const displayedValues = values.filter((value) => value !== null);
  if (key) displayedValues.splice(j + 1, 0, key.userData.value);
  const arrayText = `[${displayedValues.join(', ')}]`;
  document.getElementById('arrayText').textContent = arrayText;
  document.getElementById('arrayStat').textContent = `a = ${arrayText}`;
  document.getElementById('length').textContent = values.length;
  document.getElementById('iStat').textContent = `i = ${Math.min(i, values.length)}`;
  document.getElementById('jStat').textContent = `j = ${key ? j : '—'}`;
  document.getElementById('keyStat').textContent = `key = ${key ? key.userData.value : '—'}`;
  document.getElementById('phaseText').textContent = phase[0].toUpperCase() + phase.slice(1);
  renderCode();
}

function advance() {
  elapsed = 0;
  if (phase === 'select') {
    if (i >= values.length) {
      playing = false;
      phase = 'done';
      celebrationTime = 0;
      update();
      return;
    }
    key = items[i];
    items[i] = null;
    values[i] = null;
    j = i - 1;
    phase = 'compare';
  } else if (phase === 'compare') {
    phase = j >= 0 && values[j] > key.userData.value ? 'shift' : 'insert';
  } else if (phase === 'shift') {
    values[j + 1] = values[j];
    items[j + 1] = items[j];
    j -= 1;
    phase = 'compare';
  } else if (phase === 'insert') {
    values[j + 1] = key.userData.value;
    items[j + 1] = key;
    key = null;
    i += 1;
    phase = 'select';
  }
  layout();
  update();
}

function reset() {
  i = 1;
  j = 0;
  key = null;
  phase = 'select';
  playing = false;
  celebrationTime = -1;
  rebuild();
  update();
}

document.getElementById('play').onclick = () => {
  if (phase === 'done') reset();
  playing = true;
};
document.getElementById('pause').onclick = () => { playing = false; };
document.getElementById('reset').onclick = reset;
document.getElementById('step').onclick = () => { playing = false; advance(); };
document.getElementById('apply').onclick = () => {
  const parsed = document.getElementById('custom').value.split(',').map(Number).filter(Number.isFinite).slice(0, 14);
  if (parsed.length > 1) {
    initial = parsed;
    reset();
  }
};

function resize() {
  const element = document.getElementById('stage');
  renderer.setSize(element.clientWidth, element.clientHeight, false);
  camera.aspect = element.clientWidth / element.clientHeight;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
resize();
reset();

function animate(now) {
  requestAnimationFrame(animate);
  const delta = now - last;
  last = now;
  if (playing && phase !== 'done') {
    elapsed += delta;
    if (elapsed > 900 / Number(document.getElementById('speed').value)) advance();
  }
  if (phase === 'done' && celebrationTime >= 0) celebrationTime += delta;
  items.forEach((item, index) => {
    if (!item) return;
    item.position.x += (item.userData.tx - item.position.x) * 0.13;
    let targetY = item.userData.ty;
    if (phase === 'done' && celebrationTime >= index * 120 && celebrationTime < index * 120 + 400) {
      const progress = (celebrationTime - index * 120) / 400;
      targetY += Math.sin(progress * Math.PI) * 0.55;
    }
    item.position.y += (targetY - item.position.y) * 0.13;
    item.position.z += (item.userData.tz - item.position.z) * 0.13;
    item.material.emissive.setHex(item === key ? 0x552255 : 0x000000);
    item.material.emissiveIntensity = item === key ? 0.8 : 0;
  });
  const tag = document.getElementById('keyTag');
  if (key) {
    const position = key.position.clone();
    position.y += key.userData.height / 2 + 0.5;
    position.project(camera);
    tag.style.left = `${(position.x + 1) / 2 * renderer.domElement.clientWidth}px`;
    tag.style.top = `${(-position.y + 1) / 2 * renderer.domElement.clientHeight}px`;
  }
  renderer.render(scene, camera);
}

requestAnimationFrame(animate);
