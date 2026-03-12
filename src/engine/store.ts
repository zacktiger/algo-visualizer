/**
 * Global Zustand store for the Algorithm Visualizer.
 *
 * Holds all application state: the currently-selected algorithm, input data,
 * generated steps, playback state, and running statistics.
 *
 * @module engine/store
 */

import { create } from "zustand";
import {
  type AlgorithmMeta,
  type InputData,
  type Step,
  StepType,
} from "../algorithms/types";

/* ═══════════════════════════════════════════════════════════════════════════
 * Stats
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Running counters that track algorithm complexity at runtime.
 */
export interface AlgoStats {
  /** Number of element comparisons performed. */
  comparisons: number;

  /** Number of element swaps performed. */
  swaps: number;

  /**
   * Aggregate count of all other memory-touching operations
   * (VISIT, RELAX, SET_CELL, PUSH, POP, MARK).
   */
  memOps: number;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Store shape
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Complete state + action surface for the visualizer.
 */
export interface AlgoStore {
  /* ── Data ────────────────────────────────────────────────────────── */

  /** The currently-selected algorithm (or `null` if none is loaded). */
  algorithm: AlgorithmMeta | null;

  /** The input data fed to the algorithm (or `null` if not yet set). */
  inputData: InputData | null;

  /** Ordered list of discrete steps produced by the algorithm generator. */
  steps: Step[];

  /** 0-based index of the step currently being displayed. */
  currentStep: number;

  /* ── Playback ────────────────────────────────────────────────────── */

  /** Whether the playback engine is currently auto-advancing. */
  isPlaying: boolean;

  /**
   * Playback speed multiplier.
   *
   * Common values: `0.5`, `1`, `2`, `4` — but the store accepts any
   * positive number so the UI can define its own presets.
   */
  speed: number;

  /* ── Statistics ──────────────────────────────────────────────────── */

  /** Running stats that are recomputed as the user scrubs through steps. */
  stats: AlgoStats;

  /* ── Actions ─────────────────────────────────────────────────────── */

  /**
   * Set the active algorithm metadata.
   *
   * @param algo - The algorithm to load.
   */
  setAlgorithm(algo: AlgorithmMeta): void;

  /**
   * Set the input data for the algorithm.
   *
   * @param input - Array, graph, or DP input.
   */
  setInputData(input: InputData): void;

  /**
   * Replace the current step sequence.
   *
   * @param steps - New array of steps (typically produced by a generator).
   */
  setSteps(steps: Step[]): void;

  /**
   * Jump to a specific step index.
   *
   * @param index - 0-based step index.
   */
  setCurrentStep(index: number): void;

  /**
   * Update the playing flag.
   *
   * @param val - `true` if playback is running.
   */
  setIsPlaying(val: boolean): void;

  /**
   * Change playback speed.
   *
   * @param speed - Positive multiplier (e.g. `0.5`, `1`, `2`, `4`).
   */
  setSpeed(speed: number): void;

  /**
   * Reset all stats counters to zero.
   */
  resetStats(): void;

  /**
   * Recompute stats by scanning `steps[0..upToStep]` (inclusive).
   *
   * - `COMPARE` increments `comparisons`
   * - `SWAP` increments `swaps`
   * - Every other type (except `DONE`) increments `memOps`
   *
   * @param upToStep - Inclusive upper-bound step index.
   */
  computeStats(upToStep: number): void;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Store implementation
 * ═══════════════════════════════════════════════════════════════════════ */

/** Convenience constant for zeroed-out stats. */
const EMPTY_STATS: AlgoStats = { comparisons: 0, swaps: 0, memOps: 0 };

/**
 * Global Zustand store instance.
 *
 * Import this in any React component via:
 * ```ts
 * const algo = useAlgoStore((s) => s.algorithm);
 * ```
 */
export const useAlgoStore = create<AlgoStore>((set, get) => ({
  /* ── Initial state ───────────────────────────────────────────────── */
  algorithm: null,
  inputData: null,
  steps: [],
  currentStep: 0,
  isPlaying: false,
  speed: 1,
  stats: { ...EMPTY_STATS },

  /* ── Actions ─────────────────────────────────────────────────────── */

  setAlgorithm: (algo) => set({ algorithm: algo }),

  setInputData: (input) => set({ inputData: input }),

  setSteps: (steps) => set({ steps }),

  setCurrentStep: (index) => set({ currentStep: index }),

  setIsPlaying: (val) => set({ isPlaying: val }),

  setSpeed: (speed) => set({ speed }),

  resetStats: () => set({ stats: { ...EMPTY_STATS } }),

  computeStats: (upToStep) => {
    const { steps } = get();
    let comparisons = 0;
    let swaps = 0;
    let memOps = 0;

    const upperBound = Math.min(upToStep, steps.length - 1);

    for (let i = 0; i <= upperBound; i++) {
      const step = steps[i];
      switch (step.type) {
        case StepType.COMPARE:
          comparisons += 1;
          break;
        case StepType.SWAP:
          swaps += 1;
          break;
        case StepType.DONE:
          // DONE doesn't count towards any stat.
          break;
        default:
          // VISIT, RELAX, SET_CELL, PUSH, POP, MARK
          memOps += 1;
          break;
      }
    }

    set({ stats: { comparisons, swaps, memOps } });
  },
}));
