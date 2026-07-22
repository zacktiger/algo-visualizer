/**
 * Playback timeline — frame-based scrubber with step-type coloured dot markers,
 * transport buttons, speed selector, and keyboard shortcuts.
 *
 * @module components/Timeline
 */

import { useEffect, useCallback, useState } from "react";
import { motion } from "framer-motion";
import type { Step } from "../algorithms/types";
import { STEP_COLORS } from "../constants/colors";

/** Props accepted by {@link Timeline}. */
export interface TimelineProps {
  totalSteps: number;
  currentStep: number;
  isPlaying: boolean;
  speed: number;
  description?: string;
  /** Full step array — used to render step-type markers. */
  steps?: Step[];
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBack: () => void;
  onSeek: (n: number) => void;
  onSpeedChange: (s: number) => void;
}

const SPEEDS = [0.5, 1, 2, 4] as const;

export function Timeline({
  totalSteps,
  currentStep,
  isPlaying,
  speed,
  description,
  steps,
  onPlay,
  onPause,
  onStepForward,
  onStepBack,
  onSeek,
  onSpeedChange,
}: TimelineProps) {
  /* ── Scrubbing state — while true, the thumb/fill track the cursor 1:1
        (no spring easing lagging behind the pointer). ── */
  const [isScrubbing, setIsScrubbing] = useState(false);

  /* ── Keyboard shortcuts ── */
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const lastStep = Math.max(totalSteps - 1, 0);
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          // Shift = coarse jump of 10 steps.
          if (e.shiftKey) onSeek(Math.min(currentStep + 10, lastStep));
          else onStepForward();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (e.shiftKey) onSeek(Math.max(currentStep - 10, 0));
          else onStepBack();
          break;
        case "Home":
          e.preventDefault();
          onSeek(0);
          break;
        case "End":
          e.preventDefault();
          onSeek(lastStep);
          break;
        case " ":
          e.preventDefault();
          if (isPlaying) onPause();
          else onPlay();
          break;
      }
    },
    [onStepForward, onStepBack, onSeek, currentStep, totalSteps, isPlaying, onPause, onPlay],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  /* ── Current step type info ── */
  const currentStepData = steps?.[currentStep];
  const currentStepType = currentStepData?.type ?? "";
  const stepColor = STEP_COLORS[currentStepType] ?? "#64748B";

  /* ── Progress percentage for the filled track ── */
  const progressPct = totalSteps > 1
    ? (currentStep / (totalSteps - 1)) * 100
    : 0;

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ backgroundColor: "#1E293B" }}
    >
      {/* ── Scrubber track ── */}
      <div className="relative w-full h-8 flex items-center">
        {/* Background track */}
        <div className="absolute left-0 right-0 h-1.5 rounded-full bg-slate-700/50" />

        {/* Progress fill */}
        <motion.div
          className="absolute left-0 h-1.5 rounded-full"
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: isScrubbing ? 0 : 0.18, ease: "easeOut" }}
          style={{
            background: "linear-gradient(90deg, #3B82F6, #60A5FA)",
          }}
        />

        {/* Step type dot markers */}
        {steps && totalSteps > 0 && (
          <div className="absolute inset-0">
            {steps.map((s, i) => {
              const skip = totalSteps > 100 ? Math.max(1, Math.floor(totalSteps / 80)) : 1;
              if (i % skip !== 0 && i !== currentStep) return null;

              const leftPct = totalSteps > 1
                ? (i / (totalSteps - 1)) * 100
                : 50;
              const markerColor = STEP_COLORS[s.type] ?? "#64748B";
              const isCurrentMarker = i === currentStep;

              return (
                <div
                  key={i}
                  className="absolute top-1/2 rounded-full cursor-pointer"
                  style={{
                    left: `${leftPct}%`,
                    transform: "translate(-50%, -50%)",
                    width: isCurrentMarker ? 4 : 4,
                    height: isCurrentMarker ? 4 : 4,
                    backgroundColor: markerColor,
                    opacity: isCurrentMarker ? 1 : 0.7,
                  }}
                  onClick={() => onSeek(i)}
                  title={`Step ${i + 1}: ${s.type}`}
                />
              );
            })}
          </div>
        )}

        {/* Thumb */}
        <motion.div
          className="absolute top-1/2 w-4 h-4 rounded-full bg-white z-10 pointer-events-none"
          animate={{ left: `${progressPct}%` }}
          transition={{ duration: isScrubbing ? 0 : 0.18, ease: "easeOut" }}
          style={{
            transform: "translate(-50%, -50%)",
            boxShadow: "0 2px 8px rgba(59,130,246,0.3), 0 0 0 2px rgba(59,130,246,0.15)",
          }}
        />

        {/* Range input overlay for dragging */}
        <input
          type="range"
          min={0}
          max={Math.max(totalSteps - 1, 0)}
          value={currentStep}
          onChange={(e) => onSeek(Number(e.target.value))}
          onPointerDown={() => setIsScrubbing(true)}
          onPointerUp={() => setIsScrubbing(false)}
          onPointerCancel={() => setIsScrubbing(false)}
          onBlur={() => setIsScrubbing(false)}
          aria-label="Timeline scrubber"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ zIndex: 15 }}
        />
      </div>

      {/* ── Step counter + type badge + description ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-400">
            Step {currentStep + 1} / {totalSteps}
          </span>
          {currentStepType && (
            <motion.span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
              animate={{ backgroundColor: stepColor }}
              transition={{ duration: 0.2 }}
            >
              {currentStepType}
            </motion.span>
          )}
        </div>
        {description && (
          <span className="text-slate-500 truncate max-w-[50%] text-right text-[11px]">
            {description}
          </span>
        )}
      </div>

      {/* ── Transport buttons ── */}
      <div className="flex items-center justify-center gap-2">
        <TransportBtn label="⏮" onClick={() => onSeek(0)} title="First step (Home)" isPlaying={false} />
        <TransportBtn label="◀" onClick={onStepBack} title="Step back (←)" isPlaying={false} />

        {isPlaying ? (
          <TransportBtn label="⏸" onClick={onPause} title="Pause (Space)" primary isPlaying={isPlaying} />
        ) : (
          <TransportBtn label="▶" onClick={onPlay} title="Play (Space)" primary isPlaying={isPlaying} />
        )}

        <TransportBtn label="▶" onClick={onStepForward} title="Step forward (→)" isPlaying={false} />
        <TransportBtn
          label="⏭"
          onClick={() => onSeek(totalSteps - 1)}
          title="Last step (End)"
          isPlaying={false}
        />
      </div>

      {/* ── Speed selector ── */}
      <div className="flex items-center justify-center gap-2">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            title={`${s}× speed`}
            className={`px-3 py-1 rounded-full text-xs font-mono transition-all duration-200 ${
              speed === s
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>

      {/* ── Keyboard hint ── */}
      <div className="flex items-center justify-center gap-3 text-[10px] text-slate-600">
        <span>← → step</span>
        <span>⇧← ⇧→ ±10</span>
        <span>Home/End ends</span>
        <span>Space play/pause</span>
      </div>
    </div>
  );
}

/** Small transport button with hover glow. */
function TransportBtn({
  label,
  onClick,
  title,
  primary = false,
  isPlaying = false,
}: {
  label: string;
  onClick: () => void;
  title: string;
  primary?: boolean;
  isPlaying?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`flex items-center justify-center rounded-full text-sm transition-colors ${
        primary
          ? "w-11 h-11 bg-blue-600 text-white hover:bg-blue-500"
          : "w-9 h-9 bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700"
      }`}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      style={
        primary
          ? {
              boxShadow: isPlaying
                ? "0 0 16px rgba(59,130,246,0.5), 0 0 32px rgba(59,130,246,0.2)"
                : "0 0 12px rgba(59,130,246,0.4)",
            }
          : undefined
      }
    >
      {label}
    </motion.button>
  );
}
