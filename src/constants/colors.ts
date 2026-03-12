/**
 * Shared colour palette for algorithm visualisation states.
 *
 * Import these in every renderer / component to keep styling consistent.
 *
 * @module constants/colors
 */

/** Centralised colour map for every visualisation state. */
export const COLORS = {
  default: "#1E293B",
  comparing: "#F59E0B",
  swapping: "#EF4444",
  sorted: "#10B981",
  visiting: "#3B82F6",
  visited: "#6366F1",
  pivot: "#EC4899",
  current: "#F97316",
  done: "#10B981",
  pointer: "#60A5FA",
} as const;

/** Glow variants — same hue with alpha for box-shadow / filter usage. */
export const GLOW = {
  comparing: "rgba(245, 158, 11, 0.5)",
  swapping: "rgba(239, 68, 68, 0.5)",
  sorted: "rgba(16, 185, 129, 0.35)",
  visiting: "rgba(59, 130, 246, 0.5)",
  visited: "rgba(99, 102, 241, 0.4)",
  pivot: "rgba(236, 72, 153, 0.5)",
  current: "rgba(249, 115, 22, 0.5)",
  done: "rgba(16, 185, 129, 0.35)",
  pointer: "rgba(96, 165, 250, 0.4)",
} as const;

/** Step-type → colour mapping for timeline markers. */
export const STEP_COLORS: Record<string, string> = {
  COMPARE: "#F59E0B",
  SWAP: "#EF4444",
  VISIT: "#3B82F6",
  RELAX: "#6366F1",
  SET_CELL: "#F97316",
  PUSH: "#8B5CF6",
  POP: "#A78BFA",
  MARK: "#10B981",
  DONE: "#10B981",
} as const;

/** A single colour value from the palette. */
export type ColorValue = (typeof COLORS)[keyof typeof COLORS];
