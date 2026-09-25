import { useEffect, useRef } from "react";
import { createRafCoalescer } from "@/core/data/scene/perf/rafCoalesce";
import { bindFields } from "@/core/data/scene/stores/bindStore";
import { pixelAtTime } from "../../platform/camera/rangeToCamera";
import { timeTicks } from "../../platform/camera/timeTicks";
import { useRangeStoreApi } from "../../platform/stores/rangeStore";
import { useViewerStore, useViewerStoreApi } from "../../platform/stores/viewerStore";

/**
 * The vertical half of the grid: one line per TIME AXIS tick.
 *
 * Deliberately the same `timeTicks` call as `TimeAxis` — same window, same
 * `gridSpacingPx` — so every line rises out of a label that is already on the
 * axis. That is why nothing here is labelled: a second set of numbers over the
 * plot is exactly the crowding the grid is supposed to relieve.
 *
 * And, like the axis, it follows the LIVE window: lines that lagged behind the
 * traces during a drag would read as the grid and the data disagreeing. So this
 * does NOT re-render — it binds with a vanilla subscription, coalesces to one
 * update per frame and writes a reused pool of line elements directly (P17).
 */
export const TimeGrid = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const showGrid = useViewerStore((s) => s.showGrid);
  const rangeApi = useRangeStoreApi();
  const viewerApi = useViewerStoreApi();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const pool: HTMLDivElement[] = [];

    const lineElement = (i: number): HTMLDivElement => {
      let el = pool[i];
      if (!el) {
        el = document.createElement("div");
        el.className = "pointer-events-none absolute inset-y-0 w-px bg-foreground/10";
        container.appendChild(el);
        pool[i] = el;
      }
      return el;
    };

    const render = createRafCoalescer<null>(() => {
      const window = rangeApi.getState().liveRange;
      const { viewportPx, gridSpacingPx } = viewerApi.getState();
      const { ticks } = timeTicks(window, viewportPx.width, gridSpacingPx);
      ticks.forEach((tick, i) => {
        const el = lineElement(i);
        el.style.display = "";
        el.style.left = `${pixelAtTime(tick.time, viewportPx.width, window)}px`;
      });
      // Hide, don't remove: the next zoom will want them back.
      for (let i = ticks.length; i < pool.length; i++) pool[i].style.display = "none";
    });

    const unbindRange = bindFields(
      rangeApi,
      [(s) => s.liveRange.start, (s) => s.liveRange.end],
      () => render.schedule(null),
    );
    const unbindViewer = bindFields(
      viewerApi,
      [(s) => s.viewportPx.width, (s) => s.gridSpacingPx],
      () => render.schedule(null),
    );
    return () => {
      unbindRange();
      unbindViewer();
      render.cancel();
      for (const el of pool) el.remove();
    };
    // `showGrid` is a dep, not just a render gate: the container only exists while
    // the grid is on, so the effect must re-bind when it comes back.
  }, [rangeApi, viewerApi, showGrid]);

  if (!showGrid) return null;
  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-x-0 top-0 bottom-12 overflow-hidden"
    />
  );
};
