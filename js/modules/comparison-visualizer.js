import * as THREE from 'three';
import { DEFAULT_VALUES, BAR_COLORS } from '../utils/constants.js';
import { getElement } from '../utils/dom.js';
import { parseArrayInput } from '../utils/helpers.js';
import { bindAnimationControls, getAnimationSpeed } from './animation-controller.js';
import { renderCode } from './code-highlighter.js';
import { updateComparisonStatistics } from './statistics.js';
import {
  createComparisonBars,
  createVisualization,
  disposeBars,
  getBarX,
  resizeVisualization
} from './renderer.js';

export function startComparisonVisualizer({ algorithm, code, buildFrames }) {
  const stage = getElement('stage');
  const source = getElement('source');
  const indicatorElements = {
    comparing: algorithm === 'bubble' ? getElement('comparingTag') : null,
    minimum: document.getElementById('minimumTag'),
    current: document.getElementById('currentTag'),
    scanning: document.getElementById('scanningTag')
  };
  const { scene, camera, renderer } = createVisualization(stage, { pixelRatio: 2 });

  let originalValues = DEFAULT_VALUES.slice();
  let bars = [];
  let frames = [];
  let frameIndex = 0;
  let playing = false;
  let motionPaused = false;
  let pendingSteps = 0;
  let motion = null;
  let elapsed = 0;
  let last = performance.now();

  function setTagPosition(element, index, verticalOffset = 0, followBar = true) {
    if (index === null || index < 0 || index >= bars.length) {
      element.style.display = 'none';
      return;
    }

    const bar = frames[frameIndex].order[index];
    const position = new THREE.Vector3(
      followBar ? bar.position.x : getBarX(index, bars.length),
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
      if (!frame.comparisonIndices || !indicatorElements.comparing) {
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

    setTagPosition(indicatorElements.minimum, frame.minimumIndex);
    setTagPosition(indicatorElements.current, frame.currentIndex, 25, false);
    setTagPosition(
      indicatorElements.scanning,
      frame.scanningIndex,
      frame.scanningIndex === frame.minimumIndex ? 24 : 0
    );
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
        ? (index === frame.comparisonIndices[0]
          ? 0xf3b6ca
          : index === frame.comparisonIndices[1]
            ? 0xcbb7e9
            : BAR_COLORS[bar.userData.id % BAR_COLORS.length])
        : isMinimum
          ? 0xf3b6ca
          : isScanning
            ? 0xcbb7e9
            : BAR_COLORS[bar.userData.id % BAR_COLORS.length];

      bar.material.color.setHex(color);
      bar.material.emissive.setHex(isSorted ? 0x244332 : isActive || isMinimum || isScanning ? 0x38263d : 0x000000);
      bar.material.emissiveIntensity = isSorted ? 0.38 : isActive || isMinimum || isScanning ? 0.2 : 0;
      bar.userData.outline.visible = isCurrent;
      bar.userData.outline.material.color.setHex(0xf1d09f);
    });

    updateComparisonStatistics(frame, algorithm);
    renderCode(source, code, frame.line, false);
    updateIndicators(frame);
  }

  function startMotion(frame) {
    const moves = [];
    frame.order.forEach((bar, index) => {
      const targetX = getBarX(index, bars.length);
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

  function reset(values = originalValues) {
    playing = false;
    motionPaused = false;
    pendingSteps = 0;
    motion = null;
    elapsed = 0;
    disposeBars(scene, bars);
    originalValues = values.slice();
    bars = createComparisonBars(scene, originalValues);
    frames = buildFrames(bars);
    frameIndex = 0;
    updateFrame();
  }

  bindAnimationControls({
    onPlay: () => {
      if (frameIndex >= frames.length - 1) reset();
      motionPaused = false;
      playing = true;
      elapsed = 0;
    },
    onPause: () => {
      playing = false;
      motionPaused = true;
    },
    onReset: () => reset(),
    onStep: () => {
      playing = false;
      motionPaused = false;
      if (motion) {
        pendingSteps += 1;
        return;
      }
      advanceFrame();
    },
    onApply: () => {
      const input = getElement('custom');
      const error = getElement('arrayError');
      const result = parseArrayInput(input.value);

      if (!result.values) {
        error.textContent = result.error;
        return;
      }

      error.textContent = '';
      reset(result.values);
    }
  });

  function resize() {
    if (!resizeVisualization(stage, renderer, camera, true)) return;
    if (frames.length) updateIndicators(frames[frameIndex]);
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
      const duration = 650 / getAnimationSpeed();
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
      if (elapsed >= 760 / getAnimationSpeed()) advanceFrame();
    }

    renderer.render(scene, camera);
  }

  reset();
  resize();
  requestAnimationFrame(animate);
}
