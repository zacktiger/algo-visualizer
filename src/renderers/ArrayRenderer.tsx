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

/** Props accepted by {@link ArrayRenderer}. */
export interface ArrayRendererProps {
  /** Current array values to visualise. */
  values: number[];
  /** Payload of the active step. */
  stepPayload: Step["payload"];
  /** Type of the active step. */
  stepType: Step["type"];
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
): string {
  // Finished → everything green
  if (stepType === StepType.DONE) return COLORS.done;

  const payloadI = payload.i as number | undefined;
  const payloadJ = payload.j as number | undefined;
  const payloadIndex = payload.index as number | undefined;
  const payloadState = payload.state as string | undefined;
  const payloadMid = payload.mid as number | undefined;
  const sorted = payload.sorted as number[] | undefined;
  const pivot = payload.pivot as number | undefined;

  // Already-sorted indices
  if (sorted?.includes(index)) return COLORS.sorted;

  // i / j pointers — swap vs compare
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

/** Maximum bar width in pixels. */
const MAX_BAR_WIDTH = 60;

/** Gap between bars in pixels. */
const BAR_GAP = 2;

/** Minimum bar height so value = 0 is still visible. */
const MIN_BAR_HEIGHT = 4;

/**
 * Renders an array of numbers as animated vertical bars growing upward
 * from the bottom of the container.
 */
export function ArrayRenderer({
  values,
  stepPayload,
  stepType,
}: ArrayRendererProps) {
  const maxVal = Math.max(...values, 1);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        height: CONTAINER_HEIGHT,
        width: "100%",
        gap: BAR_GAP,
        padding: "0 8px",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      <AnimatePresence mode="popLayout">
        {values.map((val, idx) => {
          const color = getBarColor(idx, stepType, stepPayload);
          const glow = getBarGlow(idx, stepType, stepPayload);
          const scale = getBarScale(idx, stepType, stepPayload);
          const widthMul = getBarWidthMultiplier(idx, stepPayload);

          const computedHeight = Math.max(
            (val / maxVal) * CONTAINER_HEIGHT * 0.85,
            MIN_BAR_HEIGHT,
          );

          // Auto bar width: fill available space but cap at MAX_BAR_WIDTH
          const autoWidth = `min(${MAX_BAR_WIDTH}px, calc((100% - ${(values.length - 1) * BAR_GAP}px) / ${values.length}))`;

          const isDefault = color === COLORS.default;
          const borderColor = isDefault ? DEFAULT_BORDER : color;

          return (
            <motion.div
              key={idx}
              layoutId={`bar-${idx}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                width: autoWidth,
                flexShrink: 0,
                position: "relative",
              }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {/* ── Bar ────────────────────────────────────── */}
              <motion.div
                layout
                style={{
                  width: "100%",
                  borderRadius: "4px 4px 0 0",
                  borderTop: `2px solid ${borderColor}`,
                  borderLeft: `1px solid ${borderColor}`,
                  borderRight: `1px solid ${borderColor}`,
                  minHeight: MIN_BAR_HEIGHT,
                }}
                animate={{
                  height: computedHeight,
                  backgroundColor: color,
                  boxShadow: glow,
                  scaleX: widthMul * scale,
                  scaleY: scale === 1 ? 1 : 1.02,
                }}
                transition={{
                  height: { duration: 0.25, ease: "easeInOut" },
                  backgroundColor: { duration: 0.15 },
                  boxShadow: { duration: 0.2 },
                  scaleX: { type: "spring", stiffness: 300, damping: 20 },
                  scaleY: { type: "spring", stiffness: 300, damping: 20 },
                }}
              />

              {/* ── Value label (below bar) ────────────────── */}
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

              {/* ── Index label (very bottom) ──────────────── */}
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
