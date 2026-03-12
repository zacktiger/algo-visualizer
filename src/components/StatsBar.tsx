/**
 * Stats bar — displays running comparisons, swaps, mem-ops,
 * and algorithm complexity in a slim, polished strip.
 *
 * @module components/StatsBar
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { AlgorithmMeta } from "../algorithms/types";

/** Props accepted by {@link StatsBar}. */
export interface StatsBarProps {
  comparisons: number;
  swaps: number;
  memOps: number;
  meta: AlgorithmMeta;
}

/**
 * Animated counter that smoothly counts up from old → new value
 * with a quick scale-up pulse on change.
 */
function AnimatedStat({ label, value }: { label: string; value: number }) {
  const [display, setDisplay] = useState(value);
  const [pulse, setPulse] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = to;
    if (from === to) return;

    setPulse(true);
    const timeout = setTimeout(() => setPulse(false), 250);

    const duration = 300;
    const start = performance.now();

    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(from + (to - from) * t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [value]);

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-slate-500 text-xs">{label}</span>
      <motion.span
        className="text-white font-mono font-bold text-xs"
        animate={{ scale: pulse ? 1.25 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
      >
        {display}
      </motion.span>
    </div>
  );
}

export function StatsBar({ comparisons, swaps, memOps, meta }: StatsBarProps) {
  return (
    <div className="flex items-center justify-between h-9 px-4 rounded-lg bg-slate-900/90 backdrop-blur border-t border-slate-800">
      {/* ── Stats (left) ── */}
      <div className="flex items-center gap-0">
        <div className="pr-4">
          <AnimatedStat label="Comparisons" value={comparisons} />
        </div>
        <div className="border-r border-slate-700 h-4" />
        <div className="px-4">
          <AnimatedStat label="Swaps" value={swaps} />
        </div>
        <div className="border-r border-slate-700 h-4" />
        <div className="pl-4">
          <AnimatedStat label="Mem Ops" value={memOps} />
        </div>
      </div>

      {/* ── Complexity (right) ── */}
      <div className="flex items-center gap-4 text-xs font-mono">
        <span className="text-slate-500">
          Time: <span className="text-green-400">{meta.timeComplexity}</span>
        </span>
        <span className="text-slate-500">
          Space: <span className="text-blue-400">{meta.spaceComplexity}</span>
        </span>
      </div>
    </div>
  );
}
