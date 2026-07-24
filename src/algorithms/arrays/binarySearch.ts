/**
 * Binary Search algorithm generator.
 *
 * Searches for a target value in a **sorted** numeric array by repeatedly
 * halving the search range.
 *
 * @module algorithms/arrays/binarySearch
 */

import {
  type Step,
  type AlgorithmMeta,
  StepType,
  AlgorithmCategory,
} from "../types";

/**
 * Generator that yields one {@link Step} for every meaningful operation
 * during a binary search of `arr` for `target`.
 *
 * @param arr    - A sorted numeric array (not mutated).
 * @param target - The value to search for.
 * @yields A {@link Step} for every range mark, comparison, or done event.
 */
export function* binarySearch(
  arr: number[],
  target: number,
): Generator<Step> {
  const a = [...arr];
  let low = 0;
  let high = a.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    yield {
      type: StepType.MARK,
      payload: { low, high, mid },
      highlightedLines: [2],
      description: `Search range [${low}..${high}], mid=${mid}`,
    };

    const cmp = a[mid] === target ? "==" : a[mid] < target ? "<" : ">";
    const outcome =
      a[mid] === target
        ? "match!"
        : a[mid] < target
          ? "too small → search right half"
          : "too big → search left half";
    yield {
      type: StepType.COMPARE,
      payload: { mid, target, valMid: a[mid], result: outcome },
      highlightedLines: [3],
      description: `arr[${mid}] = ${a[mid]} ${cmp} target ${target} → ${outcome}`,
    };

    if (a[mid] === target) {
      yield {
        type: StepType.MARK,
        payload: { index: mid, state: "found" },
        highlightedLines: [4],
        description: `Target ${target} found at index ${mid}`,
      };

      yield {
        type: StepType.DONE,
        payload: { index: mid },
        highlightedLines: [],
        description: `Found ${target} at index ${mid}!`,
      };
      return;
    } else if (a[mid] < target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  yield {
    type: StepType.MARK,
    payload: { index: -1, state: "notfound" },
    highlightedLines: [7],
    description: `Target ${target} not found in the array`,
  };

  yield {
    type: StepType.DONE,
    payload: { index: -1 },
    highlightedLines: [],
    description: `${target} is not in the array.`,
  };
}

/** Static metadata for Binary Search. */
export const binarySearchMeta: AlgorithmMeta = {
  id: "binary-search",
  name: "Binary Search",
  category: AlgorithmCategory.ARRAY,
  timeComplexity: "O(log n)",
  spaceComplexity: "O(1)",
  codeLines: [
    "function binarySearch(arr, target):",
    "  while low <= high:",
    "    mid = (low + high) / 2",
    "    if arr[mid] == target: return mid",
    "    elif arr[mid] < target: low = mid + 1",
    "    else: high = mid - 1",
    "  return -1",
  ],
  idea: "Repeatedly halve a sorted array: compare the middle element to the target and throw away the half that can't contain it.",
  invariant: "The target, if it exists, is always inside the current [lo, hi] window — which shrinks by half every step.",
};
