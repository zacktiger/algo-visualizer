/**
 * Lightweight confetti burst — mounted when an algorithm reaches DONE, so it
 * fires once on arrival (and again if you scrub away and back).
 *
 * Self-contained (framer-motion only) and reduced-motion aware. Particles are
 * derived deterministically from `seed`, so the component stays pure (no
 * `Math.random` during render, no state, no effects).
 *
 * @module components/Confetti
 */

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

const PALETTE = ["#818cf8", "#e879f9", "#fbbf24", "#34d399", "#38bdf8", "#fb7185"];

interface Particle {
  id: number;
  dx: number;
  dy: number;
  rot: number;
  color: string;
  w: number;
  h: number;
  delay: number;
  duration: number;
  round: boolean;
}

/** Deterministic volley derived from `seed` (pure — no Math.random). */
function makeParticles(seed: number): Particle[] {
  let s = (seed * 2654435761) >>> 0 || 1;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  return Array.from({ length: 90 }, (_, i) => ({
    id: i,
    dx: (rand() - 0.5) * 900,
    dy: 320 + rand() * 380,
    rot: rand() * 900 - 450,
    color: PALETTE[i % PALETTE.length],
    w: 6 + rand() * 8,
    h: 4 + rand() * 8,
    delay: rand() * 0.12,
    duration: 1.6 + rand() * 0.7,
    round: rand() > 0.6,
  }));
}

/** A confetti volley, fired on mount. */
export function Confetti({ seed }: { seed: number }) {
  const reduced = useReducedMotion();
  const particles = useMemo(() => makeParticles(seed), [seed]);

  if (reduced) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.dx, y: p.dy, opacity: 0, rotate: p.rot }}
          transition={{ duration: p.duration, delay: p.delay, ease: [0.2, 0.6, 0.3, 1] }}
          style={{
            position: "absolute",
            left: "50%",
            top: "22%",
            width: p.w,
            height: p.round ? p.w : p.h,
            background: p.color,
            borderRadius: p.round ? "50%" : 2,
            boxShadow: `0 0 8px ${p.color}80`,
          }}
        />
      ))}
    </div>
  );
}
