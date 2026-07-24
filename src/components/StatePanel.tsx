/**
 * State panel — shows live algorithm state (pointers, queues, stacks, etc.).
 *
 * Content adapts to the algorithm category.
 *
 * @module components/StatePanel
 */

import { AnimatePresence, motion } from "framer-motion";
import type { Step } from "../algorithms/types";
import { AlgorithmCategory, StepType } from "../algorithms/types";
import { COLORS } from "../constants/colors";
import type { Frontier } from "../utils/frames";

/** Props accepted by {@link StatePanel}. */
export interface StatePanelProps {
  stepType: Step["type"];
  stepPayload: Step["payload"];
  category: typeof AlgorithmCategory.ARRAY | typeof AlgorithmCategory.GRAPH | typeof AlgorithmCategory.DP;
  /** Live queue / stack / priority-queue contents (traversal algorithms). */
  frontier?: Frontier;
}

/* ─── Frontier (queue / stack / priority queue) ──────────────────── */

const FRONTIER_LABEL: Record<Frontier["kind"], string> = {
  queue: "Queue · FIFO",
  stack: "Stack · LIFO",
  pqueue: "Priority Queue · min-dist",
};

/**
 * Renders the traversal's live auxiliary structure as an ordered row of chips.
 * Watching it grow and drain is the core mental model for BFS/DFS/Dijkstra, so
 * the "next out" element is ringed and the pop-end is labelled.
 */
function FrontierView({ frontier }: { frontier: Frontier }) {
  const { kind, items, next } = frontier;
  // Where the next element leaves from: front (left) for a queue/PQ, top
  // (right) for a stack.
  const popSide = kind === "stack" ? "right" : "left";

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-sky-300/70 font-semibold">
          {FRONTIER_LABEL[kind]}
        </span>
        <span className="text-[10px] text-slate-500 font-mono">
          {items.length} item{items.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex items-center gap-1.5 min-h-[2rem]" aria-live="polite">
        {popSide === "left" && items.length > 0 && (
          <span className="text-[9px] text-slate-500 mr-0.5 select-none">next →</span>
        )}
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map((id, i) => {
            const isNext = id === next;
            return (
              <motion.span
                key={`${id}-${i}`}
                layout
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="grid place-items-center rounded-md font-mono text-xs"
                style={{
                  minWidth: 26,
                  height: 26,
                  padding: "0 6px",
                  color: isNext ? "#0b0713" : "#e2e8f0",
                  backgroundColor: isNext ? COLORS.visiting : "rgba(148,163,184,0.14)",
                  border: isNext
                    ? `2px solid ${COLORS.visiting}`
                    : "1px solid rgba(148,163,184,0.25)",
                  fontWeight: isNext ? 700 : 500,
                }}
                title={isNext ? "next to be processed" : undefined}
              >
                {id}
              </motion.span>
            );
          })}
        </AnimatePresence>
        {items.length === 0 && (
          <span className="text-slate-600 text-xs italic">empty</span>
        )}
        {popSide === "right" && items.length > 0 && (
          <span className="text-[9px] text-slate-500 ml-0.5 select-none">← next</span>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-renderers ──────────────────────────────────────────────── */

function ArrayState({
  stepType,
  payload,
}: {
  stepType: Step["type"];
  payload: Step["payload"];
}) {
  const items: Array<{ label: string; value: string; color: string }> = [];

  // Binary search compares a probe (mid) against the target rather than two
  // array positions, so surface those instead of i/j.
  const mid = payload.mid as number | undefined;
  if (stepType === StepType.COMPARE && mid !== undefined) {
    const valMid = payload.valMid as number | undefined;
    const target = payload.target as number | undefined;
    items.push({ label: "mid", value: `${mid} (${valMid ?? "?"})`, color: COLORS.current });
    if (target !== undefined) items.push({ label: "target", value: `${target}`, color: COLORS.comparing });
  } else if (stepType === StepType.COMPARE || stepType === StepType.SWAP) {
    const i = payload.i as number | undefined;
    const j = payload.j as number | undefined;
    const valA = payload.valA as number | undefined;
    const valB = payload.valB as number | undefined;
    if (i !== undefined) items.push({ label: "i", value: `${i} (${valA ?? "?"})`, color: COLORS.comparing });
    if (j !== undefined) items.push({ label: "j", value: `${j} (${valB ?? "?"})`, color: COLORS.comparing });
  }

  // The comparison outcome ("swap" / "keep" / "search right half" …) — the
  // reason the algorithm acts, not just what it touched.
  const result = payload.result as string | undefined;
  if (result && (stepType === StepType.COMPARE || stepType === StepType.SWAP)) {
    items.push({ label: "result", value: result, color: COLORS.pivot });
  }

  if (stepType === StepType.MARK) {
    const idx = payload.index as number | undefined;
    const state = payload.state as string | undefined;
    if (idx !== undefined) items.push({ label: "index", value: `${idx}`, color: state === "sorted" ? COLORS.sorted : COLORS.pivot });
    if (state) items.push({ label: "state", value: state, color: COLORS.visiting });
  }

  return <StateList items={items} />;
}

function GraphState({
  stepType,
  payload,
}: {
  stepType: Step["type"];
  payload: Step["payload"];
}) {
  const items: Array<{ label: string; value: string; color: string }> = [];

  if (stepType === StepType.PUSH || stepType === StepType.POP || stepType === StepType.VISIT) {
    const node = payload.node as string | undefined;
    if (node) items.push({ label: stepType.toLowerCase(), value: node, color: COLORS.visiting });
  }

  if (stepType === StepType.RELAX) {
    const from = payload.from as string | undefined;
    const to = payload.to as string | undefined;
    const oldDist = payload.oldDist as number | undefined;
    const newDist = payload.newDist as number | undefined;
    if (from && to) items.push({ label: "edge", value: `${from} → ${to}`, color: COLORS.comparing });
    if (oldDist !== undefined) items.push({ label: "old dist", value: oldDist === Infinity ? "∞" : `${oldDist}`, color: COLORS.swapping });
    if (newDist !== undefined) items.push({ label: "new dist", value: `${newDist}`, color: COLORS.sorted });
  }

  if (stepType === StepType.MARK) {
    const node = payload.node as string | undefined;
    const state = payload.state as string | undefined;
    if (node) items.push({ label: "node", value: node, color: COLORS.visited });
    if (state) items.push({ label: "state", value: state, color: COLORS.visited });
  }

  return <StateList items={items} />;
}

function DPState({
  stepType,
  payload,
}: {
  stepType: Step["type"];
  payload: Step["payload"];
}) {
  const items: Array<{ label: string; value: string; color: string }> = [];

  if (stepType === StepType.SET_CELL) {
    const row = payload.row as number | undefined;
    const col = payload.col as number | undefined;
    const index = payload.index as number | undefined;
    const value = payload.value as number | undefined;
    const from = payload.from as string | undefined;

    if (row !== undefined && col !== undefined) {
      items.push({ label: "cell", value: `dp[${row}][${col}]`, color: COLORS.comparing });
    } else if (index !== undefined) {
      items.push({ label: "cell", value: `dp[${index}]`, color: COLORS.comparing });
    }
    // Knapsack carries both candidates so the recurrence is legible.
    const skip = payload.skip as number | undefined;
    const take = payload.take as number | undefined;
    const took = payload.took as boolean | undefined;
    if (skip !== undefined && take !== undefined) {
      items.push({ label: "skip", value: `${skip}`, color: took ? COLORS.default : COLORS.sorted });
      items.push({ label: "take", value: `${take}`, color: took ? COLORS.sorted : COLORS.default });
    }
    if (value !== undefined) items.push({ label: "value", value: `${value}`, color: COLORS.current });
    if (from) items.push({ label: "from", value: from, color: COLORS.visiting });
  }

  return <StateList items={items} />;
}

/** Shared animated list component. */
function StateList({
  items,
}: {
  items: Array<{ label: string; value: string; color: string }>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <motion.div
            key={item.label}
            className="flex items-center gap-3 font-mono text-sm"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-slate-500 w-20 text-right">{item.label}</span>
            <span
              className="px-2 py-0.5 rounded text-white text-xs"
              style={{ backgroundColor: item.color }}
            >
              {item.value}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>

      {items.length === 0 && (
        <span className="text-slate-600 text-sm italic">No active state</span>
      )}
    </div>
  );
}

/* ─── Main export ────────────────────────────────────────────────── */

export function StatePanel({ stepType, stepPayload, category, frontier }: StatePanelProps) {
  return (
    <div className="glass-panel rounded-2xl p-4">
      <h3 className="text-xs uppercase tracking-widest text-fuchsia-300/70 mb-3 font-semibold">
        Algorithm State
      </h3>
      {frontier && <FrontierView frontier={frontier} />}
      {category === AlgorithmCategory.ARRAY && (
        <ArrayState stepType={stepType} payload={stepPayload} />
      )}
      {category === AlgorithmCategory.GRAPH && (
        <GraphState stepType={stepType} payload={stepPayload} />
      )}
      {category === AlgorithmCategory.DP && (
        <DPState stepType={stepType} payload={stepPayload} />
      )}
    </div>
  );
}
