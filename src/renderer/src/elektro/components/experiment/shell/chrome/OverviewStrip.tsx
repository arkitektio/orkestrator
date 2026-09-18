import { useEffect, useMemo, useRef } from "react";
import { bindFields } from "@/lib/scene/stores/bindStore";
import {
  isLayerHidden,
  useExperimentStore,
} from "../../platform/stores/experimentStore";
import { useRangeStoreApi } from "../../platform/stores/rangeStore";

/**
 * A minimap of the whole timeline, under the plot: where each view HAS data, and
 * which part of it you are looking at.
 *
 * It answers the question a zoomed-in timeline cannot — "where am I, and is there
 * anything over there?" — without reading a single sample: each view's extent is a
 * bar, known from its placement alone. Click to centre the window there; drag the
 * window box to move it.
 *
 * The window box follows the LIVE range imperatively (one `style` write per change,
 * no React render — P17); the bars change only when the views do.
 */
export const OverviewStrip = () => {
  const views = useExperimentStore((s) => s.layers);
  const worldSpan = useExperimentStore((s) => s.worldSpan);
  const rangeApi = useRangeStoreApi();
  const stripRef = useRef<HTMLDivElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const bars = useMemo(
    () =>
      views.filter(
        (v) => v.span != null && v.kind !== "annotation" && !isLayerHidden(v),
      ),
    [views],
  );

  // --- the window box: imperative ---
  useEffect(() => {
    const box = boxRef.current;
    if (!box || !worldSpan) return;
    const width = worldSpan.end - worldSpan.start;
    return bindFields(
      rangeApi,
      [(s) => s.liveRange.start, (s) => s.liveRange.end],
      (s) => {
        const left = ((s.liveRange.start - worldSpan.start) / width) * 100;
        const right = ((s.liveRange.end - worldSpan.start) / width) * 100;
        box.style.left = `${Math.max(0, left)}%`;
        // Never narrower than a hairline: a deep zoom must still show where it is.
        box.style.width = `max(2px, ${Math.min(100, right) - Math.max(0, left)}%)`;
      },
    );
  }, [rangeApi, worldSpan]);

  if (!worldSpan || !(worldSpan.end > worldSpan.start)) return null;
  const worldWidth = worldSpan.end - worldSpan.start;

  const timeAtClientX = (clientX: number) => {
    const rect = stripRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return worldSpan.start;
    return worldSpan.start + ((clientX - rect.left) / rect.width) * worldWidth;
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const { liveRange } = rangeApi.getState();
    const half = (liveRange.end - liveRange.start) / 2;
    const t = timeAtClientX(event.clientX);
    const insideBox = t >= liveRange.start && t <= liveRange.end;

    // Clicking outside the box jumps there (a deliberate move, so it is undoable);
    // pressing inside it starts a drag.
    if (!insideBox) {
      rangeApi.getState().jumpTo({ start: t - half, end: t + half });
      return;
    }
    const grabOffset = t - liveRange.start;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const onMove = (move: PointerEvent) => {
      const start = timeAtClientX(move.clientX) - grabOffset;
      rangeApi.getState().setLiveRange({ start, end: start + half * 2 });
    };
    const onUp = () => {
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
    };
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
  };

  const laneHeight = bars.length > 0 ? Math.max(1, Math.min(4, 16 / bars.length)) : 0;

  return (
    <div
      ref={stripRef}
      className="absolute inset-x-0 bottom-7 h-5 cursor-pointer select-none border-t border-border/40 bg-background/30"
      onPointerDown={onPointerDown}
    >
      {bars.map((view, i) => (
        <div
          key={view.id}
          className="pointer-events-none absolute rounded-full opacity-70"
          style={{
            left: `${((view.span!.start - worldSpan.start) / worldWidth) * 100}%`,
            width: `max(2px, ${((view.span!.end - view.span!.start) / worldWidth) * 100}%)`,
            top: `${2 + i * laneHeight}px`,
            height: `${Math.max(1, laneHeight - 0.5)}px`,
            backgroundColor: view.color,
          }}
        />
      ))}
      <div
        ref={boxRef}
        className="pointer-events-none absolute inset-y-0 rounded-sm border border-foreground/60 bg-foreground/10"
      />
    </div>
  );
};
