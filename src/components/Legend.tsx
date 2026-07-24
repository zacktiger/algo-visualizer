/**
 * Legend — a compact key mapping each visualisation colour to what it means.
 *
 * Canvas state used to be encoded by colour alone, so a learner had to guess
 * what "amber" vs "orange" meant, and colour-blind users couldn't tell states
 * apart at all. The legend is derived from the *steps actually present* in the
 * current run (plus the algorithm category), so it only lists states the user
 * will really see — and pairs every swatch with a text label.
 *
 * @module components/Legend
 */

import { useMemo } from "react";
import type { Step } from "../algorithms/types";
import { AlgorithmCategory, StepType } from "../algorithms/types";
import { COLORS } from "../constants/colors";

/** One legend entry: a colour swatch (optionally a ring) + its meaning. */
interface LegendItem {
  color: string;
  label: string;
  /** Render as an outline ring rather than a filled swatch (e.g. start node). */
  ring?: boolean;
}

export interface LegendProps {
  category: string;
  steps: Step[];
}

/** Summarise which step-types / mark-states occur across the run. */
function scan(steps: Step[]) {
  const types = new Set<string>();
  const markStates = new Set<string>();
  let hasMid = false; // binary-search probe
  let hasArraySetCell = false; // merge-sort placement
  for (const s of steps) {
    types.add(s.type);
    if (s.type === StepType.MARK) {
      const st = s.payload.state as string | undefined;
      if (st) markStates.add(st);
    }
    if (s.type === StepType.COMPARE && s.payload.mid !== undefined) hasMid = true;
    if (s.type === StepType.SET_CELL && s.payload.index !== undefined) hasArraySetCell = true;
  }
  return { types, markStates, hasMid, hasArraySetCell };
}

/** Build the legend entries for the active algorithm. */
function legendFor(category: string, steps: Step[]): LegendItem[] {
  const { types, markStates, hasMid, hasArraySetCell } = scan(steps);
  const items: LegendItem[] = [];

  if (category === AlgorithmCategory.ARRAY) {
    if (hasMid) items.push({ color: COLORS.current, label: "probe (mid)" });
    if (types.has(StepType.COMPARE) && !hasMid)
      items.push({ color: COLORS.comparing, label: "comparing" });
    if (types.has(StepType.SWAP)) items.push({ color: COLORS.swapping, label: "swapping" });
    if (markStates.has("pivot")) items.push({ color: COLORS.pivot, label: "pivot" });
    if (hasArraySetCell) items.push({ color: COLORS.current, label: "placing" });
    items.push({ color: COLORS.sorted, label: "sorted / found" });
    items.push({ color: COLORS.default, label: "unsorted" });
  } else if (category === AlgorithmCategory.GRAPH) {
    if (types.has(StepType.PUSH)) items.push({ color: COLORS.comparing, label: "in frontier" });
    if (types.has(StepType.POP)) items.push({ color: COLORS.current, label: "processing" });
    if (types.has(StepType.VISIT)) items.push({ color: COLORS.visiting, label: "visiting" });
    if (types.has(StepType.RELAX)) items.push({ color: COLORS.comparing, label: "relaxing edge" });
    items.push({ color: COLORS.visited, label: "explored" });
    if (markStates.has("unreachable"))
      items.push({ color: COLORS.swapping, label: "unreachable" });
    items.push({ color: COLORS.sorted, label: "start node", ring: true });
    items.push({ color: COLORS.default, label: "unvisited" });
  } else {
    // DP
    items.push({ color: COLORS.comparing, label: "current cell" });
    items.push({ color: COLORS.visiting, label: "source cell(s)" });
    if (markStates.has("traceback") || markStates.has("result"))
      items.push({ color: COLORS.current, label: "answer path" });
  }

  return items;
}

/**
 * A small horizontal key placed under the visualisation canvas.
 */
export function Legend({ category, steps }: LegendProps) {
  const items = useMemo(() => legendFor(category, steps), [category, steps]);
  if (items.length === 0) return null;

  return (
    <div
      className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 border-t border-white/5"
      role="list"
      aria-label="Colour legend"
    >
      {items.map((it) => (
        <span
          key={it.label}
          role="listitem"
          className="flex items-center gap-1.5 text-[11px] text-slate-300 select-none"
        >
          <span
            aria-hidden
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              flexShrink: 0,
              backgroundColor: it.ring ? "transparent" : it.color,
              border: it.ring
                ? `2px dashed ${it.color}`
                : it.color === COLORS.default
                  ? "1px solid #475569"
                  : "none",
            }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}
