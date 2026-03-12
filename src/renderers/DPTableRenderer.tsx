/**
 * DP table renderer — CSS grid with animated cell entries.
 *
 * @module renderers/DPTableRenderer
 */

import { motion } from "framer-motion";
import { COLORS } from "../constants/colors";
import type { Step } from "../algorithms/types";
import { StepType } from "../algorithms/types";

/** Props accepted by {@link DPTableRenderer}. */
export interface DPTableRendererProps {
  /** The 2-D DP table to render. */
  table: number[][];
  stepPayload: Step["payload"];
  stepType: Step["type"];
}

/** Check if a cell is the currently-active SET_CELL target. */
function isActiveCell(
  row: number,
  col: number,
  stepType: Step["type"],
  payload: Step["payload"],
): boolean {
  if (stepType !== StepType.SET_CELL) return false;
  return payload.row === row && payload.col === col;
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
  if (isTracebackCell(row, col, stepType, payload)) return COLORS.current;
  return COLORS.default;
}

export function DPTableRenderer({
  table,
  stepPayload,
  stepType,
}: DPTableRendererProps) {
  if (table.length === 0) return null;

  const cols = table[0].length;

  return (
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
          <>
            {/* Row header */}
            <div
              key={`rh-${r}`}
              className="text-right text-[10px] text-slate-500 font-mono pr-2 py-1 select-none flex items-center justify-end"
            >
              {r}
            </div>

            {row.map((val, c) => {
              const bg = cellBg(r, c, stepType, stepPayload);
              const active = isActiveCell(r, c, stepType, stepPayload);

              return (
                <motion.div
                  key={`${r}-${c}`}
                  className="flex items-center justify-center text-xs font-mono rounded-sm"
                  style={{ minHeight: 28 }}
                  animate={{
                    backgroundColor: bg,
                    scale: active ? 1.15 : 1,
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
          </>
        ))}
      </div>
    </div>
  );
}
