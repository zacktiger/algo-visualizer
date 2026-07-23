/**
 * Merge Sort algorithm generator.
 *
 * Recursively splits the array into halves, then merges them back in
 * sorted order, yielding steps at every comparison and placement.
 *
 * @module algorithms/arrays/mergeSort
 */

import {
  type Step,
  type AlgorithmMeta,
  StepType,
  AlgorithmCategory,
} from "../types";

/**
 * Generator that yields one {@link Step} for every meaningful operation
 * during a merge-sort of `arr`.
 *
 * @param arr - The numeric array to sort (not mutated).
 * @yields A {@link Step} for every subarray mark, compare, set-cell, or done event.
 */
export function* mergeSort(arr: number[]): Generator<Step> {
  const a = [...arr];
  yield* mergeSortHelper(a, 0, a.length - 1, a.length);

  yield {
    type: StepType.DONE,
    payload: {},
    highlightedLines: [],
    description: "Sorted!",
  };
}

/**
 * Recursive helper that sorts `a[left..right]` in-place, yielding steps.
 *
 * @param n - Total array length, used to detect the final top-level merge.
 */
function* mergeSortHelper(
  a: number[],
  left: number,
  right: number,
  n: number,
): Generator<Step> {
  if (left >= right) return;

  const mid = Math.floor((left + right) / 2);

  yield* mergeSortHelper(a, left, mid, n);
  yield* mergeSortHelper(a, mid + 1, right, n);
  yield* merge(a, left, mid, right, n);
}

/**
 * Merge two sorted halves `a[left..mid]` and `a[mid+1..right]`.
 *
 * Only the final merge spanning the whole array (`[0..n-1]`) places elements
 * in their permanent sorted position, so we emit `sorted` marks there — the
 * array visibly locks in green as the last merge runs. Elements placed by
 * earlier sub-merges still move, so marking them sorted would be incorrect.
 */
function* merge(
  a: number[],
  left: number,
  mid: number,
  right: number,
  n: number,
): Generator<Step> {
  const finalMerge = left === 0 && right === n - 1;
  // Build indices array for the subarray mark
  const indices: number[] = [];
  for (let k = left; k <= right; k++) indices.push(k);

  yield {
    type: StepType.MARK,
    payload: { indices, state: "subarray" },
    highlightedLines: [4],
    description: `Merging subarray [${left}..${right}]`,
  };

  const leftPart = a.slice(left, mid + 1);
  const rightPart = a.slice(mid + 1, right + 1);

  let i = 0;
  let j = 0;
  let k = left;

  while (i < leftPart.length && j < rightPart.length) {
    yield {
      type: StepType.COMPARE,
      payload: {
        i: left + i,
        j: mid + 1 + j,
        valA: leftPart[i],
        valB: rightPart[j],
      },
      highlightedLines: [5],
      description: `Comparing ${leftPart[i]} (left) with ${rightPart[j]} (right)`,
    };

    if (leftPart[i] <= rightPart[j]) {
      a[k] = leftPart[i];
      yield {
        type: StepType.SET_CELL,
        payload: { index: k, value: leftPart[i] },
        highlightedLines: [6],
        description: `Placing ${leftPart[i]} at index ${k}`,
      };
      i++;
    } else {
      a[k] = rightPart[j];
      yield {
        type: StepType.SET_CELL,
        payload: { index: k, value: rightPart[j] },
        highlightedLines: [6],
        description: `Placing ${rightPart[j]} at index ${k}`,
      };
      j++;
    }
    if (finalMerge) yield* markSorted(k);
    k++;
  }

  while (i < leftPart.length) {
    a[k] = leftPart[i];
    yield {
      type: StepType.SET_CELL,
      payload: { index: k, value: leftPart[i] },
      highlightedLines: [7],
      description: `Placing ${leftPart[i]} at index ${k}`,
    };
    if (finalMerge) yield* markSorted(k);
    i++;
    k++;
  }

  while (j < rightPart.length) {
    a[k] = rightPart[j];
    yield {
      type: StepType.SET_CELL,
      payload: { index: k, value: rightPart[j] },
      highlightedLines: [7],
      description: `Placing ${rightPart[j]} at index ${k}`,
    };
    if (finalMerge) yield* markSorted(k);
    j++;
    k++;
  }
}

/** Emit a `sorted` mark so the final-position element locks in green. */
function* markSorted(index: number): Generator<Step> {
  yield {
    type: StepType.MARK,
    payload: { index, state: "sorted" },
    highlightedLines: [7],
    description: `Index ${index} is in its final sorted position`,
  };
}

/** Static metadata for Merge Sort. */
export const mergeSortMeta: AlgorithmMeta = {
  id: "merge-sort",
  name: "Merge Sort",
  category: AlgorithmCategory.ARRAY,
  timeComplexity: "O(n log n)",
  spaceComplexity: "O(n)",
  codeLines: [
    "function mergeSort(arr, l, r):",
    "  if l >= r: return",
    "  mid = (l + r) / 2",
    "  mergeSort(arr, l, mid)",
    "  mergeSort(arr, mid+1, r)",
    "  merge left[l..mid] and right[mid+1..r]:",
    "    pick smaller of left[i], right[j]",
    "    copy remaining elements",
  ],
};
