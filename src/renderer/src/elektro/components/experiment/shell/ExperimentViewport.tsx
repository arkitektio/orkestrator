import { Canvas } from "@react-three/fiber";
import { useTabVisible } from "@/core/tabs/TabVisibilityContext";
import { createWebGPURendererFactory } from "@/core/data/scene/gpu/createWebGPURenderer";
import { RendererDisposer } from "@/core/data/scene/gpu/RendererDisposer";
import { AnnotationDrawer } from "../features/annotations/AnnotationDrawer";
import { AnnotationToolbar } from "../features/annotations/AnnotationToolbar";
import { MarkLabelsOverlay } from "../features/events/MarkLabelsOverlay";
import { CenterLodReadout } from "../features/traces/CenterLodReadout";
import { ProbeReadout } from "../features/probe/ProbeReadout";
import { StackLayoutManager } from "../features/stacking/StackLayoutManager";
import { AxisCamera } from "@/core/data/plot/camera/AxisCamera";
import {
  phaseMessage,
  useExperimentScopeStatus,
} from "../platform/stores/experimentScope";
import { useExperimentStoreApi } from "../platform/stores/experimentStore";
import { LoadingBar } from "@/core/data/plot/chrome/LoadingBar";
import { PlotKeyboardShortcuts } from "@/core/data/plot/chrome/PlotKeyboardShortcuts";
import { useViewerStore } from "@/core/data/plot/stores/viewerStore";
import { ExperimentModeControls } from "./chrome/ExperimentModeControls";
import { OverviewStrip } from "@/core/data/plot/chrome/OverviewStrip";
import { RowLabels } from "./chrome/RowLabels";
import { TimeAxis } from "./chrome/TimeAxis";
import { TimeGrid } from "@/core/data/plot/chrome/TimeGrid";
import { ValueAxis } from "@/core/data/plot/chrome/ValueAxis";
import { ZoomBoxOverlay } from "@/core/data/plot/chrome/ZoomBoxOverlay";
import { TimeRangeUrlSync } from "./TimeRangeUrlSync";
import { LayerRenderer } from "./LayerRenderer";

/**
 * The timeline: a WebGPU canvas of traces, and the DOM chrome over it.
 *
 * The canvas uses the SAME renderer factory as mikro's scene
 * (`@/lib/scene/gpu/createWebGPURenderer`), so the WebGL-fallback nulling, the
 * timestamp-pool parking and the drei shim are one copy. `frameloop="demand"`:
 * a timeline at rest draws nothing; every change `invalidate()`s.
 *
 * Layout: the canvas fills everything above a 28px time-axis strip; every overlay
 * that lines up with the canvas uses the same `top-0 bottom-12` box (the time axis and the overview strip take the 48px below), so a row label,
 * the probe line and the drawing surface all agree with the pixels under them.
 *
 * Non-ready phases render a message IN the frame rather than blanking the host page
 * — and "no world" and "no WebGPU" read as what they are, not as load failures.
 */

const rendererFactory = createWebGPURendererFactory({ label: "experiment" });

/**
 * "full" is the page's timeline. "mini" is one embedded in another view (a
 * trace opened inline next to a neuron section): the canvas, rows, probe and
 * axes, but nothing that reaches outside its box — no `?brush=` writes into the
 * HOST page's URL, no window-level keys (the host owns F and Esc), and no mode or
 * annotation chrome a small frame has no room for (drag-to-zoom stays).
 */
export type ExperimentViewportVariant = "full" | "mini";

export const ExperimentViewport = ({ variant = "full" }: { variant?: ExperimentViewportVariant }) => {
  const status = useExperimentScopeStatus();
  if (status.phase !== "ready") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black p-6 text-center">
        <div className="max-w-sm text-sm text-muted-foreground">{phaseMessage(status)}</div>
      </div>
    );
  }
  // Keyed: a different experiment remounts the canvas rather than repopulating it.
  return <ReadyViewport key={status.subjectId} variant={variant} />;
};

export const ExperimentMiniViewport = () => <ExperimentViewport variant="mini" />;

const ReadyViewport = ({ variant }: { variant: ExperimentViewportVariant }) => {
  const full = variant === "full";
  const visible = useTabVisible();
  const rowCount = useViewerStore((s) => s.rowCount);

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-black [-webkit-user-select:none]">
      {/* Headless: layout and URL follow the stores. */}
      <StackLayoutManager />
      {full && <TimeRangeUrlSync />}
      {full && <KeyboardShortcuts />}

      <div className="absolute inset-x-0 top-0 bottom-12">
        <Canvas frameloop={visible ? "demand" : "never"} gl={rendererFactory}>
          <RendererDisposer />
          <AxisCamera />
          <LayerRenderer />
        </Canvas>
      </div>

      {rowCount === 0 && <EmptyNotice />}
      {/* Under everything else: the grid is something to read the labels
          against, never something that sits over them. Both draw nothing while
          their switches are off, so `mini` — which has no HUD to turn them on —
          pays only a null render. */}
      <TimeGrid />
      <ValueAxis />
      <RowLabels />
      <MarkLabelsOverlay />
      <ProbeReadout />
      <ZoomBoxOverlay />
      {full && <AnnotationDrawer />}
      <OverviewStrip />
      {full && <CenterLodReadout />}
      <TimeAxis />
      {full && <ExperimentModeControls />}
      {full && <AnnotationToolbar />}
      <LoadingBar />
    </div>
  );
};

/** Nothing drawable: say so, rather than showing an empty black box. */
const EmptyNotice = () => (
  <div className="pointer-events-none absolute inset-x-0 top-0 bottom-12 flex items-center justify-center">
    <div className="max-w-xs text-center text-xs text-muted-foreground">
      No view in this experiment can be drawn on its timeline. The Views tab says why
      for each one.
    </div>
  </div>
);

/** The plot's keys; hold-A annotates only where there is an experiment to draw on. */
const KeyboardShortcuts = () => {
  const experimentApi = useExperimentStoreApi();
  return <PlotKeyboardShortcuts annotatable={() => experimentApi.getState().annotatable} />;
};
