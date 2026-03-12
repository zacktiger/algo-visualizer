/**
 * Algorithm picker — grouped selector in the header.
 *
 * @module components/AlgorithmPicker
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlgorithmCategory } from "../algorithms/types";
import type { AlgorithmMeta } from "../algorithms/types";
import { ALGORITHM_REGISTRY } from "../algorithms";

/** Props accepted by {@link AlgorithmPicker}. */
export interface AlgorithmPickerProps {
  onSelect: (meta: AlgorithmMeta) => void;
  selected: AlgorithmMeta | null;
}

const CATEGORIES = [
  { key: AlgorithmCategory.ARRAY, label: "Arrays" },
  { key: AlgorithmCategory.GRAPH, label: "Graphs" },
  { key: AlgorithmCategory.DP, label: "DP" },
] as const;

export function AlgorithmPicker({ onSelect, selected }: AlgorithmPickerProps) {
  const [activeTab, setActiveTab] = useState<string>(AlgorithmCategory.ARRAY);
  const [isOpen, setIsOpen] = useState(false);

  const filtered = ALGORITHM_REGISTRY.filter(
    (e) => e.meta.category === activeTab,
  );

  return (
    <div className="relative">
      {/* ── Trigger button ── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-slate-800/60 backdrop-blur border border-blue-500/30 hover:bg-slate-700/60 transition-colors text-sm"
      >
        <span className="text-blue-400">⚡</span>
        <span className="text-blue-300 font-mono text-sm">
          {selected ? selected.name : "Select Algorithm"}
        </span>
        <span className="text-slate-500 text-xs ml-1">▼</span>
      </button>

      {/* ── Dropdown panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-72 rounded-xl shadow-2xl z-50 overflow-hidden"
            style={{ backgroundColor: "#1E293B", border: "1px solid #334155" }}
          >
            {/* ── Category tabs ── */}
            <div className="flex border-b border-slate-700">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveTab(cat.key)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    activeTab === cat.key
                      ? "text-blue-400 border-b-2 border-blue-400"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* ── Algorithm list ── */}
            <div className="p-2 max-h-64 overflow-y-auto">
              {filtered.map((entry) => {
                const isSelected = selected?.id === entry.meta.id;
                return (
                  <button
                    key={entry.meta.id}
                    onClick={() => {
                      onSelect(entry.meta);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors group ${
                      isSelected
                        ? "bg-blue-600/20 text-blue-300"
                        : "text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{entry.meta.name}</span>
                      {isSelected && (
                        <span className="text-blue-400 text-xs">✓</span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-400">
                        {entry.meta.timeComplexity}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-900/50 text-sky-400">
                        {entry.meta.spaceComplexity}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
