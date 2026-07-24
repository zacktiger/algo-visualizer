/**
 * Algorithm picker — grouped selector in the header.
 *
 * @module components/AlgorithmPicker
 */

import { useState, useRef, useEffect } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const filtered = ALGORITHM_REGISTRY.filter(
    (e) => e.meta.category === activeTab,
  );

  /* ── Dismissal + keyboard: close on outside-click / Escape ── */
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    // Move focus into the menu so arrow keys work immediately.
    const first = containerRef.current?.querySelector<HTMLElement>(
      '[role="menuitem"]',
    );
    first?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  /** Roving focus among the algorithm items with the arrow keys. */
  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(
      containerRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ??
        [],
    );
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "ArrowDown"
        ? items[(idx + 1) % items.length]
        : items[(idx - 1 + items.length) % items.length];
    next.focus();
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* ── Trigger button ── */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center gap-2 px-4 py-1.5 rounded-full glass hover:brightness-125 transition text-sm"
      >
        <span className="text-fuchsia-300">⚡</span>
        <span className="text-slate-100 font-medium text-sm">
          {selected ? selected.name : "Select Algorithm"}
        </span>
        <span className={`text-slate-400 text-xs ml-1 transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>
      </button>

      {/* ── Dropdown panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            role="menu"
            aria-label="Algorithms"
            onKeyDown={onMenuKeyDown}
            className="absolute top-full left-0 mt-2 w-72 rounded-2xl glass-panel z-50 overflow-hidden"
          >
            {/* ── Category tabs ── */}
            <div className="flex border-b border-slate-700">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveTab(cat.key)}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                    activeTab === cat.key
                      ? "text-fuchsia-300 border-b-2 border-fuchsia-400"
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
                    role="menuitem"
                    onClick={() => {
                      onSelect(entry.meta);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition group ${
                      isSelected
                        ? "text-fuchsia-200 bg-fuchsia-500/15 ring-1 ring-fuchsia-400/30"
                        : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{entry.meta.name}</span>
                      {isSelected && (
                        <span className="text-fuchsia-300 text-xs">✓</span>
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
