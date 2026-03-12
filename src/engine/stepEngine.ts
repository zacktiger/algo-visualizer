/**
 * A framework-agnostic playback engine for algorithm step sequences.
 *
 * `StepEngine` manages a linear timeline of {@link Step} objects and exposes
 * play / pause / seek controls. It uses `setInterval` internally and has
 * **zero** React (or any other framework) dependencies.
 *
 * @example
 * ```ts
 * const engine = new StepEngine(steps);
 * engine.play((i) => store.setCurrentStep(i), 2); // 2× speed
 * ```
 *
 * @module engine/stepEngine
 */

import type { Step } from "../algorithms/types";

/**
 * Timer handle type that works in both browser (`number`) and Node
 * (`NodeJS.Timeout`) environments.
 */
type TimerHandle = ReturnType<typeof setInterval>;

/**
 * Pure-TypeScript playback controller for a sequence of algorithm steps.
 *
 * Internally tracks the current index and optionally runs a periodic
 * timer that advances through the steps and invokes a callback.
 */
export class StepEngine {
  /** The immutable step sequence loaded into the engine. */
  private readonly steps: readonly Step[];

  /** Current position in the step sequence (0-based). */
  private currentIndex: number;

  /** Handle returned by `setInterval`, or `null` when paused / stopped. */
  private timerHandle: TimerHandle | null;

  /** Whether the engine is currently auto-advancing. */
  private playing: boolean;

  /**
   * Create a new `StepEngine` pre-loaded with a step sequence.
   *
   * @param steps - The complete array of algorithm steps to play through.
   */
  constructor(steps: Step[]) {
    this.steps = steps;
    this.currentIndex = 0;
    this.timerHandle = null;
    this.playing = false;
  }

  /* ─── Playback controls ─────────────────────────────────────────── */

  /**
   * Begin auto-advancing through the steps at the given speed.
   *
   * If already playing, the previous timer is cleared and a new one is
   * started (allowing live speed changes).
   *
   * @param onTick - Callback invoked on every tick with the new step index.
   * @param speed  - Playback multiplier.  Interval = `1000 / speed` ms.
   */
  play(onTick: (index: number) => void, speed: number): void {
    // Clear any existing timer so we don't stack intervals.
    this.clearTimer();

    this.playing = true;
    const intervalMs = 1000 / speed;

    this.timerHandle = setInterval(() => {
      if (this.currentIndex >= this.steps.length - 1) {
        // Reached the last step — auto-pause.
        this.pause();
        return;
      }

      this.currentIndex += 1;
      onTick(this.currentIndex);
    }, intervalMs);
  }

  /**
   * Pause playback without resetting the current position.
   */
  pause(): void {
    this.clearTimer();
    this.playing = false;
  }

  /* ─── Manual navigation ─────────────────────────────────────────── */

  /**
   * Advance one step forward.
   *
   * @returns The new (clamped) step index.
   */
  stepForward(): number {
    this.currentIndex = this.clamp(this.currentIndex + 1);
    return this.currentIndex;
  }

  /**
   * Move one step backward.
   *
   * @returns The new (clamped) step index.
   */
  stepBack(): number {
    this.currentIndex = this.clamp(this.currentIndex - 1);
    return this.currentIndex;
  }

  /**
   * Jump to an arbitrary position in the step sequence.
   *
   * @param index - Desired step index (will be clamped to valid range).
   * @returns The actual (clamped) step index.
   */
  seek(index: number): number {
    this.currentIndex = this.clamp(index);
    return this.currentIndex;
  }

  /* ─── Getters ───────────────────────────────────────────────────── */

  /**
   * @returns The 0-based index of the step currently displayed.
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * @returns Total number of steps loaded into the engine.
   */
  getTotalSteps(): number {
    return this.steps.length;
  }

  /**
   * @returns `true` if the engine is currently auto-advancing.
   */
  isPlaying(): boolean {
    return this.playing;
  }

  /* ─── Internal helpers ──────────────────────────────────────────── */

  /**
   * Clamp `value` to the valid index range `[0, steps.length - 1]`.
   *
   * If the steps array is empty the result is always `0`.
   */
  private clamp(value: number): number {
    if (this.steps.length === 0) return 0;
    return Math.max(0, Math.min(value, this.steps.length - 1));
  }

  /**
   * Clear the interval timer if one is running.
   */
  private clearTimer(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }
}
