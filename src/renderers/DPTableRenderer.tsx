/**
 * DP table renderer — CSS grid with animated cell entries.
 *
 * Beyond replaying the fill animation, any *already-filled* cell can be
 * interrogated at rest: hovering (or keyboard-focusing) a cell highlights the
 * cell(s) its value was derived from and shows the recurrence, turning the
 * table from a one-shot animation into an explorable object.
 *
 * @module renderers/DPTableRenderer
 */

import { Fragment, useState } from "react";
import { motion } from "framer-motion";
import { COLORS } from "../constants/colors";
import type { Step } from "../algorithms/types";
import { StepType } from "../algorithms/types";
import type { DpCellInfo } from "../utils/frames";

/** Props accepted by {@link DPTableRenderer}. */
export interface DPTableRendererProps {
  /** The 2-D DP table to render. */
  table: number[][];
  stepPayload: Step["payload"];
  stepType: Step["type"];
  /** Per-cell provenance so far, keyed `${row},${col}` — enables hover-inspect. */
  provenance?: Map<string, DpCellInfo>;
}

/** Check if a cell is the currently-active SET_CELL target. */
function isActiveCell(
  row: number,
  col: number,
  stepType: Step["type"],
  payload: Step["payload"],
): boolean {
  if (stepType !== StepType.SET_CELL) return false;
  // 2-D cells carry row/col; 1-D cells carry an index and live on row 0.
  if (payload.row !== undefined) return payload.row === row && payload.col === col;
  return payload.index === col && row === 0;
}

/** Check if a cell fed the active SET_CELL (recurrence provenance). */
function isSourceCell(
  row: number,
  col: number,
  stepType: Step["type"],
  payload: Step["payload"],
): boolean {
  if (stepType !== StepType.SET_CELL) return false;
  const sources = payload.sources as
    | Array<{ row: number; col: number }>
    | undefined;
  if (!sources) return false;
  return sources.some((s) => s.row === row && s.col === col);
}

/** Check if a cell is part of the traceback path. */
function isTracebackCell(
  row: number,
  col: number,
  stepType: Step["type"],
  payload: Step["payload"],
): boolean {
  if (stepType !== StepType.MARK) return false;
  const cells = payload.cells as
    | Array<{ row: number; col: number }>
    | undefined;
  if (!cells) return false;
  return cells.some((c) => c.row === row && c.col === col);
}

/** Get cell background colour. */
function cellBg(
  row: number,
  col: number,
  stepType: Step["type"],
  payload: Step["payload"],
): string {
  if (isActiveCell(row, col, stepType, payload)) return COLORS.comparing;
  if (isSourceCell(row, col, stepType, payload)) return COLORS.visiting;
  if (isTracebackCell(row, col, stepType, payload)) return COLORS.current;
  return COLORS.default;
}

export function DPTableRenderer({
  table,
  stepPayload,
  stepType,
  provenance,
}: DPTableRendererProps) {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);

  if (table.length === 0) return null;

  const cols = table[0].length;

  const hoverKey = hover ? `${hover.r},${hover.c}` : null;
  const hoverInfo = hoverKey ? provenance?.get(hoverKey) : undefined;
  const isHoverSource = (r: number, c: number) =>
    !!hoverInfo?.sources.some((s) => s.row === r && s.col === c);

  return (
    <div className="w-full">
      <div className="overflow-auto max-h-80 w-full">
        <div
          className="inline-grid gap-[1px]"
          style={{
            gridTemplateColumns: `40px repeat(${cols}, minmax(36px, 1fr))`,
          }}
        >
          {/* ── Column headers ── */}
          <div />
          {Array.from({ length: cols }, (_, c) => (
            <div
              key={`ch-${c}`}
              className="text-center text-[10px] text-slate-500 font-mono py-1 select-none"
            >
              {c}
            </div>
          ))}

          {/* ── Rows ── */}
          {table.map((row, r) => (
            <Fragment key={`row-${r}`}>
              {/* Row header */}
              <div
                className="text-right text-[10px] text-slate-500 font-mono pr-2 py-1 select-none flex items-center justify-end"
              >
                {r}
              </div>

              {row.map((val, c) => {
                const key = `${r},${c}`;
                const info = provenance?.get(key);
                const inspectable = !!info;

                // Hover takes over the colouring so the recurrence reads
                // clearly; otherwise fall back to the current step's highlight.
                let bg: string;
                if (hover) {
                  if (hover.r === r && hover.c === c) bg = COLORS.comparing;
                  else if (isHoverSource(r, c)) bg = COLORS.visiting;
                  else bg = COLORS.default;
                } else {
                  bg = cellBg(r, c, stepType, stepPayload);
                }
                const active = isActiveCell(r, c, stepType, stepPayload);
                const isHovered = hover?.r === r && hover?.c === c;

                return (
                  <motion.div
                    key={`${r}-${c}`}
                    className="flex items-center justify-center text-xs font-mono rounded-sm"
                    style={{
                      minHeight: 28,
                      cursor: inspectable ? "help" : "default",
                      outline: isHovered ? "1px solid rgba(255,255,255,0.4)" : "none",
                    }}
                    tabIndex={inspectable ? 0 : undefined}
                    role={inspectable ? "button" : undefined}
                    aria-label={
                      info
                        ? `dp[${r}][${c}] = ${info.value}${info.expr ? `, ${info.expr}` : ""}`
                        : undefined
                    }
                    onMouseEnter={inspectable ? () => setHover({ r, c }) : undefined}
                    onMouseLeave={inspectable ? () => setHover(null) : undefined}
                    onFocus={inspectable ? () => setHover({ r, c }) : undefined}
                    onBlur={inspectable ? () => setHover(null) : undefined}
                    animate={{
                      backgroundColor: bg,
                      scale: active && !hover ? 1.15 : 1,
                      opacity: 1,
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <span className="text-slate-200">
                      {val === 0 ? "—" : val}
                    </span>
                  </motion.div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {/* ── Hover inspector ── */}
      {provenance && (
        <div className="mt-3 pt-2 border-t border-white/5 text-xs font-mono min-h-[1.5rem]">
          {hoverInfo ? (
            <span className="text-slate-200">
              <span style={{ color: COLORS.comparing }}>
                dp[{hover!.r}][{hover!.c}]
              </span>{" "}
              = {hoverInfo.value}
              {hoverInfo.expr && (
                <span className="text-slate-400"> · {hoverInfo.expr}</span>
              )}
              {hoverInfo.sources.length > 0 && (
                <span className="text-slate-500">
                  {"  ← "}
                  {hoverInfo.sources
                    .map((s) => `dp[${s.row}][${s.col}]`)
                    .join(", ")}
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-600 italic">
              Hover or focus a filled cell to see how it was computed.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
