/**
 * Longest Increasing Subsequence (LIS) algorithm generator.
 *
 * Computes the length of the LIS using an O(n²) DP approach, then
 * traces back to identify the actual subsequence indices.
 *
 * @module algorithms/dp/lis
 */

import {
  type Step,
  type AlgorithmMeta,
  StepType,
  AlgorithmCategory,
} from "../types";

/**
 * Generator that yields one {@link Step} for every meaningful operation
 * during the LIS computation.
 *
 * @param arr - The numeric array to analyse (not mutated).
 * @yields A {@link Step} for every SET_CELL, MARK, or DONE event.
 */
export function* lis(arr: number[]): Generator<Step> {
  const a = [...arr];
  const n = a.length;

  if (n === 0) {
    yield {
      type: StepType.DONE,
      payload: { lisLength: 0 },
      highlightedLines: [],
      description: "Empty array — LIS length is 0.",
    };
    return;
  }

  // dp[i] = length of LIS ending at index i
  const dp: number[] = new Array<number>(n).fill(1);

  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (a[j] < a[i] && dp[j] + 1 > dp[i]) {
        dp[i] = dp[j] + 1;
      }
    }

    yield {
      type: StepType.SET_CELL,
      payload: { index: i, value: dp[i] },
      highlightedLines: [4],
      description: `lis[${i}] = ${dp[i]}`,
    };
  }

  // Find the maximum LIS length
  let maxLen = 0;
  for (const v of dp) {
    if (v > maxLen) maxLen = v;
  }

  // Traceback: collect one set of indices that form an LIS of length maxLen
  const resultIndices: number[] = [];
  let remaining = maxLen;
  for (let i = n - 1; i >= 0 && remaining > 0; i--) {
    if (dp[i] === remaining) {
      resultIndices.push(i);
      remaining--;
    }
  }
  resultIndices.reverse();

  yield {
    type: StepType.MARK,
    payload: { indices: resultIndices, state: "result" },
    highlightedLines: [6],
    description: `LIS indices: [${resultIndices.join(", ")}] — values: [${resultIndices.map((i) => a[i]).join(", ")}]`,
  };

  yield {
    type: StepType.DONE,
    payload: { lisLength: maxLen },
    highlightedLines: [],
    description: `LIS complete! Length = ${maxLen}`,
  };
}

/** Static metadata for LIS. */
export const lisMeta: AlgorithmMeta = {
  id: "lis",
  name: "Longest Increasing Subsequence",
  category: AlgorithmCategory.DP,
  timeComplexity: "O(n²)",
  spaceComplexity: "O(n)",
  codeLines: [
    "function lis(arr):",
    "  dp = array of 1s (length n)",
    "  for i in 1..n-1:",
    "    for j in 0..i-1:",
    "      if arr[j] < arr[i]: dp[i] = max(dp[i], dp[j]+1)",
    "  maxLen = max(dp)",
    "  traceback to find subsequence",
  ],
};
