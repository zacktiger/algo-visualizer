/**
 * Graph renderer — SVG canvas with animated nodes, glow rings,
 * pulse-on-visit effects, and dashed edge animations.
 *
 * @module renderers/GraphRenderer
 */

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { motion } from "framer-motion";
import { COLORS } from "../constants/colors";
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

/** Logical SVG canvas size (matches the viewBox). */
const CANVAS_W = 600;
const CANVAS_H = 400;

/** Build an id → {x,y} position record from node props. */
function seedPositions(nodes: Node[]): Record<string, { x: number; y: number }> {
  const m: Record<string, { x: number; y: number }> = {};
  for (const n of nodes) m[n.id] = { x: n.x, y: n.y };
  return m;
}

/** Clamp a value into `[min, max]`. */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(v, max));
}

export function GraphRenderer({
  nodes,
  edges,
  stepPayload,
  stepType,
}: GraphRendererProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [positions, setPositions] = useState<
    Record<string, { x: number; y: number }>
  >(() => seedPositions(nodes));
  const [dragId, setDragId] = useState<string | null>(null);

  // Re-seed positions when the node set actually changes (new graph / layout),
  // using the "adjust state during render" pattern so a fresh `nodes` array
  // reference on every render doesn't wipe out the user's manual dragging.
  const seedSig = nodes.map((n) => `${n.id}:${n.x}:${n.y}`).join("|");
  const [seenSig, setSeenSig] = useState(seedSig);
  if (seedSig !== seenSig) {
    setSeenSig(seedSig);
    setPositions(seedPositions(nodes));
    setDragId(null);
  }

  /** Current on-canvas coord for a node id (drag override or seed). */
  const coord = (id: string) => positions[id] ?? { x: 0, y: 0 };

  /** Convert a client point to logical SVG coordinates. */
  const toSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((clientY - rect.top) / rect.height) * CANVAS_H,
    };
  };

  const startDrag = (e: ReactPointerEvent, id: string) => {
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    setDragId(id);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragId) return;
    const p = toSvg(e.clientX, e.clientY);
    setPositions((prev) => ({
      ...prev,
      [dragId]: {
        x: clamp(p.x, NODE_R, CANVAS_W - NODE_R),
        y: clamp(p.y, NODE_R, CANVAS_H - NODE_R),
      },
    }));
  };

  const endDrag = (e: ReactPointerEvent) => {
    if (svgRef.current?.hasPointerCapture(e.pointerId)) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
    setDragId(null);
  };

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 600 400"
      className="w-full h-80 rounded-lg"
      style={{ background: "#0F172A", touchAction: "none" }}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
    >
      {/* ── SVG Filters for glow ── */}
      <defs>
        <filter id="edge-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
        </filter>
      </defs>

      {/* ── Edges ── */}
      {edges.map((e, i) => {
        const a = coord(e.from);
        const b = coord(e.to);
        if (!positions[e.from] || !positions[e.to]) return null;
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
        const active = isActiveNode(n.id, stepType, stepPayload);
        const p = coord(n.id);
        const dragging = dragId === n.id;

        return (
          <g
            key={n.id}
            onPointerDown={(e) => startDrag(e, n.id)}
            style={{ cursor: dragging ? "grabbing" : "grab" }}
          >
            {/* Pulse ring on active */}
            {active && (
              <motion.circle
                cx={p.x}
                cy={p.y}
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
              cx={p.x}
              cy={p.y}
              r={NODE_R}
              animate={{
                fill,
                scale: active || dragging ? 1.15 : 1,
              }}
              transition={{
                duration: dragging ? 0 : 0.3,
                scale: { type: "spring", stiffness: 400, damping: 15 },
              }}
              stroke={dragging ? "#E2E8F0" : "#94A3B8"}
              strokeWidth={dragging ? 2.5 : 1.5}
              style={{ transformOrigin: `${p.x}px ${p.y}px` }}
            />

            {/* Node label */}
            <text
              x={p.x}
              y={p.y + 5}
              textAnchor="middle"
              className="text-xs fill-white font-semibold select-none pointer-events-none"
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
                      x={p.x}
                      y={p.y - NODE_R - 8}
                      textAnchor="middle"
                      className="text-[10px] font-bold select-none pointer-events-none"
                      fill={COLORS.sorted}
                      initial={{ opacity: 0, y: p.y - NODE_R }}
                      animate={{ opacity: 1, y: p.y - NODE_R - 8 }}
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

      {/* ── Hint ── */}
      <text
        x={CANVAS_W - 8}
        y={CANVAS_H - 8}
        textAnchor="end"
        className="text-[10px] fill-slate-600 select-none pointer-events-none"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        drag nodes to rearrange
      </text>
    </svg>
  );
}
