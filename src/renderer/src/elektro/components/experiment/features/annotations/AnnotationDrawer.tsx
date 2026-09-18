import { useEffect, useRef } from "react";
import { isTypingTarget } from "@/lib/input/keyboardTarget";
import type { LayerState } from "../../platform/model/layerModel";
import { pixelAtTime, timeAtPixel, yAtPixel } from "../../platform/camera/rangeToCamera";
import { rowHitAt } from "../../platform/coords/rowHit";
import {
  isLayerHidden,
  useExperimentStore,
  useExperimentStoreApi,
} from "../../platform/stores/experimentStore";
import { useRangeStoreApi } from "../../platform/stores/rangeStore";
import {
  effectiveClim,
  useViewerStore,
  useViewerStoreApi,
} from "../../platform/stores/viewerStore";
import { hitAnnotation } from "./annotationHit";
import { gesture, toolForShortcut, type Draft, type GestureEvent, type GesturePoint } from "./annotationTools";
import { useAnnotationStore, useAnnotationStoreApi } from "./store/annotationSlice";
import { useAnnotationCommit } from "./useAnnotationCommit";

/**
 * Drawing on the experiment: the scene's annotate tools, on a timeline.
 *
 * Mounted over the canvas only in ANNOTATE mode; in EXPLORE it renders nothing
 * and the camera owns the pointer. The active tool (`annotationSlice`) decides
 * what a gesture does — the pure machine in `annotationTools.ts` — and
 * `useAnnotationCommit` writes what it finishes:
 *
 *  - SELECT: a click selects the mark under it (shift adds), empty space clears.
 *  - EVENT / EVENTS / EPOCH: time shapes across every row, in world time.
 *  - LINE / PATH / POLYGON: shapes over one trace row, in its (time, value).
 *
 * Every pointer event is resolved here to world time, world y and the trace row
 * under it — the machine never sees a pixel it has to interpret.
 *
 * Keys while mounted: the tool shortcuts, Enter (finish), Esc (cancel a shape;
 * with none in progress Esc falls through to the viewport's "back to explore").
 */
export const AnnotationDrawer = () => {
  const mode = useViewerStore((s) => s.interactionMode);
  const annotatable = useExperimentStore((s) => s.annotatable);
  if (mode !== "ANNOTATE" || !annotatable) return null;
  return <DrawSurface />;
};

/** Trace layers that can take a row shape, in draw order. */
const traceRowCandidates = (layers: readonly Pick<LayerState, "id" | "kind" | "visible">[]) =>
  layers.filter((l) => l.kind === "trace" && !isLayerHidden(l)).map((l) => l.id);

const DrawSurface = () => {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const rangeApi = useRangeStoreApi();
  const experimentApi = useExperimentStoreApi();
  const viewerApi = useViewerStoreApi();
  const annotationApi = useAnnotationStoreApi();
  const tool = useAnnotationStore((s) => s.annotateTool);
  const commit = useAnnotationCommit();

  /** Feed one event through the machine; write the draft, send any commit. */
  const dispatch = (event: GestureEvent) => {
    const state = annotationApi.getState();
    const result = gesture(state.annotateTool, state.draft, event);
    state.setDraft(result.draft);
    if (result.commit) commit(result.commit);
  };
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const pointAt = (clientX: number, clientY: number): GesturePoint | null => {
    const el = surfaceRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const viewer = viewerApi.getState();
    const y = yAtPixel(py, rect.height, viewer.rowCount);
    const hit = rowHitAt(
      y,
      viewer.bands,
      (band) => effectiveClim(viewer.clims, band),
      traceRowCandidates(experimentApi.getState().layers),
    );
    return {
      time: timeAtPixel(px, rect.width, rangeApi.getState().liveRange),
      y,
      px,
      py,
      row: hit ? { layerId: hit.layerId, channel: hit.channel } : null,
    };
  };

  const select = (event: React.PointerEvent) => {
    const el = surfaceRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const viewer = viewerApi.getState();
    const annotations = annotationApi.getState();
    const visible = experimentApi
      .getState()
      .layers.filter((l) => l.kind === "annotation" && !isLayerHidden(l))
      .map((l) => l.id);
    const id = hitAnnotation(
      annotations.annotationMarks,
      visible,
      event.clientX - rect.left,
      event.clientY - rect.top,
      {
        window: rangeApi.getState().liveRange,
        widthPx: rect.width,
        heightPx: rect.height,
        rowCount: viewer.rowCount,
        bands: viewer.bands,
        climOf: (band) => effectiveClim(viewer.clims, band as (typeof viewer.bands)[string]),
      },
    );
    if (id) annotations.selectAnnotation(id, event.shiftKey);
    else if (!event.shiftKey) annotations.clearSelection();
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    if (tool === "SELECT") {
      select(event);
      return;
    }
    const point = pointAt(event.clientX, event.clientY);
    if (!point) return;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    dispatch({ type: "down", point });
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (tool === "SELECT" || !annotationApi.getState().draft) return;
    const point = pointAt(event.clientX, event.clientY);
    if (point) dispatch({ type: "move", point });
  };

  const onPointerUp = (event: React.PointerEvent) => {
    if (tool === "SELECT") return;
    const point = pointAt(event.clientX, event.clientY);
    if (point) dispatch({ type: "up", point });
  };

  // Keys: capture phase, so a consumed Esc never reaches the viewport's own
  // "Esc → explore" (which checks `defaultPrevented`).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target as HTMLElement | null)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const state = annotationApi.getState();
      if (event.key === "Escape" && state.draft) {
        event.preventDefault();
        dispatchRef.current({ type: "cancel" });
        return;
      }
      if (event.key === "Enter" && state.draft) {
        event.preventDefault();
        dispatchRef.current({ type: "finish" });
        return;
      }
      const next = event.repeat ? null : toolForShortcut(event.key);
      if (next) {
        event.preventDefault();
        state.setAnnotateTool(next);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      // Leaving ANNOTATE abandons a half-drawn shape; the selection stays.
      annotationApi.getState().setDraft(null);
    };
  }, [annotationApi]);

  return (
    <div
      ref={surfaceRef}
      className={
        "absolute inset-x-0 top-0 bottom-12 z-10 " +
        (tool === "SELECT" ? "cursor-default" : "cursor-crosshair")
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => dispatch({ type: "cancel" })}
    >
      <DraftPreview surfaceRef={surfaceRef} />
    </div>
  );
};

/**
 * The in-progress shape, drawn as SVG over the canvas.
 *
 * The draft moves at pointer rate, so this never re-renders from it: a vanilla
 * subscription to the draft, the live window and the layout rewrites two
 * elements' attributes (P17). Vertices are held in world time and world y, so
 * panning mid-shape keeps them glued to the data.
 */
const DraftPreview = ({ surfaceRef }: { surfaceRef: React.RefObject<HTMLDivElement | null> }) => {
  const pathRef = useRef<SVGPathElement | null>(null);
  const spanRef = useRef<SVGRectElement | null>(null);
  const viewerApi = useViewerStoreApi();
  const rangeApi = useRangeStoreApi();
  const annotationApi = useAnnotationStoreApi();

  useEffect(() => {
    const draw = () => {
      const path = pathRef.current;
      const span = spanRef.current;
      const el = surfaceRef.current;
      if (!path || !span || !el) return;
      const draft = annotationApi.getState().draft;
      const { width, height } = el.getBoundingClientRect();
      const rowCount = Math.max(1, viewerApi.getState().rowCount);
      const window = rangeApi.getState().liveRange;
      path.setAttribute("d", draft ? draftPath(draft, width, height, rowCount, window) : "");
      const epoch = draft?.tool === "EPOCH" && draft.cursor ? draft : null;
      if (epoch && epoch.cursor) {
        const a = pixelAtTime(epoch.points[0].time, width, window);
        const b = pixelAtTime(epoch.cursor.time, width, window);
        span.setAttribute("x", String(Math.min(a, b)));
        span.setAttribute("width", String(Math.max(1, Math.abs(b - a))));
        span.setAttribute("height", String(height));
        span.style.display = "";
      } else {
        span.style.display = "none";
      }
    };
    draw();
    const unsubs = [
      annotationApi.subscribe((s, p) => s.draft !== p.draft && draw()),
      rangeApi.subscribe((s, p) => s.liveRange !== p.liveRange && draw()),
      viewerApi.subscribe((s, p) => s.rowCount !== p.rowCount && draw()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [annotationApi, rangeApi, viewerApi, surfaceRef]);

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      <rect ref={spanRef} y={0} className="fill-amber-400/20 stroke-amber-400/60" style={{ display: "none" }} />
      <path ref={pathRef} className="fill-none stroke-amber-300" strokeWidth={1.5} strokeDasharray="4 3" />
    </svg>
  );
};

/** SVG path data for a draft: instants as verticals, row shapes as a polyline. */
const draftPath = (
  draft: Draft,
  width: number,
  height: number,
  rowCount: number,
  window: { start: number; end: number },
): string => {
  const x = (t: number) => pixelAtTime(t, width, window);
  const y = (worldY: number) => (-worldY / rowCount) * height;
  const points = draft.cursor && draft.tool !== "EVENTS" ? [...draft.points, draft.cursor] : draft.points;
  switch (draft.tool) {
    case "EVENT":
    case "EVENTS":
      return [...draft.points, ...(draft.cursor ? [draft.cursor] : [])]
        .map((p) => `M${x(p.time)},0V${height}`)
        .join("");
    case "EPOCH":
      return "";
    default: {
      if (points.length === 0) return "";
      const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.time)},${y(p.y)}`).join("");
      return draft.tool === "POLYGON" && points.length >= 3 ? `${d}Z` : d;
    }
  }
};
