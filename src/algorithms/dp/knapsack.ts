/**
 * 0/1 Knapsack algorithm generator.
 *
 * Computes the maximum value achievable with a given weight capacity,
 * using a 2-D DP table.
 *
 * @module algorithms/dp/knapsack
 */

import {
  type Step,
  type AlgorithmMeta,
  StepType,
  AlgorithmCategory,
} from "../types";

/**
 * Generator that yields one {@link Step} for every cell filled in the
 * knapsack DP table.
 *
 * @param weights  - Array of item weights.
 * @param values   - Array of item values (same length as `weights`).
 * @param capacity - Maximum weight capacity of the knapsack.
 * @yields A {@link Step} for every SET_CELL or DONE event.
 */
export function* knapsack(
  weights: number[],
  values: number[],
  capacity: number,
): Generator<Step> {
  const n = weights.length;

  // dp[i][w] = best value considering items 0..i-1 with capacity w
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array.from({ length: capacity + 1 }, () => 0),
  );

  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= capacity; w++) {
      if (weights[i - 1] <= w) {
        dp[i][w] = Math.max(
          dp[i - 1][w],
          dp[i - 1][w - weights[i - 1]] + values[i - 1],
        );
      } else {
        dp[i][w] = dp[i - 1][w];
      }

      yield {
        type: StepType.SET_CELL,
        payload: { row: i, col: w, value: dp[i][w] },
        highlightedLines: [4],
        description: `dp[${i}][${w}] = ${dp[i][w]}`,
      };
    }
  }

  yield {
    type: StepType.DONE,
    payload: { maxValue: dp[n][capacity] },
    highlightedLines: [],
    description: `Knapsack complete! Max value = ${dp[n][capacity]}`,
  };
}

/** Static metadata for 0/1 Knapsack. */
export const knapsackMeta: AlgorithmMeta = {
  id: "knapsack",
  name: "0/1 Knapsack",
  category: AlgorithmCategory.DP,
  timeComplexity: "O(n × W)",
  spaceComplexity: "O(n × W)",
  codeLines: [
    "function knapsack(weights, values, W):",
    "  dp = (n+1)×(W+1) table of 0s",
    "  for i in 1..n:",
    "    for w in 0..W:",
    "      if weights[i-1] <= w:",
    "        dp[i][w] = max(dp[i-1][w],",
    "                       dp[i-1][w-weights[i-1]] + values[i-1])",
    "      else: dp[i][w] = dp[i-1][w]",
    "  return dp[n][W]",
  ],
};
