import { useEffect, useRef } from "react";
import { timeAtPixel, yAtPixel } from "@/core/data/plot/camera/rangeToCamera";
import { useRangeStoreApi } from "@/core/data/plot/stores/rangeStore";
import { useViewerStore, useViewerStoreApi } from "@/core/data/plot/stores/viewerStore";
import { isTypingTarget } from "@/core/dnd/keyboardTarget";
import type { MarkPoint } from "../../platform/model/chartMarks";
import { useChartStoreApi } from "../../platform/stores/chartStore";
import {
  chartGesture,
  chartToolForShortcut,
  type ChartDraft,
  type GestureEvent,
} from "./chartTools";
import { useChartAnnotationStoreApi } from "./store/annotationSlice";
import { useDrawingTargetGetter, useDrawingTargetId } from "./useAnnotationLayers";
import { useChartAnnotationCommit } from "./useChartAnnotationCommit";
import { useMarkTransform } from "./useMarkTransform";
import { valueAtY, valueFrameOf } from "./valueFrame";

/**
 * The drawing surface: in ANNOTATE mode, turns the pointer into shapes on the
 * chart's drawing layer.
 *
 * Mounted only while annotating and only when there is a layer to draw into,
 * so in EXPLORE the canvas keeps every gesture. Pointer events are resolved to
 * a position along the axis and a world y, fed to the chart's gesture machine
 * (`chartTools`), and a finished shape is committed with each vertex's height
 * read against the chart's value frame — the same frame the marks are drawn in,
 * so a shape lands where it was drawn.
 *
 * The shape in progress moves at pointer rate: it lives in a ref and its
 * preview is written imperatively. No store write, no render, per move (P17).
 */
export const ChartAnnotationDrawer = () => {
  const mode = useViewerStore((s) => s.interactionMode);
  const targetId = useDrawingTargetId();
  if (mode !== "ANNOTATE" || !targetId) return null;
  return <DrawSurface targetId={targetId} />;
};

const DrawSurface = ({ targetId }: { targetId: string }) => {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const groupRef = useRef<SVGGElement | null>(null);
  const previewRef = useRef<SVGPolylineElement | null>(null);
  const rangeApi = useRangeStoreApi();
  const viewerApi = useViewerStoreApi();
  const toolApi = useChartAnnotationStoreApi();
  const chartApi = useChartStoreApi();
  const targetOf = useDrawingTargetGetter();
  const commit = useChartAnnotationCommit();
  useMarkTransform(groupRef, true);

  // Read by the listeners below, which are bound once.
  const live = useRef({ targetId, targetOf, commit });
  live.current = { targetId, targetOf, commit };

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    let draft: ChartDraft | null = null;

    /** A resolved pointer position as the point a mark is made of. */
    const markPoint = (point: { time: number; y: number }): MarkPoint | null => {
      const frame = valueFrameOf(viewerApi.getState());
      return frame ? { at: point.time, value: valueAtY(frame, point.y) } : null;
    };

    const paint = () => {
      const preview = previewRef.current;
      if (!preview) return;
      const origin = chartApi.getState().timeOrigin;
      const points = draft ? [...draft.points, ...(draft.cursor ? [draft.cursor] : [])] : [];
      const drawn = points.map(markPoint).filter((p): p is MarkPoint => p != null);
      // A box is drawn as its outline, not its diagonal.
      const shown =
        draft?.tool === "RECTANGLE" && drawn.length >= 2
          ? [
              drawn[0],
              { at: drawn[1].at, value: drawn[0].value },
              drawn[1],
              { at: drawn[0].at, value: drawn[1].value },
              drawn[0],
            ]
          : draft?.tool === "POLYGON" && drawn.length > 2
            ? [...drawn, drawn[0]]
            : drawn;
      preview.setAttribute("points", shown.map((p) => `${p.at - origin},${p.value}`).join(" "));
    };

    const resolve = (event: PointerEvent) => {
      const rect = surface.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const viewer = viewerApi.getState();
      const frame = valueFrameOf(viewer);
      return {
        time: timeAtPixel(px, rect.width, rangeApi.getState().liveRange),
        y: yAtPixel(py, rect.height, frame?.rows ?? 1),
        px,
        py,
        row: frame?.row ?? null,
      };
    };

    const step = (event: GestureEvent) => {
      const result = chartGesture(toolApi.getState().annotateTool, draft, event);
      draft = result.draft;
      paint();
      if (!result.commit) return;
      const layer = live.current.targetOf(live.current.targetId);
      const points = result.commit.points.map(markPoint).filter((p): p is MarkPoint => p != null);
      if (layer && points.length === result.commit.points.length) {
        void live.current.commit(layer, result.commit.tool, points);
      }
    };

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      surface.setPointerCapture(event.pointerId);
      step({ type: "down", point: resolve(event) });
    };
    const onMove = (event: PointerEvent) => {
      if (draft) step({ type: "move", point: resolve(event) });
    };
    const onUp = (event: PointerEvent) => {
      if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
      step({ type: "up", point: resolve(event) });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target as HTMLElement | null)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Enter") return step({ type: "finish" });
      if (event.key === "Escape") {
        if (!draft) return;
        // Consumed: Esc cancels the shape, it does not also leave ANNOTATE.
        event.preventDefault();
        return step({ type: "cancel" });
      }
      const tool = chartToolForShortcut(event.key);
      if (tool) {
        toolApi.getState().setAnnotateTool(tool);
        step({ type: "cancel" });
      }
    };

    surface.addEventListener("pointerdown", onDown);
    surface.addEventListener("pointermove", onMove);
    surface.addEventListener("pointerup", onUp);
    // Capture: before the viewport's own Esc handler, which reads `defaultPrevented`.
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      surface.removeEventListener("pointerdown", onDown);
      surface.removeEventListener("pointermove", onMove);
      surface.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [rangeApi, viewerApi, toolApi, chartApi]);

  return (
    <div ref={surfaceRef} className="absolute inset-x-0 top-0 bottom-12 cursor-crosshair overflow-hidden">
      <svg className="pointer-events-none h-full w-full">
        <g ref={groupRef} style={{ display: "none" }}>
          <polyline
            ref={previewRef}
            fill="none"
            className="stroke-sky-400"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>
    </div>
  );
};
