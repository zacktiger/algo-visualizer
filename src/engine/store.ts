/**
 * Global Zustand store for the Algorithm Visualizer.
 *
 * Holds all application state: the currently-selected algorithm, input data,
 * generated steps, playback state, and running statistics.
 *
 * @module engine/store
 */

import { create } from "zustand";
import type { AlgorithmMeta, InputData, Step } from "../algorithms/types";

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
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Store implementation
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Global Zustand store instance.
 *
 * Import this in any React component via:
 * ```ts
 * const algo = useAlgoStore((s) => s.algorithm);
 * ```
 */
export const useAlgoStore = create<AlgoStore>((set) => ({
  /* ── Initial state ───────────────────────────────────────────────── */
  algorithm: null,
  inputData: null,
  steps: [],
  currentStep: 0,
  isPlaying: false,
  speed: 1,

  /* ── Actions ─────────────────────────────────────────────────────── */

  setAlgorithm: (algo) => set({ algorithm: algo }),

  setInputData: (input) => set({ inputData: input }),

  setSteps: (steps) => set({ steps }),

  setCurrentStep: (index) => set({ currentStep: index }),

  setIsPlaying: (val) => set({ isPlaying: val }),

  setSpeed: (speed) => set({ speed }),
}));
