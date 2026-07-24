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
  const frames = useAlgorithmFrames(steps, inputData);
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

  /* ── Input-editor modal: Escape to close + focus management ── */
  useEffect(() => {
    if (!showInputEditor) return;
    // Remember what had focus so we can restore it when the modal closes.
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    modalRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowInputEditor(false);
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
    <div
      className="min-h-screen text-slate-200"
      style={{
        backgroundColor: "#020617",
        backgroundImage:
          "radial-gradient(circle, #1e293b 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="flex items-center justify-between px-4 md:px-6 h-12 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/signal.jpg"
              alt="AlgoViz logo"
              className="h-8 w-8 rounded-md object-cover ring-1 ring-slate-700"
            />
            <h1
              className="text-base font-bold tracking-tight"
              style={{ textShadow: '0 0 12px #3B82F6' }}
            >
              AlgoViz
            </h1>
          </div>
          <AlgorithmPicker onSelect={handleAlgoSelect} selected={algorithm} />
        </div>
        <div className="flex items-center gap-2">
          {algorithm && inputData && (
            <button
              onClick={() => setShowInputEditor(true)}
              className="px-3 py-1.5 rounded-md text-xs bg-slate-800 border border-slate-600 text-slate-300 hover:border-slate-400 transition-colors"
            >
              Edit Input
            </button>
          )}
          <button
            onClick={() => setIsCompareMode((v) => !v)}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
              isCompareMode
                ? "bg-purple-600 text-white border border-purple-500"
                : "bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30"
            }`}
          >
            {isCompareMode ? "✕ Exit Compare" : "⚔ Compare Mode"}
          </button>
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
          <div className="flex flex-col items-center justify-center h-[70vh] text-slate-600">
            <span className="text-6xl mb-4">⚡</span>
            <p className="text-lg">Select an algorithm to get started</p>
            <p className="text-sm mt-1 text-slate-700">
              Pick from Arrays, Graphs, or DP categories
            </p>
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
              <div
                className="md:col-span-2 rounded-xl p-4"
                style={{
                  backgroundColor: "#0F172A",
                  boxShadow: 'inset 0 0 80px rgba(0,0,0,0.4)',
                }}
              >
                {inputData.kind === "array" && (
                  <ArrayRenderer
                    values={currentArrayValues}
                    stepPayload={currentStepData?.payload ?? {}}
                    stepType={currentStepData?.type ?? StepType.DONE}
                    sortedIndices={sortedIndices}
                  />
                )}
                {inputData.kind === "graph" && (
                  <GraphRenderer
                    nodes={[...inputData.nodes]}
                    edges={[...inputData.edges]}
                    stepPayload={currentStepData?.payload ?? {}}
                    stepType={currentStepData?.type ?? StepType.DONE}
                    visitedNodes={visitedNodes}
                  />
                )}
                {inputData.kind === "dp" && (
                  <DPTableRenderer
                    table={dpTable}
                    stepPayload={currentStepData?.payload ?? {}}
                    stepType={currentStepData?.type ?? StepType.DONE}
                  />
                )}
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
                />
              </div>
            </div>

            {/* Step description bar */}
            {currentStepData && (
              <div
                className="rounded-lg px-4 py-2 text-sm text-slate-300 backdrop-blur-sm"
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  borderLeft: `3px solid ${STEP_COLORS[currentStepData.type] ?? '#64748B'}`,
                }}
              >
                {currentStepData.description}
              </div>
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
  );
}
