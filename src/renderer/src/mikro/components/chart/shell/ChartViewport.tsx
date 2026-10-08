import { Canvas } from "@react-three/fiber";
import { AxisCamera } from "@/core/data/plot/camera/AxisCamera";
import { AxisTicks } from "@/core/data/plot/chrome/AxisTicks";
import { LoadingBar } from "@/core/data/plot/chrome/LoadingBar";
import { OverviewStrip } from "@/core/data/plot/chrome/OverviewStrip";
import { PlotKeyboardShortcuts } from "@/core/data/plot/chrome/PlotKeyboardShortcuts";
import { PlotModeControls } from "@/core/data/plot/chrome/PlotModeControls";
import { TimeGrid } from "@/core/data/plot/chrome/TimeGrid";
import { ValueAxis } from "@/core/data/plot/chrome/ValueAxis";
import { ZoomBoxOverlay } from "@/core/data/plot/chrome/ZoomBoxOverlay";
import { PlotLayerRenderer } from "@/core/data/plot/layers/PlotLayerRenderer";
import { StackLayoutManager } from "@/core/data/plot/layout/StackLayoutManager";
import {
  phaseMessageWith,
  usePlotScopeStatus,
  type PhaseWording,
} from "@/core/data/plot/scope/plotScope";
import { useViewerStore, type InteractionModeOption } from "@/core/data/plot/stores/viewerStore";
import { RendererDisposer } from "@/core/data/scene/gpu/RendererDisposer";
import { createWebGPURendererFactory } from "@/core/data/scene/gpu/createWebGPURenderer";
import { useTabVisible } from "@/core/tabs/TabVisibilityContext";
import { ChartAnnotationDrawer } from "../features/annotations/ChartAnnotationDrawer";
import { ChartAnnotationOverlay } from "../features/annotations/ChartAnnotationOverlay";
import { ChartAnnotationToolbar } from "../features/annotations/ChartAnnotationToolbar";
import { useChartAutoscale } from "../platform/edits/useChartAutoscale";
import type { ChartLayerState } from "../platform/model/chartLayerModel";
import { useChartStore } from "../platform/stores/chartStore";
import { rowOf } from "./chartRows";
import { ChartLineLabels } from "./chrome/ChartLineLabels";
import { ChartRowLabels } from "./chrome/ChartRowLabels";
import { LAYER_RENDERERS } from "./layerRegistry";

/**
 * The chart: a WebGPU canvas of lines, and the DOM chrome over it.
 *
 * Everything here but the row legend and the drawn marks is the plot engine's
 * (`@/core/data/plot`) — the camera and its gestures, the axis, the grid, the
 * overview strip, the HUD — the same pieces elektro's experiment timeline is
 * built from, over a chart's stores and registries. The canvas uses the SAME
 * renderer factory as the scene (`createWebGPURenderer`), and
 * `frameloop="demand"`: a chart at rest draws nothing; every change
 * `invalidate()`s.
 *
 * Layout: the canvas fills everything above the axis strip and the overview
 * strip (48px), and every overlay that lines up with it uses the same
 * `top-0 bottom-12` box.
 *
 * Non-ready phases render a message IN the frame rather than blanking the host
 * page — and "no WebGPU" reads as what it is, not as a load failure.
 */

const rendererFactory = createWebGPURendererFactory({ label: "chart" });

export const CHART_PHASE_WORDING: PhaseWording = {
  noSubject: "No chart",
  initializing: "Preparing the chart…",
  noWorld: "This chart has no space to lay its data along.",
  error: "The chart could not be prepared.",
};

export const ChartViewport = () => {
  const status = usePlotScopeStatus();
  if (status.phase !== "ready") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black p-6 text-center">
        <div className="max-w-sm text-sm text-muted-foreground">
          {phaseMessageWith(status, CHART_PHASE_WORDING)}
        </div>
      </div>
    );
  }
  // Keyed: a different chart remounts the canvas rather than repopulating it.
  return <ReadyViewport key={status.subjectId} />;
};

const ALWAYS = () => true;

/** What each mode does, in a chart's words. */
const MODE_OPTIONS: InteractionModeOption[] = [
  {
    value: "EXPLORE",
    label: "Explore",
    description: "Drag a box to zoom into it; shift-drag pans; scroll zooms at the cursor",
  },
  {
    value: "ANNOTATE",
    label: "Annotate",
    description: "Draw marks on the chart (hold A)",
  },
];

const ReadyViewport = () => {
  const visible = useTabVisible();
  const rowCount = useViewerStore((s) => s.rowCount);
  const axis = useChartStore((s) => s.axis);
  const autoscale = useChartAutoscale();

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-black [-webkit-user-select:none]">
      {/* Headless: the row layout follows the stores. */}
      <StackLayoutManager<ChartLayerState> rowOf={rowOf} />
      {/* Hold A to annotate; with no drawing layer yet, the toolbar offers one. */}
      <PlotKeyboardShortcuts annotatable={ALWAYS} />

      <div className="absolute inset-x-0 top-0 bottom-12">
        <Canvas frameloop={visible ? "demand" : "never"} gl={rendererFactory}>
          <RendererDisposer />
          <AxisCamera />
          <PlotLayerRenderer renderers={LAYER_RENDERERS} />
        </Canvas>
      </div>

      {rowCount === 0 && <EmptyNotice />}
      {/* Under everything else: the grid is something to read the labels
          against, never something that sits over them. */}
      <TimeGrid />
      <ValueAxis />
      <ChartRowLabels />
      <ChartLineLabels />
      <ChartAnnotationOverlay />
      <ZoomBoxOverlay />
      <ChartAnnotationDrawer />
      <OverviewStrip />
      <AxisTicks unit={axis.unit} label={axis.name} />
      <PlotModeControls
        annotatable
        onAutoscale={() => autoscale()}
        fitTitle="Fit the whole chart (double-click the plot)"
        modeOptions={MODE_OPTIONS}
      />
      <ChartAnnotationToolbar />
      <LoadingBar />
    </div>
  );
};

/** Nothing drawable: say so, rather than showing an empty black box. */
const EmptyNotice = () => (
  <div className="pointer-events-none absolute inset-x-0 top-0 bottom-12 flex items-center justify-center">
    <div className="max-w-xs text-center text-xs text-muted-foreground">
      Nothing in this chart can be drawn along its axis yet. The Layers tab says why for
      each layer, and adds one.
    </div>
  </div>
);
