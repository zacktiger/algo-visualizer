/**
 * Resolve an algorithm's step list from its id + input.
 *
 * Dispatch lives in the algorithm registry (each entry carries its own
 * `run(input)` adapter); this is a thin lookup kept for call-site stability.
 *
 * @module utils/runAlgorithm
 */

import type { InputData, Step } from "../algorithms/types";
import { getEntry } from "../algorithms";

/**
 * Run the algorithm registered under `algorithmId` against `input`.
 *
 * Returns the fully-collected step array, or `[]` when the id is unknown or
 * the input kind doesn't match the algorithm.
 */
export function runGenerator(algorithmId: string, input: InputData): Step[] {
  return getEntry(algorithmId)?.run(input) ?? [];
}
