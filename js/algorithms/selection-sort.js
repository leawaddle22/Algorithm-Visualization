import { createFrame } from '../modules/array-manager.js';
import { startComparisonVisualizer } from '../modules/comparison-visualizer.js';

export const code = [
  'def selection_sort(a):',
  '    for i in range(len(a) - 1):',
  '        min_index = i',
  '        for j in range(i + 1, len(a)):',
  '            if a[j] < a[min_index]:',
  '                min_index = j',
  '        a[i], a[min_index] = a[min_index], a[i]'
];

export function buildFrames(bars) {
  const frames = [];
  const order = bars.slice();
  let comparisons = 0;
  let swaps = 0;
  const addFrame = (state) => frames.push(createFrame(order, state));

  addFrame({
    line: 3,
    phase: 'Select minimum',
    operation: `Start with ${order[0].userData.value} as the minimum`,
    currentIndex: 0,
    minimumIndex: 0
  });

  for (let destination = 0; destination < order.length - 1; destination += 1) {
    let minimumIndex = destination;
    if (destination > 0) {
      addFrame({
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
      addFrame({
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
        addFrame({
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
      addFrame({
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

    addFrame({
      line: 2,
      phase: 'Pass complete',
      operation: `${order[destination].userData.value} is in its final position`,
      currentIndex: destination + 1 < order.length - 1 ? destination + 1 : null,
      sortedCount: destination + 1,
      comparisons,
      swaps
    });
  }

  addFrame({
    line: 2,
    phase: 'Complete',
    operation: 'Array sorted',
    sortedCount: order.length,
    comparisons,
    swaps
  });

  return frames;
}

startComparisonVisualizer({ algorithm: 'selection', code, buildFrames });
