/**
 * Playback timeline — frame-based scrubber with step-type coloured markers,
 * transport buttons, speed selector, and keyboard shortcuts.
 *
 * @module components/Timeline
 */

import { useEffect, useCallback } from "react";
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
  /* ── Keyboard shortcuts ── */
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          onStepForward();
          break;
        case "ArrowLeft":
          e.preventDefault();
          onStepBack();
          break;
        case " ":
          e.preventDefault();
          isPlaying ? onPause() : onPlay();
          break;
      }
    },
    [onStepForward, onStepBack, isPlaying, onPause, onPlay],
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
      {/* ── Step-type markers track ── */}
      <div className="relative w-full h-8">
        {/* Background track */}
        <div
          className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[6px] rounded-full"
          style={{ backgroundColor: "#0F172A" }}
        />

        {/* Filled track */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 left-0 h-[6px] rounded-full"
          animate={{ width: `${progressPct}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{
            background: "linear-gradient(90deg, #3B82F6, #60A5FA)",
            boxShadow: "0 0 8px rgba(59,130,246,0.4)",
          }}
        />

        {/* Step type dot markers */}
        {steps && totalSteps > 0 && (
          <div className="absolute inset-0">
            {steps.map((s, i) => {
              // Only render markers for key step types and limit density
              const skip = totalSteps > 100 ? Math.max(1, Math.floor(totalSteps / 80)) : 1;
              if (i % skip !== 0 && i !== currentStep) return null;

              const leftPct = totalSteps > 1
                ? (i / (totalSteps - 1)) * 100
                : 50;
              const markerColor = STEP_COLORS[s.type] ?? "#64748B";
              const isCurrentMarker = i === currentStep;

              return (
                <motion.div
                  key={i}
                  className="absolute top-1/2 -translate-y-1/2 rounded-full cursor-pointer"
                  style={{
                    left: `${leftPct}%`,
                    transform: "translate(-50%, -50%)",
                    backgroundColor: markerColor,
                  }}
                  animate={{
                    width: isCurrentMarker ? 14 : 5,
                    height: isCurrentMarker ? 14 : 5,
                    boxShadow: isCurrentMarker
                      ? `0 0 12px ${markerColor}, 0 0 24px ${markerColor}40`
                      : "none",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  onClick={() => onSeek(i)}
                  title={`Step ${i + 1}: ${s.type}`}
                />
              );
            })}
          </div>
        )}

        {/* Range input overlay for dragging */}
        <input
          type="range"
          min={0}
          max={Math.max(totalSteps - 1, 0)}
          value={currentStep}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ zIndex: 5 }}
        />
      </div>

      {/* ── Step counter + type badge + description ── */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="code-mono">
            Step {currentStep + 1} / {totalSteps}
          </span>
          {currentStepType && (
            <motion.span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold code-mono text-white"
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
        <TransportBtn label="⏮" onClick={() => onSeek(0)} title="First step (Home)" />
        <TransportBtn label="◀" onClick={onStepBack} title="Step back (←)" />

        {isPlaying ? (
          <TransportBtn label="⏸" onClick={onPause} title="Pause (Space)" primary />
        ) : (
          <TransportBtn label="▶" onClick={onPlay} title="Play (Space)" primary />
        )}

        <TransportBtn label="▶" onClick={onStepForward} title="Step forward (→)" />
        <TransportBtn
          label="⏭"
          onClick={() => onSeek(totalSteps - 1)}
          title="Last step (End)"
        />
      </div>

      {/* ── Speed selector ── */}
      <div className="flex items-center justify-center gap-2">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            title={`${s}× speed`}
            className={`px-2.5 py-1 rounded-lg text-xs code-mono transition-all duration-200 ${
              speed === s
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "bg-slate-700/60 text-slate-400 hover:bg-slate-600 hover:text-slate-200"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>

      {/* ── Keyboard hint ── */}
      <div className="flex items-center justify-center gap-3 text-[10px] text-slate-600">
        <span>← → step</span>
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
}: {
  label: string;
  onClick: () => void;
  title: string;
  primary?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      title={title}
      className={`w-9 h-9 flex items-center justify-center rounded-full text-sm transition-colors ${
        primary
          ? "bg-blue-600 text-white hover:bg-blue-500"
          : "bg-slate-700/60 text-slate-300 hover:bg-slate-600"
      }`}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      style={
        primary
          ? { boxShadow: "0 0 12px rgba(59,130,246,0.4)" }
          : undefined
      }
    >
      {label}
    </motion.button>
  );
}
