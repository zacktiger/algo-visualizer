/**
 * Centralised algorithm registry.
 *
 * Every algorithm generator and its metadata is imported here and
 * collected into a single array for the UI to enumerate.
 *
 * @module algorithms/index
 */

import type { AlgorithmMeta, Step } from "./types";

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

/** A single entry in the algorithm registry. */
export interface RegistryEntry {
  /** Static metadata for the algorithm. */
  meta: AlgorithmMeta;
  /** The generator function (signature varies per algorithm). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generator: (...args: never[]) => Generator<Step>;
}

/**
 * Complete list of every registered algorithm.
 *
 * The UI iterates this array to populate the algorithm picker and
 * to resolve a generator from a selected `AlgorithmMeta.id`.
 */
export const ALGORITHM_REGISTRY: RegistryEntry[] = [
  { meta: bubbleSortMeta, generator: bubbleSort as RegistryEntry["generator"] },
  { meta: quickSortMeta, generator: quickSort as RegistryEntry["generator"] },
  { meta: mergeSortMeta, generator: mergeSort as RegistryEntry["generator"] },
  { meta: binarySearchMeta, generator: binarySearch as RegistryEntry["generator"] },
  { meta: bfsMeta, generator: bfs as RegistryEntry["generator"] },
  { meta: dfsMeta, generator: dfs as RegistryEntry["generator"] },
  { meta: dijkstraMeta, generator: dijkstra as RegistryEntry["generator"] },
  { meta: lcsMeta, generator: lcs as RegistryEntry["generator"] },
  { meta: knapsackMeta, generator: knapsack as RegistryEntry["generator"] },
  { meta: lisMeta, generator: lis as RegistryEntry["generator"] },
];

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
