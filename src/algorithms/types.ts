/**
 * Core type definitions for the Competitive Programming Algorithm Visualizer.
 *
 * This module defines every shared type used across the engine, store, and
 * (in later prompts) the UI layer. It has zero runtime dependencies.
 *
 * @module algorithms/types
 */

/* ═══════════════════════════════════════════════════════════════════════════
 * Step types
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Discriminator for each atomic operation an algorithm can perform.
 *
 * | Value      | Typical use-case                        |
 * |------------|-----------------------------------------|
 * | COMPARE    | Comparing two elements                  |
 * | SWAP       | Swapping two elements in an array       |
 * | VISIT      | Visiting a graph node / array cell      |
 * | RELAX      | Relaxing an edge (shortest-path algos)  |
 * | SET_CELL   | Writing to a DP table cell              |
 * | PUSH       | Pushing onto a stack / queue             |
 * | POP        | Popping from a stack / queue             |
 * | MARK       | Marking an element as processed         |
 * | DONE       | Algorithm has finished                  |
 */
export const StepType = {
  COMPARE: "COMPARE",
  SWAP: "SWAP",
  VISIT: "VISIT",
  RELAX: "RELAX",
  SET_CELL: "SET_CELL",
  PUSH: "PUSH",
  POP: "POP",
  MARK: "MARK",
  DONE: "DONE",
} as const;

/** Union of all possible step-type string literals. */
export type StepType = (typeof StepType)[keyof typeof StepType];

/**
 * A single discrete step produced by an algorithm generator.
 *
 * Each step captures *what* happened, *which* source-code lines are
 * highlighted, and a human-readable description for the UI.
 */
export interface Step {
  /** The kind of operation performed in this step. */
  readonly type: StepType;

  /**
   * Arbitrary data attached to the step.
   *
   * The shape depends on `type` — e.g. a `SWAP` step might carry
   * `{ i: 2, j: 5 }` while a `RELAX` step carries `{ from, to, newDist }`.
   *
   * Consumers should narrow via `type` before accessing specific keys.
   */
  readonly payload: Record<string, unknown>;

  /** 1-based line numbers of the algorithm source to highlight. */
  readonly highlightedLines: number[];

  /** Human-readable explanation of this step (shown in the UI). */
  readonly description: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Algorithm metadata
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * High-level category used to group algorithms in the sidebar / picker.
 */
export const AlgorithmCategory = {
  ARRAY: "ARRAY",
  GRAPH: "GRAPH",
  DP: "DP",
} as const;

/** Union of all possible algorithm-category string literals. */
export type AlgorithmCategory =
  (typeof AlgorithmCategory)[keyof typeof AlgorithmCategory];

/**
 * Static metadata that describes a registered algorithm.
 *
 * This is what the algorithm picker displays and what the code panel uses
 * for syntax-highlighted source lines.
 */
export interface AlgorithmMeta {
  /** Unique machine-readable identifier (e.g. `"bubble-sort"`). */
  readonly id: string;

  /** Display name shown in the UI (e.g. `"Bubble Sort"`). */
  readonly name: string;

  /** Which category this algorithm belongs to. */
  readonly category: AlgorithmCategory;

  /** Big-O time complexity string (e.g. `"O(n²)"`). */
  readonly timeComplexity: string;

  /** Big-O space complexity string (e.g. `"O(1)"`). */
  readonly spaceComplexity: string;

  /**
   * Source code of the algorithm, split into lines.
   *
   * Line indices here correspond to the `highlightedLines` values in
   * each {@link Step}.
   */
  readonly codeLines: string[];
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Graph primitives
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * A node in a graph visualisation.
 */
export interface Node {
  /** Unique identifier for this node. */
  readonly id: string;

  /** Human-readable label rendered inside the node circle. */
  readonly label: string;

  /** X-coordinate (in logical / SVG space). */
  readonly x: number;

  /** Y-coordinate (in logical / SVG space). */
  readonly y: number;
}

/**
 * A directed (or undirected) edge between two {@link Node}s.
 */
export interface Edge {
  /** ID of the source node. */
  readonly from: string;

  /** ID of the target node. */
  readonly to: string;

  /** Optional numeric weight (used by shortest-path / MST algorithms). */
  readonly weight?: number;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Input data — discriminated union
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Input for array-based algorithms (sorting, searching, etc.).
 */
export interface ArrayInput {
  readonly kind: "array";

  /** The numeric values to operate on. */
  readonly values: number[];
}

/**
 * Input for graph-based algorithms (BFS, DFS, Dijkstra, etc.).
 */
export interface GraphInput {
  readonly kind: "graph";

  /** Nodes of the graph. */
  readonly nodes: Node[];

  /** Edges of the graph. */
  readonly edges: Edge[];
}

/**
 * Input for dynamic-programming algorithms.
 */
export interface DpInput {
  readonly kind: "dp";

  /**
   * Arbitrary parameters required by the DP algorithm.
   *
   * Shape varies per algorithm — e.g. knapsack might carry
   * `{ capacity: 50, weights: [...], values: [...] }`.
   */
  readonly params: Record<string, unknown>;
}

/**
 * Discriminated union of all possible algorithm inputs.
 *
 * Narrow on `.kind` to access the type-safe fields.
 *
 * @example
 * ```ts
 * if (input.kind === "array") {
 *   console.log(input.values);
 * }
 * ```
 */
export type InputData = ArrayInput | GraphInput | DpInput;
