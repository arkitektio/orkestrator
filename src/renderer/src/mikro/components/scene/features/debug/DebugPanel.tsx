import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/core/ui/collapsible";
import { ChevronDown, ClipboardCopy, Circle, Square } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import {
  getInitialVolumeTextureBudgetBytes,
  getReportedDeviceMemoryGiB,
  getVolumeBudgetOverrideBytes,
  setVolumeBudgetOverrideMB,
} from "../../platform/quality/lodPlanning";
import {
  qualityGovernor,
  TIER_LABELS,
  type QualityTier,
} from "../../platform/quality/qualityGovernor";
import { perfMonitor, type PerfSessionReport } from "../../platform/perf/perfMonitor";
import { usePerfRecording } from "../../platform/perf/PerfFrameProbe";
import { useModeStore } from "../../platform/stores/modeStore";
import { useViewerStore, useViewerStoreApi } from "../../platform/stores/viewerStore";
import { useViewStoreApi } from "../../platform/stores/viewStore";
import type { DebugBudgetControl, DebugSection } from "./debugSection";

/** The platform's own budget row; features append theirs (`budgets`). */
const VOLUME_BUDGET: DebugBudgetControl = {
  label: "Volume budget (VRAM)",
  title:
    "Total GPU budget for brick atlases. Raises the per-pool slot budget, so the plan may cover more bricks. Auto = navigator.deviceMemory x 0.18. Applies to plans at the next replan and to atlases at the next scene open.",
  get: getVolumeBudgetOverrideBytes,
  setMB: setVolumeBudgetOverrideMB,
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * The debug panel's chrome and the platform's own readouts. Everything
 * feature-specific arrives as `sections` from `shell/debugRegistry.ts`, so this
 * file imports no feature — see `debugSection.ts` for where each slot lands.
 */
export const DebugPanel = ({ sections }: { sections: readonly DebugSection[] }) => {
  const isDebug = useViewerStore((s) => s.debug);
  const renderBudget = useViewerStore((s) => s.renderBudget);
  const displayMode = useModeStore((s) => s.displayMode);
  const viewerStoreApi = useViewerStoreApi();
  const viewStoreApi = useViewStoreApi();
  const [isControlsOpen, setIsControlsOpen] = useState(true);
  const [reportCopied, setReportCopied] = useState(false);
  const recording = usePerfRecording();
  const [lastSession, setLastSession] = useState<PerfSessionReport | null>(null);
  // Budget overrides are read straight off their getters; applying one bumps
  // this so the row re-reads.
  const [, setBudgetVersion] = useState(0);
  // `sections` is the registry's module constant: the hook order is stable.
  const contributions = sections.map((section) => section.useContribution?.() ?? {});
  // Tier/override/streaming flips only — rare (P17-clean).
  useSyncExternalStore(qualityGovernor.subscribe, () => qualityGovernor.getVersion());

  if (!isDebug) return null;

  const selfTests = contributions.flatMap((c) => c.selfTests ?? []);
  const budgets = [VOLUME_BUDGET, ...sections.flatMap((s) => s.budgets ?? [])];

  const togglePerfRecording = () => {
    if (perfMonitor.isRecording()) {
      perfMonitor.stopRecording();
      setLastSession(perfMonitor.buildSessionReport());
    } else {
      setLastSession(null);
      perfMonitor.startRecording();
    }
  };

  /** One paste-able JSON blob covering planner + residency + camera state. */
  const copyDebugReport = () => {
    const viewerState = viewerStoreApi.getState();
    const viewState = viewStoreApi.getState();
    const report: Record<string, unknown> = {
      generatedAt: new Date().toISOString(),
      displayMode,
      currentZ: viewerState.currentZ,
      budgetBytes: getInitialVolumeTextureBudgetBytes(),
      /** Everything the LOD floor and the atlas sizing are derived from. The
       * resolved budget alone cannot distinguish "big machine" from "override
       * set", so the raw deviceMemory rides along. Features add their own
       * budgets (the brick decode cache) into this same object. */
      budget: {
        deviceMemoryGiB: getReportedDeviceMemoryGiB(),
        volumeBudgetBytes: getInitialVolumeTextureBudgetBytes(),
        volumeBudgetOverrideBytes: getVolumeBudgetOverrideBytes(),
      },
      viewportSize: viewState.viewportSize,
      // CSS size alone cannot tell you the fragment count — the quality
      // governor modulates DPR per tier, so `pixels` is the number the
      // raymarch actually pays for, per pass.
      drawingBuffer: viewerState.canvas
        ? {
            width: Math.round(viewerState.canvas.size.width * viewerState.canvas.dpr),
            height: Math.round(viewerState.canvas.size.height * viewerState.canvas.dpr),
            dpr: viewerState.canvas.dpr,
            pixels: Math.round(
              viewerState.canvas.size.width *
                viewerState.canvas.dpr *
                viewerState.canvas.size.height *
                viewerState.canvas.dpr,
            ),
          }
        : null,
      volumeCompositor: viewerState.volumeCompositorReport?.() ?? null,
      fidelity: qualityGovernor.getFidelity(),
      cameraPose: viewState.cameraPose,
      layerViewRanges: viewerState.layerViewRanges,
    };
    // Feature keys (lodBias, volumePasses, plans, brickSystem, fabriks, …).
    for (const contribution of contributions) {
      for (const [key, value] of Object.entries(contribution.report?.() ?? {})) {
        const existing = report[key];
        report[key] =
          isPlainObject(existing) && isPlainObject(value) ? { ...existing, ...value } : value;
      }
    }
    // The opt-in CPU/GPU recording (Start/End report). Null when no session
    // has been captured. This is the "last few seconds" perf window.
    report.perfSession = perfMonitor.buildSessionReport();
    report.quality = {
      tier: TIER_LABELS[qualityGovernor.getTier()],
      autoTier: TIER_LABELS[qualityGovernor.getAutoTier()],
      override:
        qualityGovernor.getOverride() !== null
          ? TIER_LABELS[qualityGovernor.getOverride()!]
          : null,
      emaFrameMs: Number(qualityGovernor.getEmaMs().toFixed(2)),
      streaming: qualityGovernor.isStreaming(),
      settleRefineStage: qualityGovernor.getSettleRefineStage(),
    };
    const json = JSON.stringify(report, null, 2);
    console.log("[octree debug report]", report);
    navigator.clipboard
      .writeText(json)
      .then(() => {
        setReportCopied(true);
        setTimeout(() => setReportCopied(false), 1500);
      })
      .catch(() => {
        /* console.log above is the fallback */
      });
  };

  return (
    <div className="absolute top-16 left-2 z-50 w-64 max-h-[70vh] overflow-y-auto bg-background/80 backdrop-blur-md border border-border/50 text-xs p-2 rounded shadow-lg pointer-events-auto">
      <h3 className="font-bold border-b border-border/50 pb-1 mb-2">Debug: Octree Renderer</h3>
      {renderBudget && (
        <div className="mb-2 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200">
          Render budget exceeded: {(renderBudget.usedBytes / (1024 * 1024)).toFixed(0)} /{" "}
          {(renderBudget.budgetBytes / (1024 * 1024)).toFixed(0)} MB — culled{" "}
          {renderBudget.culledLayerIds.length} layer(s): {renderBudget.culledLayerIds.join(", ")}
        </div>
      )}
      {sections.map(({ Warnings }, i) => (Warnings ? <Warnings key={i} /> : null))}
      <Collapsible open={isControlsOpen} onOpenChange={setIsControlsOpen}>
        <div className="mb-3 rounded border border-border/50 bg-background/40">
          <CollapsibleTrigger asChild>
            <button className="flex w-full items-center gap-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <span>Render Controls</span>
              <ChevronDown className={`ml-auto h-3 w-3 transition-transform ${isControlsOpen ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3 border-t border-border/50 px-2 py-2">
              {/* The budgets that decide which pyramid level is reachable.
                  They are separate physical resources — VRAM and JS heap — and
                  a plane-chunked pyramid is usually blocked on the second. */}
              {budgets.map((control) => {
                const value = control.get();
                return (
                  <div className="space-y-1" key={control.label}>
                    <div
                      className="flex items-center justify-between text-[10px] text-muted-foreground font-medium"
                      title={control.title}
                    >
                      <span>{control.label}</span>
                      <span className="font-mono bg-accent px-1 rounded">
                        {value === null ? "auto" : `${(value / (1024 * 1024)).toFixed(0)} MB`}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {([null, 512, 1024, 2048, 4096] as const).map((mb) => (
                        <button
                          key={mb ?? "auto"}
                          onClick={() => {
                            control.setMB(mb);
                            setBudgetVersion((v) => v + 1);
                          }}
                          className={`flex-1 rounded border px-1 py-0.5 text-[10px] hover:bg-accent ${
                            (mb === null ? null : mb * 1024 * 1024) === value
                              ? "border-primary bg-accent"
                              : "border-border/50"
                          }`}
                        >
                          {mb === null ? "auto" : `${mb >= 1024 ? mb / 1024 + "G" : mb + "M"}`}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {sections.map(({ Controls }, i) => (Controls ? <Controls key={i} /> : null))}
              {/* GPU-adaptive quality tier (P19): learned from frame times,
                  persisted per GPU; the select forces a tier for testing. */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                  <span>Quality</span>
                  <span className="font-mono bg-accent px-1 rounded">
                    {TIER_LABELS[qualityGovernor.getTier()]}
                    {qualityGovernor.getOverride() !== null ? " (forced)" : ""} ·{" "}
                    {qualityGovernor.getEmaMs().toFixed(1)} ms
                  </span>
                </div>
                <div className="flex gap-1">
                  {([null, 0, 1, 2] as const).map((tier) => (
                    <button
                      key={tier === null ? "auto" : tier}
                      className={`flex-1 rounded border px-1 py-0.5 text-[10px] transition-colors ${
                        qualityGovernor.getOverride() === tier
                          ? "border-white/40 bg-white/15 text-white"
                          : "border-border/50 text-muted-foreground hover:bg-white/10"
                      }`}
                      onClick={() => qualityGovernor.setOverride(tier as QualityTier | null)}
                    >
                      {tier === null ? "Auto" : TIER_LABELS[tier as QualityTier]}
                    </button>
                  ))}
                </div>
                {/* Fidelity: how much SETTLED quality the default experience
                    trades for performance. Standard caps settled DPR at 1.5,
                    settled step scale at ≥1.25 and ray steps at 384; High is
                    the full-quality table. Applies at the next settle. */}
                <div className="flex gap-1">
                  {(["standard", "high"] as const).map((mode) => (
                    <button
                      key={mode}
                      title={
                        mode === "standard"
                          ? "Cheaper settled image: DPR ≤ 1.5, coarser ray steps. Applies on the next camera settle."
                          : "Full settled quality (today's pre-fidelity behavior)."
                      }
                      className={`flex-1 rounded border px-1 py-0.5 text-[10px] transition-colors ${
                        qualityGovernor.getFidelity() === mode
                          ? "border-white/40 bg-white/15 text-white"
                          : "border-border/50 text-muted-foreground hover:bg-white/10"
                      }`}
                      onClick={() => qualityGovernor.setFidelity(mode)}
                    >
                      {mode === "standard" ? "Standard fidelity" : "High fidelity"}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="flex w-full items-center justify-center gap-1 rounded border border-border/50 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-white/10 transition-colors"
                onClick={copyDebugReport}
              >
                <ClipboardCopy className="h-3 w-3" />
                {reportCopied ? "Copied!" : "Copy debug report"}
              </button>

              {/* Opt-in CPU/GPU perf recording. Nothing is sampled until Start is
                  pressed; the render hot path pays only a boolean check otherwise. */}
              <button
                className={`flex w-full items-center justify-center gap-1 rounded border px-2 py-1 text-[10px] font-medium transition-colors ${
                  recording
                    ? "border-red-500/60 bg-red-500/15 text-red-200 hover:bg-red-500/25"
                    : "border-border/50 text-muted-foreground hover:bg-white/10"
                }`}
                onClick={togglePerfRecording}
              >
                {recording ? (
                  <>
                    <Square className="h-3 w-3 fill-current" /> End report (recording…)
                  </>
                ) : (
                  <>
                    <Circle className="h-3 w-3 fill-current" /> Start perf report
                  </>
                )}
              </button>

              {lastSession && <PerfSessionSummary report={lastSession} />}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
      {sections.map(({ Body }, i) => (Body ? <Body key={i} selfTests={selfTests} /> : null))}
    </div>
  );
};

/** Compact readout of the most recent perf recording (CPU vs GPU + hot renders). */
const PerfSessionSummary = ({ report }: { report: PerfSessionReport }) => {
  const topRenders = Object.entries(report.renderCounts).slice(0, 4);
  return (
    <div className="space-y-1 rounded border border-border/50 bg-background/40 px-2 py-1.5 text-[9px] text-muted-foreground">
      <div className="flex flex-wrap gap-1">
        <span className="rounded bg-accent px-1">
          {(report.durationMs / 1000).toFixed(1)}s · {report.frameCount}f ·{" "}
          {report.fps.toFixed(0)} fps
        </span>
        {report.truncated && (
          <span className="rounded border border-amber-500/50 px-1 text-amber-300">
            capped
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        <span className="rounded border border-border/50 px-1">
          CPU {report.cpuMs.avg.toFixed(1)}/{report.cpuMs.max.toFixed(0)}ms (avg/max)
        </span>
        {/* The rAF period, kept visibly distinct from CPU: period ≈ 1000/fps by
            definition, so CPU sitting right on top of it means the frame is
            being measured, not explained. */}
        <span className="rounded border border-border/50 px-1">
          period {report.periodMs.avg.toFixed(1)}ms
        </span>
        <span className="rounded border border-border/50 px-1">
          GPU{" "}
          {report.gpuMs
            ? `${report.gpuMs.avg.toFixed(1)}/${report.gpuMs.max.toFixed(0)}ms`
            : "n/a"}
        </span>
        {/* Baseline: 2 (main + tone-map output pass) on a plain or
            cached-composite frame; the volume compositor adds 1 for a volume
            target render and 1 more for the occluder depth prepass → 4 max.
            Above that, something is rasterizing an extra time and the fps
            below is not the real one. */}
        <span
          className={`rounded border px-1 ${
            report.renderCalls.max > 4
              ? "border-amber-500/50 text-amber-300"
              : "border-border/50"
          }`}
        >
          {report.renderCalls.avg.toFixed(1)} render/f
        </span>
        {report.jankFrames > 0 && (
          <span className="rounded border border-red-500/50 px-1 text-red-300">
            {report.jankFrames} jank
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        <span className="rounded border border-border/50 px-1">
          replans {report.replans}
        </span>
        <span className="rounded border border-border/50 px-1">
          vis {report.visibilityRecomputes}
        </span>
        <span className="rounded border border-border/50 px-1">
          probes {report.probes}
        </span>
      </div>
      {topRenders.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {topRenders.map(([name, count]) => (
            <span key={name} className="rounded border border-border/50 px-1">
              {name} ×{count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
