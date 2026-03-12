/**
 * Quick Sort algorithm generator (Lomuto partition scheme).
 *
 * Picks the last element as pivot, partitions the sub-array, then
 * recursively sorts both halves.
 *
 * @module algorithms/arrays/quickSort
 */

import {
  type Step,
  type AlgorithmMeta,
  StepType,
  AlgorithmCategory,
} from "../types";

/**
 * Generator that yields one {@link Step} for every meaningful operation
 * during a quick-sort of `arr`.
 *
 * @param arr - The numeric array to sort (not mutated).
 * @yields A {@link Step} for every pivot selection, compare, swap, mark, or done event.
 */
export function* quickSort(arr: number[]): Generator<Step> {
  const a = [...arr];
  yield* quickSortHelper(a, 0, a.length - 1);

  yield {
    type: StepType.DONE,
    payload: {},
    highlightedLines: [],
    description: "Sorted!",
  };
}

/**
 * Recursive helper that sorts `a[low..high]` in-place, yielding steps.
 */
function* quickSortHelper(
  a: number[],
  low: number,
  high: number,
): Generator<Step> {
  if (low >= high) {
    if (low === high) {
      yield {
        type: StepType.MARK,
        payload: { index: low, state: "sorted" },
        highlightedLines: [1],
        description: `Index ${low} is sorted (single element)`,
      };
    }
    return;
  }

  const pivotIndex: number = yield* partition(a, low, high);

  yield {
    type: StepType.MARK,
    payload: { index: pivotIndex, state: "sorted" },
    highlightedLines: [6],
    description: `Index ${pivotIndex} is in its final sorted position`,
  };

  yield* quickSortHelper(a, low, pivotIndex - 1);
  yield* quickSortHelper(a, pivotIndex + 1, high);
}

/**
 * Lomuto partition around `a[high]`. Returns the final pivot index.
 */
function* partition(
  a: number[],
  low: number,
  high: number,
): Generator<Step, number> {
  const pivot = a[high];

  yield {
    type: StepType.MARK,
    payload: { index: high, state: "pivot" },
    highlightedLines: [2],
    description: `Pivot selected at index ${high} (${pivot})`,
  };

  let i = low - 1;

  for (let j = low; j < high; j++) {
    yield {
      type: StepType.COMPARE,
      payload: { i: j, j: high, valA: a[j], valB: pivot },
      highlightedLines: [4],
      description: `Comparing index ${j} (${a[j]}) with pivot (${pivot})`,
    };

    if (a[j] <= pivot) {
      i++;
      if (i !== j) {
        [a[i], a[j]] = [a[j], a[i]];
        yield {
          type: StepType.SWAP,
          payload: { i, j },
          highlightedLines: [5],
          description: `Swapping index ${i} and ${j}`,
        };
      }
    }
  }

  // Place pivot in its correct position
  i++;
  if (i !== high) {
    [a[i], a[high]] = [a[high], a[i]];
    yield {
      type: StepType.SWAP,
      payload: { i, j: high },
      highlightedLines: [6],
      description: `Swapping pivot into position ${i}`,
    };
  }

  return i;
}

/** Static metadata for Quick Sort. */
export const quickSortMeta: AlgorithmMeta = {
  id: "quick-sort",
  name: "Quick Sort",
  category: AlgorithmCategory.ARRAY,
  timeComplexity: "O(n log n)",
  spaceComplexity: "O(log n)",
  codeLines: [
    "function quickSort(arr, low, high):",
    "  if low < high:",
    "    pivot = arr[high]",
    "    i = low - 1",
    "    for j in range(low, high):",
    "      if arr[j] <= pivot: swap(arr[++i], arr[j])",
    "    swap(arr[i+1], arr[high])",
    "    quickSort(arr, low, pi-1)",
    "    quickSort(arr, pi+1, high)",
  ],
};
