/**
 * Stats bar — displays running comparisons, swaps, mem-ops,
 * and algorithm complexity.
 *
 * @module components/StatsBar
 */

import { useEffect, useRef, useState } from "react";
import type { AlgorithmMeta } from "../algorithms/types";

/** Props accepted by {@link StatsBar}. */
export interface StatsBarProps {
  comparisons: number;
  swaps: number;
  memOps: number;
  meta: AlgorithmMeta;
}

/**
 * Animated counter that smoothly counts up from old → new value.
 */
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = to;
    if (from === to) return;

    const duration = 300;
    const start = performance.now();

    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(from + (to - from) * t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span>{display}</span>;
}

/** Single stat chip. */
function Chip({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-mono">
      <span className="text-slate-500">{label}:</span>
      <span className="text-slate-200">
        <AnimatedNumber value={value} />
      </span>
    </div>
  );
}

export function StatsBar({ comparisons, swaps, memOps, meta }: StatsBarProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2 rounded-lg"
      style={{ backgroundColor: "#1E293B" }}
    >
      <div className="flex gap-4">
        <Chip label="Comparisons" value={comparisons} />
        <Chip label="Swaps" value={swaps} />
        <Chip label="Mem Ops" value={memOps} />
      </div>
      <div className="flex gap-4 text-xs font-mono">
        <span className="text-slate-500">
          Time: <span className="text-emerald-400">{meta.timeComplexity}</span>
        </span>
        <span className="text-slate-500">
          Space: <span className="text-sky-400">{meta.spaceComplexity}</span>
        </span>
      </div>
    </div>
  );
}
