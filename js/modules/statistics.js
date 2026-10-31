import { formatArray } from '../utils/helpers.js';
import { getElement } from '../utils/dom.js';

export function updateComparisonStatistics(frame, algorithm) {
  getElement('length').textContent = String(frame.order.length);
  getElement('arrayText').textContent = formatArray(frame.order.map((bar) => bar.userData.value));
  getElement('operationStat').textContent = frame.operation;
  getElement('comparisonStat').textContent = `Comparisons: ${frame.comparisons}`;
  getElement('swapStat').textContent = `Swaps: ${frame.swaps}`;
  getElement('phaseText').textContent = frame.phase;

  if (algorithm === 'bubble') {
    getElement('passStat').textContent = `Pass: ${frame.pass ?? '—'}`;
    getElement('indicesStat').textContent = frame.comparisonIndices
      ? `Indices: ${frame.comparisonIndices[0] + 1}, ${frame.comparisonIndices[1] + 1}`
      : 'Indices: —';
    return;
  }

  getElement('minimumStat').textContent = frame.minimumIndex === null
    ? 'Minimum: —'
    : `Minimum: ${frame.order[frame.minimumIndex].userData.value} (index ${frame.minimumIndex + 1})`;
  getElement('destinationStat').textContent = frame.currentIndex === null
    ? 'Destination: —'
    : `Destination: ${frame.currentIndex + 1}`;
}

export function updateInsertionStatistics({ values, key, index, cursor, phase }) {
  const displayedValues = values.filter((value) => value !== null);
  if (key) displayedValues.splice(cursor + 1, 0, key.userData.value);
  const arrayText = formatArray(displayedValues);
  getElement('arrayText').textContent = arrayText;
  getElement('arrayStat').textContent = `a = ${arrayText}`;
  getElement('length').textContent = String(values.length);
  getElement('iStat').textContent = `i = ${Math.min(index, values.length)}`;
  getElement('jStat').textContent = `j = ${key ? cursor : '—'}`;
  getElement('keyStat').textContent = `key = ${key ? key.userData.value : '—'}`;
  getElement('phaseText').textContent = phase[0].toUpperCase() + phase.slice(1);
}
