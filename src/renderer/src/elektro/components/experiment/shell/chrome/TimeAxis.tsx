import { useEffect, useRef } from "react";
import { bindFields } from "@/lib/scene/stores/bindStore";
import { createRafCoalescer } from "@/lib/scene/perf/rafCoalesce";
import { pixelAtTime } from "../../platform/camera/rangeToCamera";
import { timeTicks } from "../../platform/camera/timeTicks";
import { timeAxis } from "../../platform/coords/timeAxis";
import { useExperimentStore } from "../../platform/stores/experimentStore";
import { useRangeStoreApi } from "../../platform/stores/rangeStore";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";

/**
 * The time axis along the bottom of the viewport.
 *
 * Its ticks follow the LIVE window, because ticks that lagged behind the traces
 * during a drag — jumping into place only once the gesture settles — would read as
 * the axis and the data disagreeing. But the live window changes at pointer rate,
 * so this does NOT re-render: it binds with a vanilla subscription, coalesces to one
 * update per frame, and writes a pool of tick elements directly (P17). The pool is
 * reused, so a steady zoom creates no DOM nodes.
 *
 * Tick DENSITY is the viewer's `gridSpacingPx` — one knob shared with the grid, so
 * the two can never drift apart.
 *
 * The unit comes from the WORLD's time axis — the timeline's own unit, which is what
 * every position here is measured in.
 */
export const TimeAxis = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rangeApi = useRangeStoreApi();
  const viewerApi = useViewerStoreApi();
  const unit = useExperimentStore((s) => timeAxis(s.world)?.unit ?? null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const pool: HTMLDivElement[] = [];

    const tickElement = (i: number): HTMLDivElement => {
      let el = pool[i];
      if (!el) {
        el = document.createElement("div");
        el.className =
          "absolute bottom-0 flex -translate-x-1/2 flex-col items-center gap-0.5 pointer-events-none";
        const mark = document.createElement("div");
        mark.className = "h-1.5 w-px bg-muted-foreground/60";
        const label = document.createElement("div");
        label.className = "font-mono text-[10px] tabular-nums text-muted-foreground";
        el.append(mark, label);
        container.appendChild(el);
        pool[i] = el;
      }
      return el;
    };

    const render = createRafCoalescer<null>(() => {
      const window = rangeApi.getState().liveRange;
      const { viewportPx, gridSpacingPx } = viewerApi.getState();
      const width = viewportPx.width;
      // The SAME spacing `TimeGrid` uses, so a grid line always rises out of a
      // label rather than falling between two.
      const { ticks } = timeTicks(window, width, gridSpacingPx);
      ticks.forEach((tick, i) => {
        const el = tickElement(i);
        el.style.display = "";
        el.style.left = `${pixelAtTime(tick.time, width, window)}px`;
        const label = el.lastChild as HTMLDivElement;
        if (label.textContent !== tick.label) label.textContent = tick.label;
      });
      // Hide, don't remove: the next zoom will want them back.
      for (let i = ticks.length; i < pool.length; i++) pool[i].style.display = "none";
    });

    const unbindRange = bindFields(
      rangeApi,
      [(s) => s.liveRange.start, (s) => s.liveRange.end],
      () => render.schedule(null),
    );
    const unbindSize = bindFields(
      viewerApi,
      [(s) => s.viewportPx.width, (s) => s.gridSpacingPx],
      () => render.schedule(null),
    );
    return () => {
      unbindRange();
      unbindSize();
      render.cancel();
      for (const el of pool) el.remove();
    };
  }, [rangeApi, viewerApi]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-7 border-t border-border/40 bg-background/40 backdrop-blur-sm">
      <div ref={containerRef} className="relative h-full w-full" />
      {unit && (
        <div className="absolute bottom-1 right-2 font-mono text-[10px] text-muted-foreground">
          {unit}
        </div>
      )}
    </div>
  );
};
