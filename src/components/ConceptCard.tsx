/**
 * Concept card — the "before you watch" pedagogy panel.
 *
 * A study tool should hand the learner the mental model *before* the animation
 * plays: the core idea (what strategy) and the invariant (the property to watch
 * that makes it correct). Both come from {@link AlgorithmMeta}; the card is
 * collapsible (native `<details>`, so it's keyboard- and screen-reader-friendly)
 * and simply hides itself when an algorithm hasn't supplied the fields.
 *
 * @module components/ConceptCard
 */

import type { AlgorithmMeta } from "../algorithms/types";

export interface ConceptCardProps {
  meta: AlgorithmMeta;
}

export function ConceptCard({ meta }: ConceptCardProps) {
  if (!meta.idea && !meta.invariant) return null;

  return (
    <details
      open
      className="glass rounded-2xl px-4 py-3 group"
      // A stable key isn't needed, but resetting `open` per algorithm keeps the
      // card expanded when the learner switches algorithms.
    >
      <summary className="flex items-center gap-2 cursor-pointer select-none list-none">
        <span className="text-xs uppercase tracking-widest text-fuchsia-300/80 font-semibold">
          Concept
        </span>
        <span className="text-slate-500 text-sm">·</span>
        <span className="text-sm text-slate-300 font-medium">{meta.name}</span>
        <span className="ml-auto flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-500">
            {meta.timeComplexity}
          </span>
          <svg
            aria-hidden
            className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>

      <div className="mt-3 flex flex-col gap-2.5 text-sm">
        {meta.idea && (
          <p className="text-slate-200 leading-relaxed">
            <span className="text-fuchsia-300/90 font-semibold">Idea. </span>
            {meta.idea}
          </p>
        )}
        {meta.invariant && (
          <p
            className="text-slate-300 leading-relaxed pl-3"
            style={{ borderLeft: "2px solid rgba(52,211,153,0.5)" }}
          >
            <span className="text-emerald-300/90 font-semibold">Invariant. </span>
            {meta.invariant}
          </p>
        )}
      </div>
    </details>
  );
}
