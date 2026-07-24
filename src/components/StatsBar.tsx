/**
 * Stats bar — displays running comparisons, swaps, mem-ops,
 * and algorithm complexity in a slim, polished strip.
 *
 * @module components/StatsBar
 */

import { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
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
  const prev = useRef(value);
  // Imperative animation controls — the pulse is fired via controls.start()
  // (a side-effect, not a setState) so it doesn't trigger a cascading render,
  // and it auto-respects the reduced-motion preference via <MotionConfig>.
  const controls = useAnimationControls();

  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = to;
    if (from === to) return;

    // Quick scale pop to signal the counter changed.
    controls.start({
      scale: [1, 1.25, 1],
      transition: { duration: 0.4, times: [0, 0.3, 1], ease: "easeOut" },
    });

    // Count up old → new over 300ms. setDisplay runs inside rAF (not
    // synchronously in the effect body), so no cascading render.
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
  }, [value, controls]);

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-slate-500 text-xs">{label}</span>
      <motion.span
        className="text-white font-mono font-bold text-xs"
        animate={controls}
      >
        {display}
      </motion.span>
    </div>
  );
}

export function StatsBar({ comparisons, swaps, memOps, meta }: StatsBarProps) {
  return (
    <div className="flex items-center justify-between h-11 px-5 rounded-2xl glass-panel">
      {/* ── Stats (left) ── */}
      <div className="flex items-center gap-0">
        <div className="pr-5">
          <AnimatedStat label="Comparisons" value={comparisons} />
        </div>
        <div className="border-r border-white/10 h-4" />
        <div className="px-5">
          <AnimatedStat label="Swaps" value={swaps} />
        </div>
        <div className="border-r border-white/10 h-4" />
        <div className="pl-5">
          <AnimatedStat label="Mem Ops" value={memOps} />
        </div>
      </div>

      {/* ── Complexity (right) ── */}
      <div className="flex items-center gap-3 text-xs font-mono">
        <span className="glass rounded-full px-3 py-1 text-slate-400">
          Time <span className="text-emerald-300 font-semibold">{meta.timeComplexity}</span>
        </span>
        <span className="glass rounded-full px-3 py-1 text-slate-400">
          Space <span className="text-sky-300 font-semibold">{meta.spaceComplexity}</span>
        </span>
      </div>
    </div>
  );
}
