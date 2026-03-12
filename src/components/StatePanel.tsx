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

/** Props accepted by {@link StatePanel}. */
export interface StatePanelProps {
  stepType: Step["type"];
  stepPayload: Step["payload"];
  category: typeof AlgorithmCategory.ARRAY | typeof AlgorithmCategory.GRAPH | typeof AlgorithmCategory.DP;
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

  if (stepType === StepType.COMPARE || stepType === StepType.SWAP) {
    const i = payload.i as number | undefined;
    const j = payload.j as number | undefined;
    const valA = payload.valA as number | undefined;
    const valB = payload.valB as number | undefined;
    if (i !== undefined) items.push({ label: "i", value: `${i} (${valA ?? "?"})`, color: COLORS.comparing });
    if (j !== undefined) items.push({ label: "j", value: `${j} (${valB ?? "?"})`, color: COLORS.comparing });
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

export function StatePanel({ stepType, stepPayload, category }: StatePanelProps) {
  return (
    <div className="rounded-lg p-4" style={{ backgroundColor: "#1E293B" }}>
      <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-3">
        Algorithm State
      </h3>
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
