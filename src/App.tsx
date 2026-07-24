/**
 * App root — fully wired main layout with normal + compare modes.
 *
 * @module App
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { AlgorithmMeta, InputData, Step } from "./algorithms/types";
import { AlgorithmCategory, StepType } from "./algorithms/types";
import { STEP_COLORS } from "./constants/colors";
import { StepEngine } from "./engine/stepEngine";
import { useAlgoStore } from "./engine/store";
import { runGenerator } from "./utils/runAlgorithm";
import { useAlgorithmFrames, EMPTY_FRAME } from "./utils/frames";

import { AlgorithmPicker } from "./components/AlgorithmPicker";
import { InputEditor } from "./components/InputEditor";
import { Legend } from "./components/Legend";
import { CodePanel } from "./components/CodePanel";
import { StatePanel } from "./components/StatePanel";
import { Timeline } from "./components/Timeline";
import { StatsBar } from "./components/StatsBar";
import { CompareMode } from "./components/CompareMode";

import { ArrayRenderer } from "./renderers/ArrayRenderer";
import { GraphRenderer } from "./renderers/GraphRenderer";
import { DPTableRenderer } from "./renderers/DPTableRenderer";

/* ═══════════════════════════════════════════════════════════════════
 * App component
 * ═══════════════════════════════════════════════════════════════════ */

export default function App() {
  /* ── Zustand ── */
  const algorithm = useAlgoStore((s) => s.algorithm);
  const inputData = useAlgoStore((s) => s.inputData);
  const steps = useAlgoStore((s) => s.steps);
  const currentStep = useAlgoStore((s) => s.currentStep);
  const isPlaying = useAlgoStore((s) => s.isPlaying);
  const speed = useAlgoStore((s) => s.speed);

  const setAlgorithm = useAlgoStore((s) => s.setAlgorithm);
  const setInputData = useAlgoStore((s) => s.setInputData);
  const setSteps = useAlgoStore((s) => s.setSteps);
  const setCurrentStep = useAlgoStore((s) => s.setCurrentStep);
  const setIsPlaying = useAlgoStore((s) => s.setIsPlaying);
  const setSpeed = useAlgoStore((s) => s.setSpeed);

  /* ── Precomputed per-step frames (array/graph/dp state + stats) ── */
  const frames = useAlgorithmFrames(steps, inputData, algorithm?.id);
  const frame = frames[currentStep] ?? EMPTY_FRAME;

  /* ── Local state ── */
  const engineRef = useRef<StepEngine | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [showInputEditor, setShowInputEditor] = useState(false);

  /* ── Algorithm selection ── */
  const handleAlgoSelect = useCallback(
    (meta: AlgorithmMeta) => {
      setAlgorithm(meta);
      setShowInputEditor(true);
      setSteps([]);
      setCurrentStep(0);
      setIsPlaying(false);
      engineRef.current?.pause();
      engineRef.current = null;
    },
    [setAlgorithm, setSteps, setCurrentStep, setIsPlaying],
  );

  /* ── Input submission ── */
  const handleInputSubmit = useCallback(
    (input: InputData) => {
      if (!algorithm) return;

      // Binary search operates on (and emits step indices into) a *sorted*
      // array. Store the sorted copy so the rendered bars line up with the
      // low/mid/high highlights instead of pointing at the wrong elements.
      let effectiveInput = input;
      if (algorithm.id === "binary-search" && input.kind === "array") {
        effectiveInput = {
          kind: "array",
          values: [...input.values].sort((a, b) => a - b),
        };
      }

      setInputData(effectiveInput);
      setShowInputEditor(false);

      const generatedSteps = runGenerator(algorithm.id, effectiveInput);
      setSteps(generatedSteps);
      setCurrentStep(0);

      engineRef.current = new StepEngine(generatedSteps);
    },
    [algorithm, setInputData, setSteps, setCurrentStep],
  );

  /* ── Re-run the current algorithm against a tweaked input ── */
  // Used by direct manipulation (pick a search target / start node) so the
  // visualisation updates immediately without reopening the input editor.
  const regenerate = useCallback(
    (nextInput: InputData) => {
      if (!algorithm) return;
      setInputData(nextInput);
      const generatedSteps = runGenerator(algorithm.id, nextInput);
      setSteps(generatedSteps);
      setCurrentStep(0);
      setIsPlaying(false);
      engineRef.current?.pause();
      engineRef.current = new StepEngine(generatedSteps);
    },
    [algorithm, setInputData, setSteps, setCurrentStep, setIsPlaying],
  );

  const onPickTarget = useCallback(
    (value: number) => {
      if (!inputData || inputData.kind !== "array") return;
      if (inputData.target === value) return;
      regenerate({ ...inputData, target: value });
    },
    [inputData, regenerate],
  );

  const onPickStart = useCallback(
    (nodeId: string) => {
      if (!inputData || inputData.kind !== "graph") return;
      if ((inputData.startNode ?? inputData.nodes[0]?.id) === nodeId) return;
      regenerate({ ...inputData, startNode: nodeId });
    },
    [inputData, regenerate],
  );

  /* ── Input-editor modal: Escape to close + focus management ── */
  useEffect(() => {
    if (!showInputEditor) return;
    // Remember what had focus so we can restore it when the modal closes.
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    modalRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowInputEditor(false);
        return;
      }
      // Focus trap: keep Tab cycling within the modal.
      if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (!modalRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      lastFocusedRef.current?.focus?.();
    };
  }, [showInputEditor]);

  /* ── Playback handlers ── */
  const onPlay = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || steps.length <= 1) return;
    // If we're sitting at the end, restart from the beginning on play.
    const from = currentStep >= steps.length - 1 ? 0 : currentStep;
    setCurrentStep(from);
    setIsPlaying(true);
    engine.seek(from);
    engine.play(
      (idx) => setCurrentStep(idx),
      speed,
      () => setIsPlaying(false),
    );
  }, [currentStep, speed, steps.length, setIsPlaying, setCurrentStep]);

  const onPause = useCallback(() => {
    engineRef.current?.pause();
    setIsPlaying(false);
  }, [setIsPlaying]);

  const onSeek = useCallback(
    (n: number) => {
      if (!engineRef.current) return;
      const actual = engineRef.current.seek(n);
      setCurrentStep(actual);
    },
    [setCurrentStep],
  );

  const onStepForward = useCallback(() => {
    if (!engineRef.current) return;
    setCurrentStep(engineRef.current.stepForward());
  }, [setCurrentStep]);

  const onStepBack = useCallback(() => {
    if (!engineRef.current) return;
    setCurrentStep(engineRef.current.stepBack());
  }, [setCurrentStep]);

  const onSpeedChange = useCallback(
    (s: number) => {
      setSpeed(s);
      // Live speed change: restart the timer at the new interval if playing.
      if (isPlaying && engineRef.current) {
        engineRef.current.play(
          (idx) => setCurrentStep(idx),
          s,
          () => setIsPlaying(false),
        );
      }
    },
    [isPlaying, setSpeed, setCurrentStep, setIsPlaying],
  );

  /* ── Current step data ── */
  const currentStepData: Step | null = steps[currentStep] ?? null;
  const category: string = algorithm?.category ?? AlgorithmCategory.ARRAY;

  /* ── Current-frame derived state (precomputed, O(1) lookup) ── */
  const currentArrayValues = frame.array;
  const sortedIndices = frame.sortedIndices;
  const visitedNodes = frame.visitedNodes;
  const dpTable = frame.dpTable;
  const stats = frame.stats;

  return (
    <div className="app-bg min-h-screen text-slate-100">
      {/* content sits above the ::after aurora layer */}
      <div className="relative" style={{ zIndex: 1 }}>
      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 h-14 glass-panel border-x-0 border-t-0 rounded-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl btn-gradient text-lg font-bold shadow-lg">
              ⚡
            </div>
            <h1 className="brand-text text-xl font-bold tracking-tight">
              AlgoViz
            </h1>
          </div>
          <AlgorithmPicker onSelect={handleAlgoSelect} selected={algorithm} />
        </div>
        <div className="flex items-center gap-2">
          {algorithm && inputData && (
            <button
              onClick={() => setShowInputEditor(true)}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium glass text-slate-200 hover:brightness-125 transition"
            >
              Edit Input
            </button>
          )}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsCompareMode((v) => !v)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
              isCompareMode
                ? "btn-gradient"
                : "glass text-fuchsia-200 hover:brightness-125"
            }`}
          >
            {isCompareMode ? "✕ Exit Compare" : "⚔ Compare Mode"}
          </motion.button>
        </div>
      </header>

      {/* ═══════════════ INPUT EDITOR MODAL ═══════════════ */}
      <AnimatePresence>
        {showInputEditor && algorithm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowInputEditor(false)}
          >
            <motion.div
              ref={modalRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={`Configure input for ${algorithm.name}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg mx-4 outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              <InputEditor
                category={algorithm.category}
                algorithmId={algorithm.id}
                onSubmit={handleInputSubmit}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════ MAIN CONTENT ═══════════════ */}
      <main className="p-4 md:p-6">
        {!algorithm && !isCompareMode && (
          <div className="flex flex-col items-center justify-center h-[74vh] text-center">
            <motion.div
              initial={{ scale: 0.7, opacity: 0, rotate: -12 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 12 }}
              className="grid h-24 w-24 place-items-center rounded-3xl btn-gradient text-6xl shadow-2xl mb-8"
            >
              ⚡
            </motion.div>
            <motion.h2
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="brand-text text-4xl md:text-5xl font-bold tracking-tight"
            >
              Watch algorithms come alive
            </motion.h2>
            <motion.p
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.18 }}
              className="mt-4 max-w-md text-slate-400"
            >
              Pick a sorting, searching, graph, or DP algorithm and scrub through
              every step — bars, nodes, and tables react in real time.
            </motion.p>
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.26 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs font-medium"
            >
              {[
                { label: "Arrays", color: "#FBBF24" },
                { label: "Graphs", color: "#38BDF8" },
                { label: "Dynamic Programming", color: "#E879F9" },
              ].map((c) => (
                <span
                  key={c.label}
                  className="glass rounded-full px-4 py-2"
                  style={{ color: c.color }}
                >
                  {c.label}
                </span>
              ))}
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8 text-sm text-slate-500"
            >
              ↑ Start with <span className="text-fuchsia-300">Select Algorithm</span>
            </motion.p>
          </div>
        )}

        {/* ── Compare Mode ── */}
        {isCompareMode && inputData && (
          <CompareMode inputData={inputData} category={category} />
        )}

        {isCompareMode && !inputData && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-600">
            <p className="text-lg">
              Select an algorithm and provide input first, then switch to Compare Mode
            </p>
          </div>
        )}

        {/* ── Normal Mode ── */}
        {!isCompareMode && algorithm && inputData && steps.length > 0 && (
          <div className="flex flex-col gap-4">
            {/* Canvas + Side Panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Visualisation canvas (2/3 width) */}
              <div className="md:col-span-2 glass-panel gradient-ring rounded-3xl p-5">

                {inputData.kind === "array" && (
                  <ArrayRenderer
                    values={currentArrayValues}
                    stepPayload={currentStepData?.payload ?? {}}
                    stepType={currentStepData?.type ?? StepType.DONE}
                    sortedIndices={sortedIndices}
                    onPickValue={
                      algorithm?.id === "binary-search" ? onPickTarget : undefined
                    }
                    targetValue={
                      algorithm?.id === "binary-search"
                        ? inputData.target ??
                          inputData.values[Math.floor(inputData.values.length / 2)]
                        : undefined
                    }
                    searchWindow={
                      algorithm?.id === "binary-search"
                        ? frame.searchRange
                        : undefined
                    }
                  />
                )}
                {inputData.kind === "graph" && (
                  <GraphRenderer
                    nodes={[...inputData.nodes]}
                    edges={[...inputData.edges]}
                    stepPayload={currentStepData?.payload ?? {}}
                    stepType={currentStepData?.type ?? StepType.DONE}
                    visitedNodes={visitedNodes}
                    startNode={inputData.startNode ?? inputData.nodes[0]?.id}
                    onPickStart={onPickStart}
                    distances={frame.distances}
                  />
                )}
                {inputData.kind === "dp" && (
                  <DPTableRenderer
                    table={dpTable}
                    stepPayload={currentStepData?.payload ?? {}}
                    stepType={currentStepData?.type ?? StepType.DONE}
                  />
                )}

                <Legend category={category} steps={steps} />
              </div>

              {/* Side panels (1/3 width) */}
              <div className="flex flex-col gap-4">
                <CodePanel
                  codeLines={algorithm.codeLines}
                  highlightedLines={currentStepData?.highlightedLines ?? []}
                />
                <StatePanel
                  stepType={currentStepData?.type ?? StepType.DONE}
                  stepPayload={currentStepData?.payload ?? {}}
                  category={algorithm.category}
                  frontier={frame.frontier}
                />
              </div>
            </div>

            {/* Step description bar */}
            {currentStepData && (
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass rounded-2xl px-4 py-2.5 text-sm text-slate-200 flex items-center justify-between gap-3"
                style={{
                  borderLeft: `3px solid ${STEP_COLORS[currentStepData.type] ?? '#64748B'}`,
                }}
              >
                <span>{currentStepData.description}</span>
                {currentStepData.type === StepType.DONE && (
                  <span
                    className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{
                      color: "#34D399",
                      backgroundColor: "rgba(52,211,153,0.14)",
                      border: "1px solid rgba(52,211,153,0.35)",
                    }}
                  >
                    ✓ complete
                  </span>
                )}
              </motion.div>
            )}

            {/* Timeline */}
            <Timeline
              totalSteps={steps.length}
              currentStep={currentStep}
              isPlaying={isPlaying}
              speed={speed}
              description={currentStepData?.description ?? ""}
              steps={steps}
              onPlay={onPlay}
              onPause={onPause}
              onStepForward={onStepForward}
              onStepBack={onStepBack}
              onSeek={onSeek}
              onSpeedChange={onSpeedChange}
            />

            {/* Stats Bar */}
            <StatsBar
              comparisons={stats.comparisons}
              swaps={stats.swaps}
              memOps={stats.memOps}
              meta={algorithm}
            />
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
