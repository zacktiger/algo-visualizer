/**
 * Utility helpers for running algorithm generators and building
 * intermediate visualisation state (e.g. DP tables).
 *
 * @module utils/runAlgorithm
 */

import type { InputData, Step } from "../algorithms/types";
import { StepType } from "../algorithms/types";
import {
  bubbleSort,
  quickSort,
  mergeSort,
  binarySearch,
  bfs,
  dfs,
  dijkstra,
  lcs,
  knapsack,
  lis,
} from "../algorithms";

/**
 * Collect every step from a generator into an array.
 */
export function collectSteps(gen: Generator<Step>): Step[] {
  const steps: Step[] = [];
  for (const step of gen) steps.push(step);
  return steps;
}

/**
 * Dispatch the correct generator for a given `algorithmId` + `input`.
 *
 * Returns the fully-collected step array.
 */
export function runGenerator(algorithmId: string, input: InputData): Step[] {
  switch (algorithmId) {
    case "bubble-sort":
      if (input.kind !== "array") return [];
      return collectSteps(bubbleSort(input.values));
    case "quick-sort":
      if (input.kind !== "array") return [];
      return collectSteps(quickSort(input.values));
    case "merge-sort":
      if (input.kind !== "array") return [];
      return collectSteps(mergeSort(input.values));
    case "binary-search": {
      if (input.kind !== "array") return [];
      const sorted = [...input.values].sort((a, b) => a - b);
      const target = sorted[Math.floor(sorted.length / 2)];
      return collectSteps(binarySearch(sorted, target));
    }
    case "bfs":
      if (input.kind !== "graph") return [];
      return collectSteps(
        bfs(
          input.nodes.map((n) => n.id),
          input.edges,
          input.nodes[0]?.id ?? "1",
        ),
      );
    case "dfs":
      if (input.kind !== "graph") return [];
      return collectSteps(
        dfs(
          input.nodes.map((n) => n.id),
          input.edges,
          input.nodes[0]?.id ?? "1",
        ),
      );
    case "dijkstra":
      if (input.kind !== "graph") return [];
      return collectSteps(
        dijkstra(
          input.nodes.map((n) => n.id),
          input.edges,
          input.nodes[0]?.id ?? "1",
        ),
      );
    case "lcs": {
      if (input.kind !== "dp") return [];
      const a = (input.params.a as string) ?? "ABCBDAB";
      const b = (input.params.b as string) ?? "BDCAB";
      return collectSteps(lcs(a, b));
    }
    case "knapsack": {
      if (input.kind !== "dp") return [];
      const weights = (input.params.weights as number[]) ?? [2, 3, 4, 5];
      const values = (input.params.values as number[]) ?? [3, 4, 5, 6];
      const capacity = (input.params.capacity as number) ?? 8;
      return collectSteps(knapsack(weights, values, capacity));
    }
    case "lis": {
      if (input.kind !== "dp") return [];
      const vals = (input.params.values as number[]) ?? [10, 22, 9, 33, 21, 50, 41, 60, 80];
      return collectSteps(lis(vals));
    }
    default:
      return [];
  }
}

/**
 * Reconstruct a DP table by replaying SET_CELL steps up to `upToStep`.
 *
 * Works for both 2-D tables (row, col) and 1-D arrays (index).
 */
export function buildDpTable(steps: Step[], upToStep: number): number[][] {
  let maxRow = 0;
  let maxCol = 0;
  let is1D = true;

  // First pass: determine dimensions
  const bound = Math.min(upToStep, steps.length - 1);
  for (let i = 0; i <= bound; i++) {
    const s = steps[i];
    if (s.type !== StepType.SET_CELL) continue;
    if (s.payload.row !== undefined && s.payload.col !== undefined) {
      is1D = false;
      maxRow = Math.max(maxRow, s.payload.row as number);
      maxCol = Math.max(maxCol, s.payload.col as number);
    } else if (s.payload.index !== undefined) {
      maxCol = Math.max(maxCol, s.payload.index as number);
    }
  }

  if (is1D) {
    const row = new Array<number>(maxCol + 1).fill(0);
    for (let i = 0; i <= bound; i++) {
      const s = steps[i];
      if (s.type === StepType.SET_CELL && s.payload.index !== undefined) {
        row[s.payload.index as number] = s.payload.value as number;
      }
    }
    return [row];
  }

  const table: number[][] = Array.from({ length: maxRow + 1 }, () =>
    new Array<number>(maxCol + 1).fill(0),
  );
  for (let i = 0; i <= bound; i++) {
    const s = steps[i];
    if (s.type === StepType.SET_CELL && s.payload.row !== undefined) {
      table[s.payload.row as number][s.payload.col as number] =
        s.payload.value as number;
    }
  }
  return table;
}
