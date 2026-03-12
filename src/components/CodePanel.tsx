/**
 * Code panel — displays algorithm source with glowing highlighted active lines.
 *
 * Uses JetBrains Mono font, pulsing glow animation on active lines,
 * and smooth Framer Motion transitions.
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
      ref={containerRef}
      className="rounded-lg overflow-auto code-mono text-sm leading-7 max-h-72 custom-scrollbar"
      style={{ backgroundColor: "#0F172A" }}
    >
      {codeLines.map((line, idx) => {
        const lineNum = idx + 1;
        const isActive = highlightSet.has(lineNum);

        return (
          <motion.div
            key={lineNum}
            data-line={lineNum}
            className={`flex px-3 relative ${isActive ? "glow-pulse" : ""}`}
            animate={{
              backgroundColor: isActive
                ? "rgba(59,130,246,0.12)"
                : "transparent",
            }}
            transition={{ duration: 0.3 }}
            style={{
              borderLeft: isActive
                ? "3px solid #3B82F6"
                : "3px solid transparent",
            }}
          >
            {/* Active line glow overlay */}
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-r-sm pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  background:
                    "linear-gradient(90deg, rgba(59,130,246,0.08) 0%, transparent 100%)",
                }}
              />
            )}

            {/* Line number */}
            <motion.span
              className="w-8 shrink-0 text-right select-none mr-4"
              animate={{
                color: isActive ? "#60A5FA" : "#475569",
              }}
              transition={{ duration: 0.2 }}
              style={{ fontWeight: isActive ? 600 : 400 }}
            >
              {lineNum}
            </motion.span>

            {/* Code text */}
            <motion.span
              animate={{
                color: isActive ? "#F8FAFC" : "#94A3B8",
                textShadow: isActive
                  ? "0 0 10px rgba(59,130,246,0.3)"
                  : "none",
              }}
              transition={{ duration: 0.25 }}
              style={{ fontWeight: isActive ? 500 : 400, position: "relative", zIndex: 1 }}
            >
              {line}
            </motion.span>
          </motion.div>
        );
      })}
    </div>
  );
}
