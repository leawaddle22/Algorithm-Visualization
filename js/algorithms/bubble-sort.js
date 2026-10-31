import { createFrame } from '../modules/array-manager.js';
import { startComparisonVisualizer } from '../modules/comparison-visualizer.js';

export const code = [
  'def bubble_sort(a):',
  '    n = len(a)',
  '    for i in range(1, n):',
  '        for j in range(0, n - i):',
  '            if a[j] > a[j + 1]:',
  '                a[j], a[j + 1] = a[j + 1], a[j]'
];

export function buildFrames(bars) {
  const frames = [];
  const order = bars.slice();
  let comparisons = 0;
  let swaps = 0;
  const addFrame = (state) => frames.push(createFrame(order, state));

  addFrame({ pass: 1 });

  for (let pass = 1; pass < order.length; pass += 1) {
    addFrame({
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
      addFrame({
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
        addFrame({
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

    addFrame({
      line: 3,
      phase: 'Pass complete',
      operation: `${order[order.length - pass].userData.value} is in its final position`,
      pass,
      sortedFrom: order.length - pass,
      comparisons,
      swaps
    });
  }

  addFrame({
    line: 3,
    phase: 'Complete',
    operation: 'Array sorted',
    pass: order.length - 1,
    sortedFrom: 0,
    comparisons,
    swaps
  });

  return frames;
}

startComparisonVisualizer({ algorithm: 'bubble', code, buildFrames });
