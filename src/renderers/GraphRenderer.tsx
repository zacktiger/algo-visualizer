/**
 * Graph renderer — SVG canvas with animated nodes, glow rings,
 * pulse-on-visit effects, and dashed edge animations.
 *
 * @module renderers/GraphRenderer
 */

import { motion } from "framer-motion";
import { COLORS, GLOW } from "../constants/colors";
import type { Node, Edge, Step } from "../algorithms/types";
import { StepType } from "../algorithms/types";

/** Props accepted by {@link GraphRenderer}. */
export interface GraphRendererProps {
  nodes: Node[];
  edges: Edge[];
  stepPayload: Step["payload"];
  stepType: Step["type"];
}

const NODE_R = 24;

/** Determine fill colour for a node. */
function nodeFill(
  nodeId: string,
  stepType: Step["type"],
  payload: Step["payload"],
): string {
  const pNode = payload.node as string | undefined;
  const pState = payload.state as string | undefined;

  if (stepType === StepType.DONE) return COLORS.done;
  if (stepType === StepType.VISIT && pNode === nodeId) return COLORS.visiting;
  if (stepType === StepType.POP && pNode === nodeId) return COLORS.current;
  if (stepType === StepType.PUSH && pNode === nodeId) return COLORS.comparing;
  if (stepType === StepType.MARK && pNode === nodeId) {
    if (pState === "visited" || pState === "settled") return COLORS.visited;
    if (pState === "unreachable") return COLORS.swapping;
  }
  if (stepType === StepType.RELAX) {
    const from = payload.from as string | undefined;
    const to = payload.to as string | undefined;
    if (nodeId === from || nodeId === to) return COLORS.comparing;
  }

  return COLORS.default;
}

/** Get glow colour for a node (for the ring). */
function nodeGlow(
  nodeId: string,
  stepType: Step["type"],
  payload: Step["payload"],
): string | null {
  const pNode = payload.node as string | undefined;

  if (stepType === StepType.VISIT && pNode === nodeId) return GLOW.visiting;
  if (stepType === StepType.POP && pNode === nodeId) return GLOW.current;
  if (stepType === StepType.PUSH && pNode === nodeId) return GLOW.comparing;
  if (stepType === StepType.RELAX) {
    const from = payload.from as string | undefined;
    const to = payload.to as string | undefined;
    if (nodeId === from || nodeId === to) return GLOW.comparing;
  }
  return null;
}

/** Whether a node is actively being operated on (for pulse). */
function isActiveNode(
  nodeId: string,
  stepType: Step["type"],
  payload: Step["payload"],
): boolean {
  const pNode = payload.node as string | undefined;
  if (
    (stepType === StepType.VISIT ||
      stepType === StepType.PUSH ||
      stepType === StepType.POP) &&
    pNode === nodeId
  )
    return true;
  if (stepType === StepType.RELAX) {
    const to = payload.to as string | undefined;
    if (nodeId === to) return true;
  }
  return false;
}

/** Check whether an edge is actively being traversed / relaxed. */
function isActiveEdge(
  edge: Edge,
  stepType: Step["type"],
  payload: Step["payload"],
): boolean {
  if (stepType === StepType.RELAX) {
    return (
      (payload.from === edge.from && payload.to === edge.to) ||
      (payload.from === edge.to && payload.to === edge.from)
    );
  }
  if (stepType === StepType.VISIT || stepType === StepType.PUSH) {
    const node = payload.node as string | undefined;
    const parent = payload.parent as string | undefined;
    if (node && parent) {
      return (
        (edge.from === parent && edge.to === node) ||
        (edge.from === node && edge.to === parent)
      );
    }
  }
  return false;
}

/** Node-id → position lookup. */
function posMap(nodes: Node[]): Map<string, { x: number; y: number }> {
  const m = new Map<string, { x: number; y: number }>();
  for (const n of nodes) m.set(n.id, { x: n.x, y: n.y });
  return m;
}

export function GraphRenderer({
  nodes,
  edges,
  stepPayload,
  stepType,
}: GraphRendererProps) {
  const pos = posMap(nodes);

  return (
    <svg
      viewBox="0 0 600 400"
      className="w-full h-80 rounded-lg"
      style={{ background: "#0F172A" }}
    >
      {/* ── SVG Filters for glow ── */}
      <defs>
        <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
        </filter>
        <filter id="edge-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
        </filter>
      </defs>

      {/* ── Edges ── */}
      {edges.map((e, i) => {
        const a = pos.get(e.from);
        const b = pos.get(e.to);
        if (!a || !b) return null;
        const active = isActiveEdge(e, stepType, stepPayload);

        return (
          <g key={`e-${i}`}>
            {/* Glow line behind active edge */}
            {active && (
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={COLORS.comparing}
                strokeWidth={6}
                filter="url(#edge-glow)"
                opacity={0.4}
              />
            )}

            <motion.line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={active ? COLORS.comparing : "#475569"}
              strokeWidth={active ? 3 : 1.5}
              className={active ? "edge-dash-animate" : ""}
              animate={{
                stroke: active ? COLORS.comparing : "#475569",
                strokeWidth: active ? 3 : 1.5,
              }}
              transition={{ duration: 0.3 }}
            />
            {e.weight !== undefined && (
              <text
                x={(a.x + b.x) / 2}
                y={(a.y + b.y) / 2 - 8}
                textAnchor="middle"
                className="text-[11px] fill-slate-400 select-none"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {e.weight}
              </text>
            )}
          </g>
        );
      })}

      {/* ── Nodes ── */}
      {nodes.map((n) => {
        const fill = nodeFill(n.id, stepType, stepPayload);
        const glow = nodeGlow(n.id, stepType, stepPayload);
        const active = isActiveNode(n.id, stepType, stepPayload);

        return (
          <g key={n.id}>
            {/* Glow ring */}
            {glow && (
              <motion.circle
                cx={n.x}
                cy={n.y}
                r={NODE_R + 6}
                fill="none"
                stroke={fill}
                strokeWidth={2}
                initial={{ opacity: 0, r: NODE_R }}
                animate={{
                  opacity: [0.6, 0.2, 0.6],
                  r: NODE_R + 8,
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                filter="url(#node-glow)"
              />
            )}

            {/* Pulse ring on active */}
            {active && (
              <motion.circle
                cx={n.x}
                cy={n.y}
                fill="none"
                stroke={fill}
                strokeWidth={2}
                initial={{ r: NODE_R, opacity: 0.8 }}
                animate={{ r: NODE_R + 16, opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                key={`pulse-${stepType}-${n.id}`}
              />
            )}

            {/* Main node circle */}
            <motion.circle
              cx={n.x}
              cy={n.y}
              r={NODE_R}
              animate={{
                fill,
                scale: active ? 1.15 : 1,
              }}
              transition={{
                duration: 0.3,
                scale: { type: "spring", stiffness: 400, damping: 15 },
              }}
              stroke="#94A3B8"
              strokeWidth={1.5}
              style={{ transformOrigin: `${n.x}px ${n.y}px` }}
            />

            {/* Node label */}
            <text
              x={n.x}
              y={n.y + 5}
              textAnchor="middle"
              className="text-xs fill-white font-semibold select-none"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {n.label}
            </text>

            {/* Distance label for Dijkstra */}
            {stepType === StepType.RELAX && (
              (() => {
                const newDist = stepPayload.newDist as number | undefined;
                const to = stepPayload.to as string | undefined;
                if (to === n.id && newDist !== undefined) {
                  return (
                    <motion.text
                      x={n.x}
                      y={n.y - NODE_R - 8}
                      textAnchor="middle"
                      className="text-[10px] font-bold select-none"
                      fill={COLORS.sorted}
                      initial={{ opacity: 0, y: n.y - NODE_R }}
                      animate={{ opacity: 1, y: n.y - NODE_R - 8 }}
                      transition={{ duration: 0.3 }}
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      d={newDist}
                    </motion.text>
                  );
                }
                return null;
              })()
            )}
          </g>
        );
      })}
    </svg>
  );
}
