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
import { runGenerator, buildDpTable } from "./utils/runAlgorithm";

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
  const stats = useAlgoStore((s) => s.stats);

  const setAlgorithm = useAlgoStore((s) => s.setAlgorithm);
  const setInputData = useAlgoStore((s) => s.setInputData);
  const setSteps = useAlgoStore((s) => s.setSteps);
  const setCurrentStep = useAlgoStore((s) => s.setCurrentStep);
  const setIsPlaying = useAlgoStore((s) => s.setIsPlaying);
  const setSpeed = useAlgoStore((s) => s.setSpeed);
  const computeStats = useAlgoStore((s) => s.computeStats);
  const resetStats = useAlgoStore((s) => s.resetStats);

  /* ── Local state ── */
  const engineRef = useRef<StepEngine | null>(null);
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
      resetStats();
      engineRef.current?.pause();
      engineRef.current = null;
    },
    [setAlgorithm, setSteps, setCurrentStep, setIsPlaying, resetStats],
  );

  /* ── Input submission ── */
  const handleInputSubmit = useCallback(
    (input: InputData) => {
      if (!algorithm) return;
      setInputData(input);
      setShowInputEditor(false);

      const generatedSteps = runGenerator(algorithm.id, input);
      setSteps(generatedSteps);
      setCurrentStep(0);
      resetStats();

      engineRef.current = new StepEngine(generatedSteps);
    },
    [algorithm, setInputData, setSteps, setCurrentStep, resetStats],
  );

  /* ── Recompute stats on step change ── */
  useEffect(() => {
    if (steps.length > 0) computeStats(currentStep);
  }, [currentStep, steps, computeStats]);

  /* ── Playback handlers ── */
  const onPlay = useCallback(() => {
    if (!engineRef.current) return;
    setIsPlaying(true);
    engineRef.current.seek(currentStep);
    engineRef.current.play((idx) => {
      setCurrentStep(idx);
      if (idx >= steps.length - 1) setIsPlaying(false);
    }, speed);
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
      if (isPlaying && engineRef.current) {
        engineRef.current.play((idx) => {
          setCurrentStep(idx);
          if (idx >= steps.length - 1) setIsPlaying(false);
        }, s);
      }
    },
    [isPlaying, steps.length, setSpeed, setCurrentStep, setIsPlaying],
  );

  /* ── Current step data ── */
  const currentStepData: Step | null = steps[currentStep] ?? null;
  const category: string = algorithm?.category ?? AlgorithmCategory.ARRAY;

  /* ── Build current array state by replaying swaps ── */
  const currentArrayValues = (() => {
    if (!inputData || inputData.kind !== "array") return [];
    const arr = [...inputData.values];
    for (let i = 0; i <= Math.min(currentStep, steps.length - 1); i++) {
      const s = steps[i];
      if (s.type === StepType.SWAP) {
        const si = s.payload.i as number;
        const sj = s.payload.j as number;
        [arr[si], arr[sj]] = [arr[sj], arr[si]];
      }
      if (s.type === StepType.SET_CELL && s.payload.index !== undefined) {
        arr[s.payload.index as number] = s.payload.value as number;
      }
    }
    return arr;
  })();

  /* ── Build DP table by replaying SET_CELL steps ── */
  const dpTable = (() => {
    if (!inputData || inputData.kind !== "dp" || steps.length === 0) return [];
    return buildDpTable(steps, currentStep);
  })();

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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg mx-4"
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
                  />
                )}
                {inputData.kind === "graph" && (
                  <GraphRenderer
                    nodes={[...inputData.nodes]}
                    edges={[...inputData.edges]}
                    stepPayload={currentStepData?.payload ?? {}}
                    stepType={currentStepData?.type ?? StepType.DONE}
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
