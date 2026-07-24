/**
 * InputEditor — mode-aware input form for array, graph, and DP algorithms.
 *
 * @module components/InputEditor
 */

import { useState, useCallback, useRef } from "react";
import { AlgorithmCategory } from "../algorithms/types";
import type { InputData, Node, Edge } from "../algorithms/types";

/** Props accepted by {@link InputEditor}. */
export interface InputEditorProps {
  category: typeof AlgorithmCategory.ARRAY | typeof AlgorithmCategory.GRAPH | typeof AlgorithmCategory.DP;
  /** Currently selected algorithm id — used for DP-mode sub-forms. */
  algorithmId?: string;
  onSubmit: (input: InputData) => void;
}

/* ═══════════════════════════════════════════════════════════════════
 * Array input
 * ═══════════════════════════════════════════════════════════════════ */

function ArrayInputForm({ onSubmit }: { onSubmit: (input: InputData) => void }) {
  const [text, setText] = useState("5, 3, 8, 1, 9, 2, 7, 4, 6");
  const [size, setSize] = useState(10);

  const parse = useCallback(
    (raw: string): number[] =>
      raw
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => !Number.isNaN(n)),
    [],
  );

  const randomize = () => {
    const n = Math.max(5, Math.min(size, 50));
    const vals = Array.from({ length: n }, () => Math.floor(Math.random() * 100) + 1);
    setText(vals.join(", "));
  };

  const values = parse(text);
  const maxVal = Math.max(...values, 1);

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs text-slate-500">Comma-separated values</label>
      <input
        type="text"
        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-blue-500"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="flex items-center gap-3">
        <label className="text-xs text-slate-500 shrink-0">Size: {size}</label>
        <input
          type="range"
          min={5}
          max={50}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="flex-1 accent-blue-500"
        />
        <button
          onClick={randomize}
          className="px-3 py-1 rounded text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
        >
          Randomize
        </button>
      </div>

      {/* Preview mini bars */}
      <div className="flex items-end gap-px h-16">
        {values.slice(0, 50).map((v, i) => (
          <div
            key={i}
            className="bg-blue-500 rounded-t-sm"
            style={{
              flex: "1 1 0",
              minWidth: 3,
              height: `${(v / maxVal) * 100}%`,
            }}
          />
        ))}
      </div>

      {values.length < 2 && (
        <span className="text-[11px] text-amber-400">
          Enter at least 2 comma-separated numbers.
        </span>
      )}

      <button
        onClick={() => onSubmit({ kind: "array", values })}
        disabled={values.length < 2}
        className="w-full py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Submit
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Graph input
 * ═══════════════════════════════════════════════════════════════════ */

function GraphInputForm({ onSubmit }: { onSubmit: (input: InputData) => void }) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [edgeFrom, setEdgeFrom] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState("1");

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  // Tells a plain click (connect edge) apart from a drag (move node).
  const movedRef = useRef(false);

  const toSvg = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rect.width) * 600,
      y: ((clientY - rect.top) / rect.height) * 400,
    };
  };

  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(v, hi));

  const addNode = (x: number, y: number) => {
    // Compute the id from `prev` inside the updater so rapid adds can't clash,
    // and deletions don't cause reuse (max existing numeric id + 1).
    setNodes((prev) => {
      const id = String(
        prev.reduce((m, n) => Math.max(m, Number(n.id) || 0), 0) + 1,
      );
      return [...prev, { id, label: id, x, y }];
    });
  };

  // Clicking empty canvas adds a node; clicks on nodes are handled by the node.
  const onSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.target !== svgRef.current) return;
    const { x, y } = toSvg(e.clientX, e.clientY);
    addNode(x, y);
  };

  const onNodePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    try {
      svgRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    movedRef.current = false;
    setDragId(id);
  };

  const onSvgPointerMove = (e: React.PointerEvent) => {
    if (!dragId) return;
    movedRef.current = true;
    const { x, y } = toSvg(e.clientX, e.clientY);
    setNodes((prev) =>
      prev.map((n) =>
        n.id === dragId
          ? { ...n, x: clamp(x, 20, 580), y: clamp(y, 20, 380) }
          : n,
      ),
    );
  };

  const onSvgPointerUp = (e: React.PointerEvent) => {
    try {
      if (svgRef.current?.hasPointerCapture(e.pointerId)) {
        svgRef.current.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* ignore */
    }
    // A press that didn't move is a click → connect an edge.
    if (dragId && !movedRef.current) connectEdge(dragId);
    setDragId(null);
  };

  const connectEdge = (nodeId: string) => {
    if (!edgeFrom) {
      setEdgeFrom(nodeId);
    } else if (edgeFrom !== nodeId) {
      const w = Number(weightInput) || 1;
      setEdges((prev) => [...prev, { from: edgeFrom, to: nodeId, weight: w }]);
      setEdgeFrom(null);
    } else {
      setEdgeFrom(null); // clicked the same node again → cancel
    }
  };

  const deleteNode = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((ed) => ed.from !== id && ed.to !== id));
    if (edgeFrom === id) setEdgeFrom(null);
  };

  const deleteEdge = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setEdges((prev) => prev.filter((_, i) => i !== index));
  };

  const randomGraph = () => {
    const count = 5 + Math.floor(Math.random() * 4);
    const ns: Node[] = Array.from({ length: count }, (_, i) => ({
      id: String(i + 1),
      label: String(i + 1),
      x: 60 + Math.random() * 480,
      y: 40 + Math.random() * 320,
    }));
    const es: Edge[] = [];
    for (let i = 1; i < count; i++) {
      const from = String(i);
      const to = String(i + 1);
      es.push({ from, to, weight: 1 + Math.floor(Math.random() * 10) });
    }
    // A few extra random edges
    for (let i = 0; i < Math.floor(count / 2); i++) {
      const a = 1 + Math.floor(Math.random() * count);
      const b = 1 + Math.floor(Math.random() * count);
      if (a !== b) {
        es.push({ from: String(a), to: String(b), weight: 1 + Math.floor(Math.random() * 10) });
      }
    }
    setNodes(ns);
    setEdges(es);
    setEdgeFrom(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>
          Click canvas to add · click two nodes to connect · drag to move ·
          right-click to delete.
        </span>
        {edgeFrom && (
          <span className="text-blue-400">
            Connecting from node {edgeFrom}…
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500">Weight:</label>
        <input
          type="number"
          value={weightInput}
          onChange={(e) => setWeightInput(e.target.value)}
          className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
        />
        <button
          onClick={randomGraph}
          className="px-3 py-1 rounded text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
        >
          Random Graph
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 600 400"
        className="w-full h-56 rounded-2xl cursor-crosshair"
        style={{
          background:
            "radial-gradient(120% 120% at 50% 0%, rgba(129,140,248,0.08), rgba(10,7,19,0.5))",
          border: "1px solid rgba(255,255,255,0.08)",
          touchAction: "none",
        }}
        onPointerDown={onSvgPointerDown}
        onPointerMove={onSvgPointerMove}
        onPointerUp={onSvgPointerUp}
        onPointerLeave={onSvgPointerUp}
      >
        {edges.map((e, i) => {
          const a = nodes.find((n) => n.id === e.from);
          const b = nodes.find((n) => n.id === e.to);
          if (!a || !b) return null;
          return (
            <g key={`e-${i}`} onContextMenu={(ev) => deleteEdge(ev, i)}>
              {/* Wide transparent hit area for easier right-click delete. */}
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="transparent"
                strokeWidth={12}
                style={{ cursor: "context-menu" }}
              />
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#475569" strokeWidth={1.5} />
              {e.weight !== undefined && (
                <text
                  x={(a.x + b.x) / 2}
                  y={(a.y + b.y) / 2 - 6}
                  textAnchor="middle"
                  className="text-[10px] fill-slate-400 pointer-events-none"
                >
                  {e.weight}
                </text>
              )}
            </g>
          );
        })}
        {nodes.map((n) => (
          <g
            key={n.id}
            onPointerDown={(e) => onNodePointerDown(e, n.id)}
            onContextMenu={(e) => deleteNode(e, n.id)}
            style={{ cursor: dragId === n.id ? "grabbing" : "grab" }}
          >
            <circle
              cx={n.x}
              cy={n.y}
              r={20}
              fill={n.id === edgeFrom ? "#3B82F6" : "#1E293B"}
              stroke="#94A3B8"
              strokeWidth={1.5}
            />
            <text
              x={n.x}
              y={n.y + 4}
              textAnchor="middle"
              className="text-xs fill-white font-semibold pointer-events-none"
            >
              {n.label}
            </text>
          </g>
        ))}
      </svg>

      <button
        onClick={() => onSubmit({ kind: "graph", nodes, edges })}
        disabled={nodes.length === 0}
        className="w-full py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-40"
      >
        Submit
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * DP input
 * ═══════════════════════════════════════════════════════════════════ */

function DPInputForm({
  algorithmId,
  onSubmit,
}: {
  algorithmId?: string;
  onSubmit: (input: InputData) => void;
}) {
  const [strA, setStrA] = useState("ABCBDAB");
  const [strB, setStrB] = useState("BDCAB");
  const [arrText, setArrText] = useState("10, 22, 9, 33, 21, 50, 41, 60, 80");
  const [itemsText, setItemsText] = useState("2:3, 3:4, 4:5, 5:6");
  const [capacity, setCapacity] = useState(8);

  if (algorithmId === "lcs") {
    return (
      <div className="flex flex-col gap-3">
        <label className="text-xs text-slate-500">String A</label>
        <input
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-blue-500"
          value={strA}
          onChange={(e) => setStrA(e.target.value)}
        />
        <label className="text-xs text-slate-500">String B</label>
        <input
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-blue-500"
          value={strB}
          onChange={(e) => setStrB(e.target.value)}
        />
        <button
          onClick={() => onSubmit({ kind: "dp", params: { a: strA, b: strB } })}
          className="w-full py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
        >
          Submit
        </button>
      </div>
    );
  }

  if (algorithmId === "knapsack") {
    const parseItems = () => {
      const weights: number[] = [];
      const values: number[] = [];
      for (const raw of itemsText.split(",")) {
        const [wStr, vStr] = raw.trim().split(":");
        const w = Number(wStr);
        const v = Number(vStr);
        // Skip malformed / non-numeric pairs so the DP table isn't full of NaN.
        if (!Number.isFinite(w) || !Number.isFinite(v) || w <= 0) continue;
        weights.push(w);
        values.push(v);
      }
      return { weights, values };
    };

    const hasValidItems = parseItems().weights.length > 0;

    return (
      <div className="flex flex-col gap-3">
        <label className="text-xs text-slate-500">Items (weight:value, ...)</label>
        <input
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-blue-500"
          value={itemsText}
          onChange={(e) => setItemsText(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-500 shrink-0">Capacity: {capacity}</label>
          <input
            type="range"
            min={1}
            max={50}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="flex-1 accent-blue-500"
          />
        </div>
        {!hasValidItems && (
          <span className="text-[11px] text-amber-400">
            Enter items as weight:value pairs, e.g. 2:3, 3:4
          </span>
        )}
        <button
          onClick={() => {
            const { weights, values } = parseItems();
            onSubmit({ kind: "dp", params: { weights, values, capacity } });
          }}
          disabled={!hasValidItems}
          className="w-full py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit
        </button>
      </div>
    );
  }

  // LIS (default DP)
  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs text-slate-500">Comma-separated numbers</label>
      <input
        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-blue-500"
        value={arrText}
        onChange={(e) => setArrText(e.target.value)}
      />
      <button
        onClick={() => {
          const values = arrText
            .split(",")
            .map((s) => Number(s.trim()))
            .filter((n) => !Number.isNaN(n));
          onSubmit({ kind: "dp", params: { values } });
        }}
        className="w-full py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
      >
        Submit
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Main export
 * ═══════════════════════════════════════════════════════════════════ */

export function InputEditor({ category, algorithmId, onSubmit }: InputEditorProps) {
  return (
    <div className="glass-panel gradient-ring rounded-3xl p-5">
      <h3 className="text-xs uppercase tracking-widest text-fuchsia-300/70 mb-3 font-semibold">
        Input
      </h3>
      {category === AlgorithmCategory.ARRAY && <ArrayInputForm onSubmit={onSubmit} />}
      {category === AlgorithmCategory.GRAPH && <GraphInputForm onSubmit={onSubmit} />}
      {category === AlgorithmCategory.DP && (
        <DPInputForm algorithmId={algorithmId} onSubmit={onSubmit} />
      )}
    </div>
  );
}
