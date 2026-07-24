/**
 * Array bar-chart renderer with vertical bars, animated height & colour,
 * and Framer Motion layoutId-based swap animations.
 *
 * Each bar's height is proportional to its value. Bars sit at the bottom
 * of the container and grow upward. Colour reflects the current step state.
 *
 * @module renderers/ArrayRenderer
 */

import { motion, AnimatePresence } from "framer-motion";
import { COLORS, GLOW } from "../constants/colors";
import type { Step } from "../algorithms/types";
import { StepType } from "../algorithms/types";

/* ────────────────────────────────────────────────────────────────────── */
/*  Props                                                                */
/* ────────────────────────────────────────────────────────────────────── */

/** A single array element carrying a stable identity across swaps. */
export interface ArrayItem {
  /** Stable id (derived from the element's original index) — used for
   *  layout animation so a swap physically slides bars past each other. */
  id: number;
  /** The current numeric value at this position. */
  value: number;
}

/** Props accepted by {@link ArrayRenderer}. */
export interface ArrayRendererProps {
  /** Current array items to visualise, in positional order. */
  values: ArrayItem[];
  /** Payload of the active step. */
  stepPayload: Step["payload"];
  /** Type of the active step. */
  stepType: Step["type"];
  /**
   * Positions that have been permanently marked sorted / found up to the
   * current step. These stay coloured green across later steps so the user
   * can watch the sorted region grow, instead of flashing for one frame.
   */
  sortedIndices?: Set<number>;
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Colour helpers                                                       */
/* ────────────────────────────────────────────────────────────────────── */

/** Border colour for the default (idle) bar state. */
const DEFAULT_BORDER = "#475569";

/** Determine bar background colour for a given index. */
function getBarColor(
  index: number,
  stepType: Step["type"],
  payload: Step["payload"],
  sortedIndices?: Set<number>,
): string {
  // Finished → everything green
  if (stepType === StepType.DONE) return COLORS.done;

  const payloadI = payload.i as number | undefined;
  const payloadJ = payload.j as number | undefined;
  const payloadIndex = payload.index as number | undefined;
  const payloadState = payload.state as string | undefined;
  const payloadMid = payload.mid as number | undefined;
  const pivot = payload.pivot as number | undefined;

  // i / j pointers — swap vs compare (active operations take precedence so
  // you can still see a settled element being compared).
  if (index === payloadI || index === payloadJ) {
    return stepType === StepType.SWAP ? COLORS.swapping : COLORS.comparing;
  }

  // Pivot
  if (pivot === index) return COLORS.pivot;

  // MARK step (sorted / pivot markers that come individually)
  if (stepType === StepType.MARK) {
    if (payloadIndex === index && payloadState === "sorted") return COLORS.sorted;
    if (payloadIndex === index && payloadState === "pivot") return COLORS.pivot;
  }

  // Current index (e.g. SET_CELL, binary-search mid)
  if (payloadIndex === index && stepType === StepType.SET_CELL) return COLORS.current;
  if (payloadMid === index && stepType === StepType.COMPARE) return COLORS.current;

  // Persistently-sorted / found positions stay green across later steps.
  if (sortedIndices?.has(index)) return COLORS.sorted;

  return COLORS.default;
}

/** Determine a glow box-shadow for highlighted bars. */
function getBarGlow(
  index: number,
  stepType: Step["type"],
  payload: Step["payload"],
): string {
  const payloadI = payload.i as number | undefined;
  const payloadJ = payload.j as number | undefined;

  if (stepType === StepType.SWAP && (index === payloadI || index === payloadJ)) {
    return `0 0 14px ${GLOW.swapping}, 0 0 28px ${GLOW.swapping}`;
  }
  if (stepType === StepType.COMPARE && (index === payloadI || index === payloadJ)) {
    return `0 0 14px ${GLOW.comparing}, 0 0 28px ${GLOW.comparing}`;
  }
  if (stepType === StepType.DONE) {
    return `0 0 10px ${GLOW.done}`;
  }

  const payloadState = payload.state as string | undefined;
  const payloadIndex = payload.index as number | undefined;
  if (stepType === StepType.MARK && payloadIndex === index && payloadState === "sorted") {
    return `0 0 10px ${GLOW.sorted}`;
  }

  return "none";
}

/** Determine whether a bar should slightly scale-up (swap feedback). */
function getBarScale(
  index: number,
  stepType: Step["type"],
  payload: Step["payload"],
): number {
  const payloadI = payload.i as number | undefined;
  const payloadJ = payload.j as number | undefined;

  if (stepType === StepType.SWAP && (index === payloadI || index === payloadJ)) {
    return 1.08;
  }
  return 1;
}

/** Determine whether a pivot bar should be slightly wider. */
function getBarWidthMultiplier(
  index: number,
  payload: Step["payload"],
): number {
  const pivot = payload.pivot as number | undefined;
  if (pivot === index) return 1.15;
  return 1;
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Component                                                            */
/* ────────────────────────────────────────────────────────────────────── */

/** Container height in pixels. */
const CONTAINER_HEIGHT = 400;

/** Height reserved below the plot for the value + index labels. */
const LABELS_HEIGHT = 34;

/** Height of the bar plotting area (bars are positioned against a 0 baseline). */
const PLOT_HEIGHT = CONTAINER_HEIGHT - LABELS_HEIGHT;

/** Maximum bar width in pixels. */
const MAX_BAR_WIDTH = 60;

/** Gap between bars in pixels. */
const BAR_GAP = 2;

/** Minimum bar length so tiny / zero values are still visible. */
const MIN_BAR_HEIGHT = 4;

/**
 * Renders an array of numbers as animated vertical bars measured against a
 * shared zero baseline: positive values grow up, negative values grow down.
 * When all values are non-negative the baseline sits on the floor and it
 * behaves like a normal bar chart.
 */
export function ArrayRenderer({
  values,
  stepPayload,
  stepType,
  sortedIndices,
}: ArrayRendererProps) {
  const nums = values.map((v) => v.value);
  // Include 0 so the baseline is always within the plotted range.
  const lo = Math.min(0, ...nums);
  const hi = Math.max(0, ...nums);
  const range = hi - lo || 1;

  // Distance of the zero baseline from the bottom of the plot area.
  const zeroFromBottom = ((0 - lo) / range) * PLOT_HEIGHT;
  const hasNegative = lo < 0;

  // Auto bar width: fill available space but cap at MAX_BAR_WIDTH
  const autoWidth = `min(${MAX_BAR_WIDTH}px, calc((100% - ${(values.length - 1) * BAR_GAP}px) / ${values.length}))`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        height: CONTAINER_HEIGHT,
        width: "100%",
        gap: BAR_GAP,
        padding: "0 8px",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* ── Zero baseline (only shown when there are negative values) ── */}
      {hasNegative && (
        <div
          style={{
            position: "absolute",
            left: 8,
            right: 8,
            bottom: LABELS_HEIGHT + zeroFromBottom,
            height: 0,
            borderTop: "1px dashed #475569",
            pointerEvents: "none",
          }}
        />
      )}

      <AnimatePresence mode="popLayout">
        {values.map((item, idx) => {
          // `idx` is the positional index (payload i/j/index refer to
          // positions); `item.id` is the element's stable identity so
          // framer's layout animation slides bars on a swap.
          const val = item.value;
          const color = getBarColor(idx, stepType, stepPayload, sortedIndices);
          const glow = getBarGlow(idx, stepType, stepPayload);
          const scale = getBarScale(idx, stepType, stepPayload);
          const widthMul = getBarWidthMultiplier(idx, stepPayload);

          const positive = val >= 0;
          const magnitude = (Math.abs(val) / range) * PLOT_HEIGHT;
          const barHeight = Math.max(magnitude, MIN_BAR_HEIGHT);
          // Positive bars sit on the baseline growing up; negative bars hang
          // below it growing down.
          const barBottom = positive
            ? zeroFromBottom
            : zeroFromBottom - barHeight;

          const isDefault = color === COLORS.default;
          const borderColor = isDefault ? DEFAULT_BORDER : color;
          const radius = positive ? "4px 4px 0 0" : "0 0 4px 4px";

          return (
            <motion.div
              key={item.id}
              layoutId={`bar-${item.id}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: autoWidth,
                flexShrink: 0,
              }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {/* ── Plot area with baseline-anchored bar ── */}
              <div style={{ position: "relative", width: "100%", height: PLOT_HEIGHT }}>
                <motion.div
                  layout
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    borderRadius: radius,
                    // All longhand — mixing the `border` shorthand with
                    // per-side widths triggers React style-conflict warnings
                    // during framer-motion's re-renders.
                    borderStyle: "solid",
                    borderColor: borderColor,
                    borderLeftWidth: 1,
                    borderRightWidth: 1,
                    borderTopWidth: positive ? 2 : 1,
                    borderBottomWidth: positive ? 1 : 2,
                  }}
                  animate={{
                    bottom: barBottom,
                    height: barHeight,
                    backgroundColor: color,
                    boxShadow: glow,
                    scaleX: widthMul * scale,
                    scaleY: scale === 1 ? 1 : 1.02,
                  }}
                  transition={{
                    bottom: { duration: 0.25, ease: "easeInOut" },
                    height: { duration: 0.25, ease: "easeInOut" },
                    backgroundColor: { duration: 0.15 },
                    boxShadow: { duration: 0.2 },
                    scaleX: { type: "spring", stiffness: 300, damping: 20 },
                    scaleY: { type: "spring", stiffness: 300, damping: 20 },
                  }}
                />
              </div>

              {/* ── Value label (below plot) ── */}
              <motion.span
                style={{
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontSize: values.length > 30 ? 8 : 10,
                  marginTop: 4,
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
                animate={{
                  color: isDefault ? "#94A3B8" : color,
                }}
                transition={{ duration: 0.15 }}
              >
                {val}
              </motion.span>

              {/* ── Index label (very bottom) ── */}
              <span
                style={{
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontSize: values.length > 30 ? 6 : 8,
                  color: "#64748B",
                  userSelect: "none",
                  lineHeight: 1,
                  marginTop: 1,
                }}
              >
                {idx}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
