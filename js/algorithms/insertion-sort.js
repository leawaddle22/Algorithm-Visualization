import * as THREE from 'three';
import { DEFAULT_VALUES, BAR_COLORS } from '../utils/constants.js';
import { getElement } from '../utils/dom.js';
import { parseArrayInput } from '../utils/helpers.js';
import { bindAnimationControls, getAnimationSpeed } from '../modules/animation-controller.js';
import { renderCode as renderHighlightedCode } from '../modules/code-highlighter.js';
import { updateInsertionStatistics } from '../modules/statistics.js';
import { createCompletionAnimation } from '../modules/completion-animation.js';
import {
  BAR_DEPTH,
  createVisualization,
  createValueTexture,
  getBarHeight,
  getBarSpacing,
  getBarWidth,
  resizeVisualization
} from '../modules/renderer.js';

let initial = DEFAULT_VALUES.slice();
let values = [];
let items = [];
let i = 1;
let j = 0;
let key = null;
let phase = 'select';
let playing = false;
let last = performance.now();
let elapsed = 0;
let completionPending = false;
const completionAnimation = createCompletionAnimation();
const stage = getElement('stage');
const { scene, camera, renderer } = createVisualization(stage, { pixelRatio: 2.5 });

function makeItem(value, index) {
  const height = getBarHeight(value, initial);
  const width = getBarWidth(values.length);
  const material = new THREE.MeshStandardMaterial({
    color: BAR_COLORS[index % BAR_COLORS.length],
    roughness: 0.4,
    metalness: 0.08
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, BAR_DEPTH), material);
  mesh.castShadow = true;
  mesh.userData = { value, height, tx: 0, ty: 0, tz: 0 };
  const front = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.82, Math.min(0.7, height * 0.5)),
    new THREE.MeshBasicMaterial({ map: createValueTexture(value, 'insertion', renderer), transparent: true })
  );
  front.position.z = BAR_DEPTH / 2 + 0.006;
  mesh.add(front);
  scene.add(mesh);
  return mesh;
}

function xAt(index) {
  return (index - (values.length - 1) / 2) * getBarSpacing(values.length);
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
  getElement('keyTag').style.display = key ? 'block' : 'none';
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
  renderHighlightedCode(getElement('source'), lines, active);
}

function update() {
  updateInsertionStatistics({ values, key, index: i, cursor: j, phase });
  renderCode();
}

function advance() {
  elapsed = 0;
  if (phase === 'select') {
    if (i >= values.length) {
      playing = false;
      phase = 'done';
      completionPending = true;
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
  completionPending = false;
  completionAnimation.cancel();
  rebuild();
  update();
}

bindAnimationControls({
  onPlay: () => {
    if (phase === 'done') reset();
    playing = true;
  },
  onPause: () => { playing = false; },
  onReset: reset,
  onStep: () => { playing = false; advance(); },
  onApply: () => {
    const result = parseArrayInput(getElement('custom').value);
    const error = getElement('arrayError');
    error.textContent = result.error;
    if (!result.values) return;
    initial = result.values;
    reset();
  }
});

function resize() {
  resizeVisualization(stage, renderer, camera);
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
    if (elapsed > 900 / getAnimationSpeed()) advance();
  }
  items.forEach((item, index) => {
    if (!item) return;
    item.position.x += (item.userData.tx - item.position.x) * 0.13;
    item.position.y += (item.userData.ty - item.position.y) * 0.13;
    item.position.z += (item.userData.tz - item.position.z) * 0.13;
    item.material.emissive.setHex(item === key ? 0x552255 : 0x000000);
    item.material.emissiveIntensity = item === key ? 0.8 : 0;
  });
  if (completionPending && items.every((item) => item
    && Math.abs(item.position.x - item.userData.tx) < 0.002
    && Math.abs(item.position.y - item.userData.ty) < 0.002
    && Math.abs(item.position.z - item.userData.tz) < 0.002)) {
    items.forEach((item) => item.position.set(item.userData.tx, item.userData.ty, item.userData.tz));
    completionAnimation.start(items);
    completionPending = false;
  }
  completionAnimation.update(delta, getAnimationSpeed());
  const tag = getElement('keyTag');
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
