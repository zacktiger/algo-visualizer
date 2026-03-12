/**
 * InputEditor — mode-aware input form for array, graph, and DP algorithms.
 *
 * @module components/InputEditor
 */

import { useState, useCallback } from "react";
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

      <button
        onClick={() => onSubmit({ kind: "array", values })}
        className="w-full py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
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

  const addNode = (x: number, y: number) => {
    const id = String(nodes.length + 1);
    setNodes((prev) => [...prev, { id, label: id, x, y }]);
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 600;
    const y = ((e.clientY - rect.top) / rect.height) * 400;
    addNode(x, y);
  };

  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (!edgeFrom) {
      setEdgeFrom(nodeId);
    } else if (edgeFrom !== nodeId) {
      const w = Number(weightInput) || 1;
      setEdges((prev) => [...prev, { from: edgeFrom, to: nodeId, weight: w }]);
      setEdgeFrom(null);
    }
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
        <span>Click canvas to add nodes. Click node→node to add edge.</span>
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
        viewBox="0 0 600 400"
        className="w-full h-56 rounded-lg cursor-crosshair"
        style={{ backgroundColor: "#0F172A" }}
        onClick={handleSvgClick}
      >
        {edges.map((e, i) => {
          const a = nodes.find((n) => n.id === e.from);
          const b = nodes.find((n) => n.id === e.to);
          if (!a || !b) return null;
          return (
            <g key={`e-${i}`}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#475569" strokeWidth={1.5} />
              {e.weight !== undefined && (
                <text
                  x={(a.x + b.x) / 2}
                  y={(a.y + b.y) / 2 - 6}
                  textAnchor="middle"
                  className="text-[10px] fill-slate-400"
                >
                  {e.weight}
                </text>
              )}
            </g>
          );
        })}
        {nodes.map((n) => (
          <g key={n.id} onClick={(e) => handleNodeClick(e, n.id)} className="cursor-pointer">
            <circle
              cx={n.x}
              cy={n.y}
              r={20}
              fill={n.id === edgeFrom ? "#3B82F6" : "#1E293B"}
              stroke="#94A3B8"
              strokeWidth={1.5}
            />
            <text x={n.x} y={n.y + 4} textAnchor="middle" className="text-xs fill-white font-semibold">
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
      const pairs = itemsText.split(",").map((s) => s.trim().split(":"));
      const weights = pairs.map((p) => Number(p[0]));
      const values = pairs.map((p) => Number(p[1] ?? 0));
      return { weights, values };
    };

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
        <button
          onClick={() => {
            const { weights, values } = parseItems();
            onSubmit({ kind: "dp", params: { weights, values, capacity } });
          }}
          className="w-full py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
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
    <div className="rounded-lg p-4" style={{ backgroundColor: "#1E293B" }}>
      <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-3">
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
