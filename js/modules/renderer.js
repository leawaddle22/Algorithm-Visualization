import * as THREE from 'three';
import { BAR_COLORS } from '../utils/constants.js';

export function createVisualization(stage, { pixelRatio = 2, shadowType = THREE.PCFShadowMap } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x211827);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 3.4, 12);
  camera.lookAt(0, 1.35, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatio));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = shadowType;
  stage.appendChild(renderer.domElement);
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

  return { scene, camera, renderer };
}

export function createValueTexture(value, style, renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = style === 'insertion' ? 512 : 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create the value-label canvas context.');

  if (style === 'insertion') {
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

  const text = String(value);
  const fontSize = Math.max(54, Math.min(150, 1000 / text.length));
  context.fillStyle = '#ffffff';
  context.font = `bold ${fontSize}px Arial`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 256, 132, 480);
  return new THREE.CanvasTexture(canvas);
}

export function createComparisonBars(scene, values) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spacing = Math.min(0.9, 9.6 / values.length);
  const width = Math.min(0.72, spacing * 0.76);

  return values.map((value, index) => {
    const height = maximum === minimum ? 1.8 : 0.65 + ((value - minimum) / (maximum - minimum)) * 2.95;
    const material = new THREE.MeshStandardMaterial({
      color: BAR_COLORS[index % BAR_COLORS.length],
      roughness: 0.4,
      metalness: 0.08
    });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(width, height, 1.35), material);
    bar.castShadow = true;
    bar.position.set((index - (values.length - 1) / 2) * spacing, height / 2 + 0.1, 0);
    bar.userData = { value, height, id: index };

    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.82, Math.min(0.7, height * 0.5)),
      new THREE.MeshBasicMaterial({ map: createValueTexture(value, 'comparison'), transparent: true })
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

export function getBarX(index, count) {
  return (index - (count - 1) / 2) * Math.min(0.9, 9.6 / count);
}

export function resizeVisualization(stage, renderer, camera, fitWidth = false) {
  if (!stage.clientWidth || !stage.clientHeight) return false;
  renderer.setSize(stage.clientWidth, stage.clientHeight, false);
  camera.aspect = stage.clientWidth / stage.clientHeight;

  if (fitWidth) {
    camera.position.z = Math.max(
      12,
      10.4 / (2 * Math.tan(THREE.MathUtils.degToRad(34 / 2)) * camera.aspect)
    );
    camera.lookAt(0, 1.35, 0);
  }

  camera.updateProjectionMatrix();
  return true;
}

export function disposeBars(scene, bars) {
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
