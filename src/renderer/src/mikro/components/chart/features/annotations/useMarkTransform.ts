import { useEffect, type RefObject } from "react";
import { useRangeStoreApi } from "@/core/data/plot/stores/rangeStore";
import { useViewerStoreApi } from "@/core/data/plot/stores/viewerStore";
import { bindFields } from "@/core/data/scene/stores/bindStore";
import { useChartStoreApi } from "../../platform/stores/chartStore";
import { markMatrix, valueFrameOf } from "./valueFrame";

/**
 * Keeps an SVG group's transform in step with the chart — the render plane of
 * the drawn marks.
 *
 * Marks are written ONCE in data terms (position − origin, value) and this one
 * matrix follows the live window, the row layout and the scale. It is bound
 * with vanilla subscriptions on scalars and writes one attribute, so a pan or a
 * zoom re-renders nothing (P17).
 *
 * `valued` marks are drawn at a height, in the chart's value frame; the others
 * span the whole height, so their y runs 0…1 over the viewport.
 */
export const useMarkTransform = (ref: RefObject<SVGGElement | null>, valued: boolean): void => {
  const rangeApi = useRangeStoreApi();
  const viewerApi = useViewerStoreApi();
  const chartApi = useChartStoreApi();

  useEffect(() => {
    const apply = () => {
      const group = ref.current;
      if (!group) return;
      const viewer = viewerApi.getState();
      const window = rangeApi.getState().liveRange;
      const origin = chartApi.getState().timeOrigin;
      const size = viewer.viewportPx;
      const frame = valueFrameOf(viewer);
      const matrix = frame ? markMatrix(frame, window, origin, size) : null;
      // No scale yet (or no canvas): a mark drawn now would be drawn somewhere wrong.
      if (!matrix || (valued && !frame)) {
        group.style.display = "none";
        return;
      }
      group.style.display = "";
      group.setAttribute(
        "transform",
        valued
          ? `matrix(${matrix.a} 0 0 ${matrix.d} ${matrix.e} ${matrix.f})`
          : `matrix(${matrix.a} 0 0 ${size.height} ${matrix.e} 0)`,
      );
    };
    const unbindRange = bindFields(rangeApi, [(s) => s.liveRange.start, (s) => s.liveRange.end], apply);
    const unbindViewer = bindFields(
      viewerApi,
      [
        (s) => s.viewportPx.width,
        (s) => s.viewportPx.height,
        (s) => s.layoutVersion,
        (s) => s.climVersion,
        (s) => s.rowCount,
      ],
      apply,
    );
    apply();
    return () => {
      unbindRange();
      unbindViewer();
    };
  }, [ref, valued, rangeApi, viewerApi, chartApi]);
};
