/**
 * Compare Mode — side-by-side algorithm comparison.
 *
 * Two algorithms of the same category run on identical input,
 * sharing a single timeline. Stats are shown side-by-side with
 * a winner badge when both reach DONE.
 *
 * @module components/CompareMode
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import type { AlgorithmMeta, InputData, Step } from "../algorithms/types";
import { StepType } from "../algorithms/types";
import { ALGORITHM_REGISTRY } from "../algorithms";
import { StepEngine } from "../engine/stepEngine";
import { ArrayRenderer } from "../renderers/ArrayRenderer";
import { GraphRenderer } from "../renderers/GraphRenderer";
import { DPTableRenderer } from "../renderers/DPTableRenderer";
import { Timeline } from "./Timeline";
import { COLORS } from "../constants/colors";
import { runGenerator, buildDpTable } from "../utils/runAlgorithm";

/** Props for {@link CompareMode}. */
export interface CompareModeProps {
  inputData: InputData;
  category: string;
}

/* ─── Stats helper ───────────────────────────────────────────────── */

interface Stats {
  comparisons: number;
  swaps: number;
  memOps: number;
}

function computeStats(steps: Step[], upTo: number): Stats {
  let comparisons = 0;
  let swaps = 0;
  let memOps = 0;
  const bound = Math.min(upTo, steps.length - 1);
  for (let i = 0; i <= bound; i++) {
    switch (steps[i].type) {
      case StepType.COMPARE: comparisons++; break;
      case StepType.SWAP: swaps++; break;
      case StepType.DONE: break;
      default: memOps++; break;
    }
  }
  return { comparisons, swaps, memOps };
}

/* ─── Side-by-side stat chip ─────────────────────────────────────── */

function StatCompare({
  label,
  a,
  b,
}: {
  label: string;
  a: number;
  b: number;
}) {
  const aWins = a < b;
  const bWins = b < a;
  return (
    <div className="flex items-center justify-between text-xs font-mono">
      <span className={aWins ? "text-emerald-400" : "text-slate-400"}>
        {a}
      </span>
      <span className="text-slate-600 px-2">{label}</span>
      <span className={bWins ? "text-emerald-400" : "text-slate-400"}>
        {b}
      </span>
    </div>
  );
}

/* ─── Inline picker for compare mode ─────────────────────────────── */

function InlinePicker({
  category,
  selected,
  onSelect,
  excludeId,
}: {
  category: string;
  selected: AlgorithmMeta | null;
  onSelect: (m: AlgorithmMeta) => void;
  excludeId?: string;
}) {
  const algos = ALGORITHM_REGISTRY.filter(
    (e) => e.meta.category === category && e.meta.id !== excludeId,
  );

  return (
    <select
      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
      value={selected?.id ?? ""}
      onChange={(e) => {
        const entry = algos.find((a) => a.meta.id === e.target.value);
        if (entry) onSelect(entry.meta);
      }}
    >
      <option value="" disabled>
        Select algorithm…
      </option>
      {algos.map((a) => (
        <option key={a.meta.id} value={a.meta.id}>
          {a.meta.name}
        </option>
      ))}
    </select>
  );
}

/* ─── Shared renderer component ──────────────────────────────────── */

function Renderer({
  inputData,
  step,
  steps,
  currentStep,
}: {
  inputData: InputData;
  step: Step | null;
  steps: Step[];
  currentStep: number;
}) {
  const payload = step?.payload ?? {};
  const sType = step?.type ?? StepType.DONE;

  if (inputData.kind === "array") {
    // Replay swaps up to current step to get current array state
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
    return <ArrayRenderer values={arr} stepPayload={payload} stepType={sType} />;
  }

  if (inputData.kind === "graph") {
    return (
      <GraphRenderer
        nodes={[...inputData.nodes]}
        edges={[...inputData.edges]}
        stepPayload={payload}
        stepType={sType}
      />
    );
  }

  // DP — build table up to current step
  const table = buildDpTable(steps, currentStep);
  return <DPTableRenderer table={table} stepPayload={payload} stepType={sType} />;
}

/* ═══════════════════════════════════════════════════════════════════
 * Main CompareMode component
 * ═══════════════════════════════════════════════════════════════════ */

export function CompareMode({ inputData, category }: CompareModeProps) {
  const [algoA, setAlgoA] = useState<AlgorithmMeta | null>(null);
  const [algoB, setAlgoB] = useState<AlgorithmMeta | null>(null);
  const [stepsA, setStepsA] = useState<Step[]>([]);
  const [stepsB, setStepsB] = useState<Step[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const engineRef = useRef<StepEngine | null>(null);

  // Total steps = max of both
  const totalSteps = Math.max(stepsA.length, stepsB.length);

  // Generate steps when algorithms are selected
  const generate = useCallback(
    (meta: AlgorithmMeta, side: "A" | "B") => {
      const steps = runGenerator(meta.id, inputData);
      if (side === "A") {
        setStepsA(steps);
        setAlgoA(meta);
      } else {
        setStepsB(steps);
        setAlgoB(meta);
      }
      setCurrentStep(0);
      setIsPlaying(false);
      engineRef.current?.pause();
    },
    [inputData],
  );

  // Rebuild engine when steps change
  useEffect(() => {
    if (totalSteps === 0) return;
    // Build a dummy steps array of length totalSteps for the engine
    const dummySteps: Step[] = Array.from({ length: totalSteps }, (_, i) => ({
      type: i === totalSteps - 1 ? StepType.DONE : StepType.MARK,
      payload: {},
      highlightedLines: [],
      description: "",
    }));
    engineRef.current = new StepEngine(dummySteps);
  }, [totalSteps]);

  const onPlay = () => {
    if (!engineRef.current) return;
    setIsPlaying(true);
    engineRef.current.seek(currentStep);
    engineRef.current.play((idx) => {
      setCurrentStep(idx);
    }, speed);
  };

  const onPause = () => {
    engineRef.current?.pause();
    setIsPlaying(false);
  };

  const onSeek = (n: number) => {
    engineRef.current?.seek(n);
    setCurrentStep(n);
  };

  const onStepForward = () => {
    if (!engineRef.current) return;
    setCurrentStep(engineRef.current.stepForward());
  };

  const onStepBack = () => {
    if (!engineRef.current) return;
    setCurrentStep(engineRef.current.stepBack());
  };

  const onSpeedChange = (s: number) => {
    setSpeed(s);
    if (isPlaying && engineRef.current) {
      engineRef.current.play((idx) => {
        setCurrentStep(idx);
      }, s);
    }
  };

  // Current step data
  const stepA = stepsA[Math.min(currentStep, stepsA.length - 1)] ?? null;
  const stepB = stepsB[Math.min(currentStep, stepsB.length - 1)] ?? null;
  const statsA = stepsA.length > 0 ? computeStats(stepsA, currentStep) : { comparisons: 0, swaps: 0, memOps: 0 };
  const statsB = stepsB.length > 0 ? computeStats(stepsB, currentStep) : { comparisons: 0, swaps: 0, memOps: 0 };

  // Winner detection
  const bothDone =
    stepsA.length > 0 &&
    stepsB.length > 0 &&
    currentStep >= totalSteps - 1;
  const totalOpsA = statsA.comparisons + statsA.swaps + statsA.memOps;
  const totalOpsB = statsB.comparisons + statsB.swaps + statsB.memOps;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ── Side-by-side pickers + renderers ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Side A */}
        <div className="flex flex-col gap-3">
          <InlinePicker
            category={category}
            selected={algoA}
            onSelect={(m) => generate(m, "A")}
            excludeId={algoB?.id}
          />
          <div className="rounded-lg p-3" style={{ backgroundColor: "#0F172A" }}>
            {stepsA.length > 0 ? (
              <Renderer inputData={inputData} step={stepA} steps={stepsA} currentStep={currentStep} />
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-600 text-sm">
                Select algorithm A
              </div>
            )}
          </div>
          {algoA && (
            <div className="text-xs font-mono text-center text-slate-500">
              {algoA.name} — {algoA.timeComplexity}
            </div>
          )}
        </div>

        {/* Side B */}
        <div className="flex flex-col gap-3">
          <InlinePicker
            category={category}
            selected={algoB}
            onSelect={(m) => generate(m, "B")}
            excludeId={algoA?.id}
          />
          <div className="rounded-lg p-3" style={{ backgroundColor: "#0F172A" }}>
            {stepsB.length > 0 ? (
              <Renderer inputData={inputData} step={stepB} steps={stepsB} currentStep={currentStep} />
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-600 text-sm">
                Select algorithm B
              </div>
            )}
          </div>
          {algoB && (
            <div className="text-xs font-mono text-center text-slate-500">
              {algoB.name} — {algoB.timeComplexity}
            </div>
          )}
        </div>
      </div>

      {/* ── Stats comparison ── */}
      {stepsA.length > 0 && stepsB.length > 0 && (
        <div className="rounded-lg p-4" style={{ backgroundColor: "#1E293B" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-blue-400 font-medium">
              {algoA?.name}
            </span>
            <span className="text-xs text-slate-600 uppercase tracking-wider">
              vs
            </span>
            <span className="text-xs text-purple-400 font-medium">
              {algoB?.name}
            </span>
          </div>
          <div className="space-y-1">
            <StatCompare label="Comparisons" a={statsA.comparisons} b={statsB.comparisons} />
            <StatCompare label="Swaps" a={statsA.swaps} b={statsB.swaps} />
            <StatCompare label="Mem Ops" a={statsA.memOps} b={statsB.memOps} />
            <StatCompare label="Total Ops" a={totalOpsA} b={totalOpsB} />
          </div>

          {/* Winner badge */}
          {bothDone && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 text-center py-2 rounded-lg"
              style={{
                backgroundColor: COLORS.sorted + "20",
                border: `1px solid ${COLORS.sorted}40`,
              }}
            >
              <span className="text-sm font-medium" style={{ color: COLORS.sorted }}>
                🏆{" "}
                {totalOpsA < totalOpsB
                  ? `${algoA?.name} wins!`
                  : totalOpsB < totalOpsA
                    ? `${algoB?.name} wins!`
                    : "It's a tie!"}
                {" "}
                ({Math.min(totalOpsA, totalOpsB)} vs{" "}
                {Math.max(totalOpsA, totalOpsB)} total ops)
              </span>
            </motion.div>
          )}
        </div>
      )}

      {/* ── Shared timeline ── */}
      <Timeline
        totalSteps={totalSteps}
        currentStep={currentStep}
        isPlaying={isPlaying}
        speed={speed}
        description={stepA?.description ?? stepB?.description ?? ""}
        onPlay={onPlay}
        onPause={onPause}
        onStepForward={onStepForward}
        onStepBack={onStepBack}
        onSeek={onSeek}
        onSpeedChange={onSpeedChange}
      />
    </div>
  );
}
