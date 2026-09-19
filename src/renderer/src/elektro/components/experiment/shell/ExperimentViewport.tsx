import { Canvas } from "@react-three/fiber";
import { useEffect } from "react";
import { useTabVisible } from "@/command/tabs/TabVisibilityContext";
import { isTypingTarget } from "@/lib/input/keyboardTarget";
import { createWebGPURendererFactory } from "@/lib/scene/gpu/createWebGPURenderer";
import { AnnotationDrawer } from "../features/annotations/AnnotationDrawer";
import { AnnotationToolbar } from "../features/annotations/AnnotationToolbar";
import { MarkLabelsOverlay } from "../features/events/MarkLabelsOverlay";
import { CenterLodReadout } from "../features/traces/CenterLodReadout";
import { ProbeReadout } from "../features/probe/ProbeReadout";
import { StackLayoutManager } from "../features/stacking/StackLayoutManager";
import { TimelineCamera } from "../platform/camera/TimelineCamera";
import {
  phaseMessage,
  useExperimentScopeStatus,
} from "../platform/stores/experimentScope";
import { useExperimentStoreApi } from "../platform/stores/experimentStore";
import { panBy, useRangeStoreApi } from "../platform/stores/rangeStore";
import {
  useViewerStore,
  useViewerStoreApi,
  type InteractionMode,
} from "../platform/stores/viewerStore";
import { ExperimentModeControls } from "./chrome/ExperimentModeControls";
import { OverviewStrip } from "./chrome/OverviewStrip";
import { RowLabels } from "./chrome/RowLabels";
import { TimeAxis } from "./chrome/TimeAxis";
import { ZoomBoxOverlay } from "./chrome/ZoomBoxOverlay";
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
  return <ReadyViewport key={status.experimentId} variant={variant} />;
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
          <TimelineCamera />
          <LayerRenderer />
        </Canvas>
      </div>

      {rowCount === 0 && <EmptyNotice />}
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

/** A hairline along the top while any layer is still reading. */
const LoadingBar = () => {
  // A scalar the stats slice maintains — not a scan of every stats write.
  const loading = useViewerStore((s) => s.anyLoading);
  if (!loading) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 animate-pulse bg-primary/70" />
  );
};

/**
 * The timeline's keys — the scene's bindings where the meaning is the same:
 *
 *  - hold **A** — annotate while held; release restores whatever mode was active
 *    (mikro's hold-to-mode, including its two edge cases: a toolbar click during
 *    the hold wins over the restore, and alt-tabbing mid-hold — which never fires
 *    keyup — restores on blur rather than stranding the viewer in ANNOTATE);
 *  - **Esc** — back to explore (unless the annotate drawer consumed it to cancel
 *    a shape in progress);
 *  - in ANNOTATE, the tool keys (`annotationTools.ts`) and Enter / Esc are the
 *    drawer's own — see `AnnotationDrawer`;
 *  - **F** — fit the whole timeline;
 *  - **← / →** — pan by a tenth of the window;
 *  - **⌘/Ctrl-Z**, **⇧⌘/Ctrl-Z** — step the zoom history (box zooms are in it).
 */
const PAN_FRACTION = 0.1;

const KeyboardShortcuts = () => {
  const rangeApi = useRangeStoreApi();
  const viewerApi = useViewerStoreApi();
  const experimentApi = useExperimentStoreApi();

  useEffect(() => {
    let held: { key: string; restore: InteractionMode } | null = null;

    const releaseHold = () => {
      if (!held) return;
      const { restore } = held;
      held = null;
      if (viewerApi.getState().interactionMode === "ANNOTATE") {
        viewerApi.getState().setInteractionMode(restore);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target as HTMLElement | null)) return;
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) rangeApi.getState().redo();
        else rangeApi.getState().undo();
        return;
      }
      // Cmd+A must not flip the viewer into a tool mode.
      if (mod || event.altKey) return;

      const key = event.key.toLowerCase();
      if (key === "a" && !event.repeat && !held && experimentApi.getState().annotatable) {
        held = { key, restore: viewerApi.getState().interactionMode };
        viewerApi.getState().setInteractionMode("ANNOTATE");
        return;
      }
      if (key === "f") rangeApi.getState().fit();
      // A consumed Esc (the annotate drawer cancelling a shape) is not "back to explore".
      if (event.key === "Escape" && !event.defaultPrevented) {
        viewerApi.getState().setInteractionMode("EXPLORE");
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const { liveRange } = rangeApi.getState();
        const delta = (liveRange.end - liveRange.start) * PAN_FRACTION;
        rangeApi
          .getState()
          .setLiveRange(panBy(liveRange, event.key === "ArrowLeft" ? -delta : delta));
      }
    };

    // Keyed off the armed hold, not the event target: focus can move mid-hold.
    const onKeyUp = (event: KeyboardEvent) => {
      if (held && event.key.toLowerCase() === held.key) releaseHold();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseHold);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseHold);
    };
  }, [rangeApi, viewerApi, experimentApi]);

  return null;
};
