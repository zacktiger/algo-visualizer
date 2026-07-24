/**
 * Shared colour palette for algorithm visualisation states.
 *
 * Vibrant & playful theme — saturated, high-energy hues on a deep indigo-black
 * canvas. Import these in every renderer / component to keep styling consistent.
 *
 * @module constants/colors
 */

/** Centralised colour map for every visualisation state. */
export const COLORS = {
  default: "#2b2350", // idle — deep indigo, tinted for the purple-black canvas
  comparing: "#FBBF24", // amber-400
  swapping: "#FB7185", // rose-400 (hot pink-red)
  sorted: "#34D399", // emerald-400
  visiting: "#38BDF8", // sky-400
  visited: "#A78BFA", // violet-400
  pivot: "#E879F9", // fuchsia-400
  current: "#FB923C", // orange-400
  done: "#34D399", // emerald-400
  pointer: "#818CF8", // indigo-400
} as const;

/** Glow variants — same hue with alpha for box-shadow / filter usage. */
export const GLOW = {
  comparing: "rgba(251, 191, 36, 0.55)",
  swapping: "rgba(251, 113, 133, 0.55)",
  sorted: "rgba(52, 211, 153, 0.45)",
  visiting: "rgba(56, 189, 248, 0.55)",
  visited: "rgba(167, 139, 250, 0.5)",
  pivot: "rgba(232, 121, 249, 0.55)",
  current: "rgba(251, 146, 60, 0.55)",
  done: "rgba(52, 211, 153, 0.45)",
  pointer: "rgba(129, 140, 248, 0.5)",
} as const;

/** Step-type → colour mapping for timeline markers. */
export const STEP_COLORS: Record<string, string> = {
  COMPARE: "#FBBF24",
  SWAP: "#FB7185",
  VISIT: "#38BDF8",
  RELAX: "#A78BFA",
  SET_CELL: "#FB923C",
  PUSH: "#C084FC",
  POP: "#E879F9",
  MARK: "#34D399",
  DONE: "#34D399",
} as const;

/** A single colour value from the palette. */
export type ColorValue = (typeof COLORS)[keyof typeof COLORS];
