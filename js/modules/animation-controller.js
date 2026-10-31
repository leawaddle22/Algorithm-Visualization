import { getElement } from '../utils/dom.js';

export function getAnimationSpeed() {
  return Number(getElement('speed').value);
}

export function bindAnimationControls({ onPlay, onPause, onReset, onStep, onApply }) {
  getElement('play').addEventListener('click', onPlay);
  getElement('pause').addEventListener('click', onPause);
  getElement('reset').addEventListener('click', onReset);
  getElement('step').addEventListener('click', onStep);
  getElement('apply').addEventListener('click', onApply);
}
