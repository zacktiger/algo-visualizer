/**
 * Bubble Sort algorithm generator.
 *
 * Repeatedly walks the array, swapping adjacent elements that are out of
 * order, until the entire array is sorted.
 *
 * @module algorithms/arrays/bubbleSort
 */

import {
  type Step,
  type AlgorithmMeta,
  StepType,
  AlgorithmCategory,
} from "../types";

/**
 * Generator that yields one {@link Step} for every meaningful operation
 * during a bubble-sort pass over `arr`.
 *
 * @param arr - The numeric array to sort (not mutated).
 * @yields A {@link Step} for every compare, swap, mark, or done event.
 */
export function* bubbleSort(arr: number[]): Generator<Step> {
  const a = [...arr];
  const n = a.length;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      // ── Compare ──
      yield {
        type: StepType.COMPARE,
        payload: { i: j, j: j + 1, valA: a[j], valB: a[j + 1] },
        highlightedLines: [3],
        description: `Comparing index ${j} (${a[j]}) with index ${j + 1} (${a[j + 1]})`,
      };

      if (a[j] > a[j + 1]) {
        // ── Swap ──
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        yield {
          type: StepType.SWAP,
          payload: { i: j, j: j + 1 },
          highlightedLines: [4],
          description: `Swapping index ${j} and ${j + 1}`,
        };
      }
    }

    // ── Mark last unsorted position as sorted ──
    yield {
      type: StepType.MARK,
      payload: { index: n - i - 1, state: "sorted" },
      highlightedLines: [1],
      description: `Index ${n - i - 1} is sorted`,
    };
  }

  yield {
    type: StepType.DONE,
    payload: {},
    highlightedLines: [],
    description: "Sorted!",
  };
}

/** Static metadata for Bubble Sort. */
export const bubbleSortMeta: AlgorithmMeta = {
  id: "bubble-sort",
  name: "Bubble Sort",
  category: AlgorithmCategory.ARRAY,
  timeComplexity: "O(n²)",
  spaceComplexity: "O(1)",
  codeLines: [
    "for i in range(n):",
    "  for j in range(n-i-1):",
    "    if arr[j] > arr[j+1]:",
    "      swap(arr[j], arr[j+1])",
  ],
};
