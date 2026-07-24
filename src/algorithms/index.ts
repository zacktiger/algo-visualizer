/**
 * Centralised algorithm registry.
 *
 * Each entry pairs an algorithm's metadata with a `run(input)` adapter that
 * turns the user's {@link InputData} into a step list (applying sensible
 * fallbacks). This is the single extension point: adding an algorithm means
 * adding one entry here — no separate dispatch switch to keep in sync.
 *
 * @module algorithms/index
 */

import type { AlgorithmMeta, InputData, Step } from "./types";

import { bubbleSort, bubbleSortMeta } from "./arrays/bubbleSort";
import { quickSort, quickSortMeta } from "./arrays/quickSort";
import { mergeSort, mergeSortMeta } from "./arrays/mergeSort";
import { binarySearch, binarySearchMeta } from "./arrays/binarySearch";
import { bfs, bfsMeta } from "./graphs/bfs";
import { dfs, dfsMeta } from "./graphs/dfs";
import { dijkstra, dijkstraMeta } from "./graphs/dijkstra";
import { lcs, lcsMeta } from "./dp/lcs";
import { knapsack, knapsackMeta } from "./dp/knapsack";
import { lis, lisMeta } from "./dp/lis";

/** Collect every step from a generator into an array. */
function collect(gen: Generator<Step>): Step[] {
  const steps: Step[] = [];
  for (const step of gen) steps.push(step);
  return steps;
}

/** A single entry in the algorithm registry. */
export interface RegistryEntry {
  /** Static metadata for the algorithm. */
  meta: AlgorithmMeta;
  /**
   * Turn a user input into the algorithm's step list. Returns `[]` when the
   * input kind doesn't match the algorithm.
   */
  run: (input: InputData) => Step[];
}

/** Node-id list + edges from a graph input (start node resolved elsewhere). */
function graphArgs(input: Extract<InputData, { kind: "graph" }>) {
  return {
    ids: input.nodes.map((n) => n.id),
    edges: input.edges,
    start: input.startNode ?? input.nodes[0]?.id ?? "1",
  };
}

/**
 * Complete list of every registered algorithm.
 *
 * The UI iterates this array to populate the algorithm picker and to resolve
 * a step list from a selected `AlgorithmMeta.id` via {@link RegistryEntry.run}.
 */
export const ALGORITHM_REGISTRY: RegistryEntry[] = [
  {
    meta: bubbleSortMeta,
    run: (input) => (input.kind === "array" ? collect(bubbleSort(input.values)) : []),
  },
  {
    meta: quickSortMeta,
    run: (input) => (input.kind === "array" ? collect(quickSort(input.values)) : []),
  },
  {
    meta: mergeSortMeta,
    run: (input) => (input.kind === "array" ? collect(mergeSort(input.values)) : []),
  },
  {
    meta: binarySearchMeta,
    run: (input) => {
      if (input.kind !== "array") return [];
      const sorted = [...input.values].sort((a, b) => a - b);
      // Default target: the median element (guarantees a successful search)
      // unless the caller specified one.
      const target =
        input.target ?? sorted[Math.floor(sorted.length / 2)];
      return collect(binarySearch(sorted, target));
    },
  },
  {
    meta: bfsMeta,
    run: (input) => {
      if (input.kind !== "graph") return [];
      const { ids, edges, start } = graphArgs(input);
      return collect(bfs(ids, edges, start));
    },
  },
  {
    meta: dfsMeta,
    run: (input) => {
      if (input.kind !== "graph") return [];
      const { ids, edges, start } = graphArgs(input);
      return collect(dfs(ids, edges, start));
    },
  },
  {
    meta: dijkstraMeta,
    run: (input) => {
      if (input.kind !== "graph") return [];
      const { ids, edges, start } = graphArgs(input);
      return collect(dijkstra(ids, edges, start));
    },
  },
  {
    meta: lcsMeta,
    run: (input) => {
      if (input.kind !== "dp") return [];
      const a = (input.params.a as string) ?? "ABCBDAB";
      const b = (input.params.b as string) ?? "BDCAB";
      return collect(lcs(a, b));
    },
  },
  {
    meta: knapsackMeta,
    run: (input) => {
      if (input.kind !== "dp") return [];
      const weights = (input.params.weights as number[]) ?? [2, 3, 4, 5];
      const values = (input.params.values as number[]) ?? [3, 4, 5, 6];
      const capacity = (input.params.capacity as number) ?? 8;
      return collect(knapsack(weights, values, capacity));
    },
  },
  {
    meta: lisMeta,
    run: (input) => {
      if (input.kind !== "dp") return [];
      const vals =
        (input.params.values as number[]) ??
        [10, 22, 9, 33, 21, 50, 41, 60, 80];
      return collect(lis(vals));
    },
  },
];

/** Look up a registry entry by algorithm id. */
export function getEntry(id: string): RegistryEntry | undefined {
  return ALGORITHM_REGISTRY.find((e) => e.meta.id === id);
}

// Re-export generators for direct import
export {
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
};
