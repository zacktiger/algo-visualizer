/**
 * Longest Common Subsequence (LCS) algorithm generator.
 *
 * Computes the LCS of two strings using a 2-D DP table, then traces
 * back through the table to identify the subsequence.
 *
 * @module algorithms/dp/lcs
 */

import {
  type Step,
  type AlgorithmMeta,
  StepType,
  AlgorithmCategory,
} from "../types";

/**
 * Generator that yields one {@link Step} for every meaningful operation
 * during LCS computation.
 *
 * @param a - First string.
 * @param b - Second string.
 * @yields A {@link Step} for every cell fill, traceback mark, or done event.
 */
export function* lcs(a: string, b: string): Generator<Step> {
  const m = a.length;
  const n = b.length;

  // Build DP table (m+1) × (n+1), initialised to 0
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0),
  );

  // ── Fill the DP table ──
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      let from: string;

      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        from = "diagonal";
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        dp[i][j] = dp[i - 1][j];
        from = "top";
      } else {
        dp[i][j] = dp[i][j - 1];
        from = "left";
      }

      yield {
        type: StepType.SET_CELL,
        payload: { row: i, col: j, value: dp[i][j], from },
        highlightedLines: [4],
        description: `dp[${i}][${j}] = ${dp[i][j]} (from ${from})`,
      };
    }
  }

  // ── Traceback ──
  const tracebackCells: Array<{ row: number; col: number }> = [];
  let ti = m;
  let tj = n;

  while (ti > 0 && tj > 0) {
    if (a[ti - 1] === b[tj - 1]) {
      tracebackCells.push({ row: ti, col: tj });
      ti--;
      tj--;
    } else if (dp[ti - 1][tj] >= dp[ti][tj - 1]) {
      ti--;
    } else {
      tj--;
    }
  }

  tracebackCells.reverse();

  yield {
    type: StepType.MARK,
    payload: { cells: tracebackCells, state: "traceback" },
    highlightedLines: [7],
    description: `Traceback: LCS length = ${dp[m][n]}`,
  };

  yield {
    type: StepType.DONE,
    payload: { lcsLength: dp[m][n] },
    highlightedLines: [],
    description: `LCS complete! Length = ${dp[m][n]}`,
  };
}

/** Static metadata for LCS. */
export const lcsMeta: AlgorithmMeta = {
  id: "lcs",
  name: "Longest Common Subsequence",
  category: AlgorithmCategory.DP,
  timeComplexity: "O(m × n)",
  spaceComplexity: "O(m × n)",
  codeLines: [
    "function lcs(a, b):",
    "  dp = (m+1)×(n+1) table of 0s",
    "  for i in 1..m:",
    "    for j in 1..n:",
    "      if a[i-1] == b[j-1]: dp[i][j] = dp[i-1][j-1]+1",
    "      else: dp[i][j] = max(dp[i-1][j], dp[i][j-1])",
    "  return dp[m][n]",
    "  traceback to find subsequence",
  ],
};
