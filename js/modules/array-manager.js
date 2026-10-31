export function createFrame(order, state = {}) {
  return {
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
  };
}
