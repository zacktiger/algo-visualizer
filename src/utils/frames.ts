/**
 * Precomputed per-step visualisation state ("frames").
 *
 * Rendering the current step used to mean replaying `steps[0..currentStep]`
 * on *every* render to rebuild the array snapshot, sorted/visited sets, DP
 * table, and stats. Because `currentStep` changes every playback tick, those
 * memos never hit — a large run did ~4 full-prefix scans per frame (O(n²)
 * over a play-through).
 *
 * Instead we fold the step list **once** (when steps are generated) into an
 * array of {@link AlgorithmFrame}s indexed by step, turning per-frame lookup
 * into O(1). The same derivation is shared by the main view and Compare mode.
 *
 * @module utils/frames
 */

import { useMemo } from "react";
import type { InputData, Step } from "../algorithms/types";
import { StepType } from "../algorithms/types";
import type { ArrayItem } from "../renderers/ArrayRenderer";
import type { AlgoStats } from "../engine/store";

/** The live auxiliary data structure a traversal maintains (BFS queue, DFS
 *  stack, Dijkstra priority queue). Reconstructed from PUSH / POP steps. */
export interface Frontier {
  /** Which discipline the container follows — drives labelling + "next out". */
  kind: "queue" | "stack" | "pqueue";
  /** Contents in push order (left = earliest pushed). */
  items: string[];
  /** The element that will be removed next (front / top / min-distance). */
  next?: string;
}

/** How one DP cell was computed — its recurrence sources + a readable
 *  expression — so a filled cell can be interrogated at rest, not just for the
 *  single frame it was written. */
export interface DpCellInfo {
  sources: Array<{ row: number; col: number }>;
  value: number;
  /** Compact recurrence, e.g. `max(skip 3, take 7)`. */
  expr?: string;
}

/** Cumulative visualisation state as of one particular step. */
export interface AlgorithmFrame {
  /** Positional array snapshot (array algorithms). */
  array: ArrayItem[];
  /** Positions permanently marked sorted / found so far. */
  sortedIndices: Set<number>;
  /** Graph nodes permanently visited / settled so far. */
  visitedNodes: Set<string>;
  /** Best-known distance per node so far (Dijkstra); `∞` omitted. */
  distances: Map<string, number>;
  /** DP table reconstructed so far. */
  dpTable: number[][];
  /**
   * Active binary-search window `[lo, hi]` (positional indices). Present only
   * for binary search; lets the renderer shade the live candidate range so the
   * halving is visible instead of just the `mid` probe.
   */
  searchRange?: { lo: number; hi: number };
  /** Live queue / stack / priority-queue contents (traversal algorithms). */
  frontier?: Frontier;
  /** Per-cell DP provenance so far, keyed `${row},${col}` (1-D uses row 0). */
  dpProvenance?: Map<string, DpCellInfo>;
  /** Running comparison / swap / mem-op counters. */
  stats: AlgoStats;
}

/** Map an algorithm id to the auxiliary structure it maintains, if any. */
function frontierKindOf(id?: string): Frontier["kind"] | undefined {
  if (id === "bfs") return "queue";
  if (id === "dfs") return "stack";
  if (id === "dijkstra") return "pqueue";
  return undefined;
}

/** A zeroed frame, used before any steps exist. */
export const EMPTY_FRAME: AlgorithmFrame = {
  array: [],
  sortedIndices: new Set(),
  visitedNodes: new Set(),
  distances: new Map(),
  dpTable: [],
  stats: { comparisons: 0, swaps: 0, memOps: 0 },
};

/** Tally a single step's contribution to the running stats counters. */
function applyStats(stats: AlgoStats, step: Step): void {
  switch (step.type) {
    case StepType.COMPARE:
      stats.comparisons += 1;
      break;
    case StepType.SWAP:
      stats.swaps += 1;
      break;
    case StepType.DONE:
      break;
    default:
      stats.memOps += 1;
      break;
  }
}

/** Accumulate the permanent sorted / visited marks carried by a MARK step. */
function applyMarks(
  step: Step,
  sorted: Set<number>,
  visited: Set<string>,
): void {
  if (step.type !== StepType.MARK) return;
  const { index, node, state } = step.payload as {
    index?: number;
    node?: string;
    state?: string;
  };
  if (typeof index === "number" && (state === "sorted" || state === "found")) {
    sorted.add(index);
  }
  if (typeof node === "string" && (state === "visited" || state === "settled")) {
    visited.add(node);
  }
}

/**
 * Fold a step list into per-step frames for the given input.
 *
 * The heavy running state (array, DP table) is only tracked for the relevant
 * `inputData.kind`; unrelated fields stay empty. Array snapshots reuse the
 * immutable item objects, so each frame is a cheap `slice()`.
 */
export function deriveFrames(
  steps: Step[],
  inputData: InputData | null,
  algorithmId?: string,
): AlgorithmFrame[] {
  const frames: AlgorithmFrame[] = [];
  if (steps.length === 0) return frames;

  const kind = inputData?.kind;
  const frontierKind = frontierKindOf(algorithmId);

  // Running state carried across steps.
  let arr: ArrayItem[] =
    kind === "array" && inputData
      ? inputData.values.map((value, i) => ({ id: i, value }))
      : [];
  const sortedIndices = new Set<number>();
  const visitedNodes = new Set<string>();
  const distances = new Map<string, number>();
  let searchRange: { lo: number; hi: number } | undefined;
  // Live traversal container (queue/stack/PQ), reconstructed from PUSH/POP.
  const frontier: string[] = [];
  const stats: AlgoStats = { comparisons: 0, swaps: 0, memOps: 0 };

  // DP table: copy-on-write per SET_CELL so earlier frames keep their state.
  let dpTable: number[][] = [];
  // Cumulative per-cell provenance (only relevant for DP algorithms).
  const dpProvenance = new Map<string, DpCellInfo>();

  for (const step of steps) {
    applyStats(stats, step);
    applyMarks(step, sortedIndices, visitedNodes);

    // ── Binary-search window (positional lo..hi carried by its MARK step) ──
    if (kind === "array" && step.type === StepType.MARK) {
      const { low, high } = step.payload as { low?: number; high?: number };
      if (typeof low === "number" && typeof high === "number") {
        searchRange = { lo: low, hi: high };
      }
    }

    // ── Array mutations ──
    if (kind === "array") {
      if (step.type === StepType.SWAP) {
        const { i, j } = step.payload as { i?: number; j?: number };
        if (typeof i === "number" && typeof j === "number") {
          arr = arr.slice();
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
      } else if (
        step.type === StepType.SET_CELL &&
        typeof step.payload.index === "number"
      ) {
        const index = step.payload.index;
        arr = arr.slice();
        arr[index] = { ...arr[index], value: step.payload.value as number };
      }
    }

    // ── DP table mutations (row/col 2-D or index 1-D) ──
    if (kind === "dp" && step.type === StepType.SET_CELL) {
      const { row, col, index, value, sources, skip, take, from } =
        step.payload as {
          row?: number;
          col?: number;
          index?: number;
          value?: number;
          sources?: Array<{ row: number; col: number }>;
          skip?: number;
          take?: number;
          from?: string;
        };
      let key: string | undefined;
      if (row !== undefined && col !== undefined) {
        dpTable = growAndSet2D(dpTable, row, col, value ?? 0);
        key = `${row},${col}`;
      } else if (index !== undefined) {
        dpTable = growAndSet1D(dpTable, index, value ?? 0);
        key = `0,${index}`;
      }
      if (key) {
        // A readable recurrence for the hover inspector.
        let expr: string | undefined;
        if (typeof skip === "number" && typeof take === "number") {
          expr = `max(skip ${skip}, take ${take})`;
        } else if (typeof from === "string") {
          expr = `carried from the ${from} neighbour`;
        }
        dpProvenance.set(key, { sources: sources ?? [], value: value ?? 0, expr });
      }
    }

    // ── Dijkstra distances ──
    // PUSH carries the (source or relaxed) node's distance; RELAX carries the
    // improved distance. BFS/DFS PUSH omit `distance`, so they stay unlabelled.
    if (kind === "graph") {
      if (step.type === StepType.PUSH) {
        const { node, distance } = step.payload as {
          node?: string;
          distance?: number;
        };
        if (typeof node === "string" && typeof distance === "number") {
          distances.set(node, distance);
        }
        // Grow the frontier. A priority queue keeps at most one entry per node
        // (a relaxed node's key is updated in place); a plain queue/stack lets
        // the same node appear more than once, which is faithful to how they run.
        if (frontierKind && typeof node === "string") {
          if (frontierKind === "pqueue") {
            if (!frontier.includes(node)) frontier.push(node);
          } else {
            frontier.push(node);
          }
        }
      } else if (step.type === StepType.POP) {
        const { node } = step.payload as { node?: string };
        if (frontierKind && typeof node === "string") {
          if (frontierKind === "stack") {
            // Remove the last (top-most) occurrence.
            for (let k = frontier.length - 1; k >= 0; k--) {
              if (frontier[k] === node) {
                frontier.splice(k, 1);
                break;
              }
            }
          } else {
            // Queue / PQ: remove the first matching entry.
            const k = frontier.indexOf(node);
            if (k >= 0) frontier.splice(k, 1);
          }
        }
      } else if (step.type === StepType.RELAX) {
        const { to, newDist } = step.payload as { to?: string; newDist?: number };
        if (typeof to === "string" && typeof newDist === "number") {
          distances.set(to, newDist);
        }
      }
    }

    // Snapshot the frontier + which element leaves next (front / top / min-key).
    let frontierSnap: Frontier | undefined;
    if (frontierKind) {
      let next: string | undefined;
      if (frontier.length > 0) {
        if (frontierKind === "stack") next = frontier[frontier.length - 1];
        else if (frontierKind === "queue") next = frontier[0];
        else {
          // Priority queue: the smallest current tentative distance.
          next = frontier.reduce((best, n) =>
            (distances.get(n) ?? Infinity) < (distances.get(best) ?? Infinity) ? n : best,
          );
        }
      }
      frontierSnap = { kind: frontierKind, items: [...frontier], next };
    }

    frames.push({
      array: arr,
      sortedIndices: new Set(sortedIndices),
      visitedNodes: new Set(visitedNodes),
      distances: new Map(distances),
      dpTable,
      searchRange,
      frontier: frontierSnap,
      dpProvenance: kind === "dp" ? new Map(dpProvenance) : undefined,
      stats: { ...stats },
    });
  }

  return frames;
}

/**
 * Set one cell in a 2-D table, returning a fresh **rectangular** table grown
 * to fit `(row, col)`. Kept rectangular (zero-filled) so the renderer can read
 * the column count off `table[0]`, matching the original `buildDpTable`.
 */
function growAndSet2D(
  table: number[][],
  row: number,
  col: number,
  value: number,
): number[][] {
  const rows = Math.max(table.length, row + 1);
  const cols = Math.max(table[0]?.length ?? 0, col + 1);
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) =>
      r === row && c === col ? value : table[r]?.[c] ?? 0,
    ),
  );
}

/** Set one cell in a single-row table, growing it as needed. */
function growAndSet1D(
  table: number[][],
  index: number,
  value: number,
): number[][] {
  const cols = Math.max(table[0]?.length ?? 0, index + 1);
  return [
    Array.from({ length: cols }, (_, c) =>
      c === index ? value : table[0]?.[c] ?? 0,
    ),
  ];
}

/** React hook: memoized frame derivation keyed on steps + input + algorithm. */
export function useAlgorithmFrames(
  steps: Step[],
  inputData: InputData | null,
  algorithmId?: string,
): AlgorithmFrame[] {
  return useMemo(
    () => deriveFrames(steps, inputData, algorithmId),
    [steps, inputData, algorithmId],
  );
}
