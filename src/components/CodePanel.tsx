/**
 * Code panel — displays algorithm source with glowing highlighted active lines,
 * auto-scroll, and scroll-fade overlays.
 *
 * @module components/CodePanel
 */

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

/** Props accepted by {@link CodePanel}. */
export interface CodePanelProps {
  /** Algorithm source code, one string per line. */
  codeLines: string[];
  /** 1-based line numbers currently highlighted. */
  highlightedLines: number[];
}

/** Deep background used by panel & fade overlays. */
const BG = "#0A0F1E";

export function CodePanel({ codeLines, highlightedLines }: CodePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightSet = new Set(highlightedLines);

  // Auto-scroll to first highlighted line
  useEffect(() => {
    if (highlightedLines.length === 0 || !containerRef.current) return;
    const target = containerRef.current.querySelector(
      `[data-line="${highlightedLines[0]}"]`,
    );
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightedLines]);

  return (
    <div
      className="rounded-lg relative"
      style={{
        backgroundColor: BG,
        borderLeft: "2px solid rgba(59,130,246,0.2)",
      }}
    >
      {/* ── Header ── */}
      <div className="px-4 pt-3 pb-1">
        <span className="text-[10px] text-slate-500 uppercase tracking-widest select-none">
          Code
        </span>
      </div>

      {/* ── Scroll fade: top ── */}
      <div
        className="absolute left-0 right-0 h-6 pointer-events-none z-10"
        style={{
          top: 28, // just below header
          background: `linear-gradient(to bottom, ${BG}, transparent)`,
        }}
      />

      {/* ── Code lines ── */}
      <div
        ref={containerRef}
        className="overflow-auto max-h-72 custom-scrollbar px-1 pb-4"
      >
        {codeLines.map((line, idx) => {
          const lineNum = idx + 1;
          const isActive = highlightSet.has(lineNum);

          return (
            <motion.div
              key={lineNum}
              data-line={lineNum}
              className="flex items-center relative"
              animate={{
                backgroundColor: isActive
                  ? "rgba(59,130,246,0.10)"
                  : "transparent",
              }}
              transition={{ duration: 0.3 }}
              style={{
                borderLeft: isActive
                  ? "2px solid #60A5FA"
                  : "2px solid transparent",
                boxShadow: isActive
                  ? "inset 0 0 20px rgba(59,130,246,0.05)"
                  : "none",
                lineHeight: "1.75rem",
              }}
            >
              {/* Active line glow overlay */}
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-r-sm pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(59,130,246,0.08) 0%, transparent 100%)",
                  }}
                />
              )}

              {/* Line number */}
              <span
                className="w-8 shrink-0 text-right pr-2 select-none font-mono text-xs"
                style={{
                  color: isActive ? "#60A5FA" : "#475569",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {lineNum}
              </span>

              {/* Code text */}
              <motion.span
                className="font-mono text-sm relative z-[1] whitespace-pre"
                animate={{
                  color: isActive ? "#FFFFFF" : "#CBD5E1",
                  textShadow: isActive
                    ? "0 0 10px rgba(59,130,246,0.3)"
                    : "none",
                }}
                transition={{ duration: 0.25 }}
                style={{ fontWeight: isActive ? 500 : 400 }}
              >
                {line}
              </motion.span>
            </motion.div>
          );
        })}
      </div>

      {/* ── Scroll fade: bottom ── */}
      <div
        className="absolute left-0 right-0 h-6 pointer-events-none z-10 bottom-0 rounded-b-lg"
        style={{
          background: `linear-gradient(to top, ${BG}, transparent)`,
        }}
      />
    </div>
  );
}
