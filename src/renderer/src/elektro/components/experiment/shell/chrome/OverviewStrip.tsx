import { useEffect, useMemo, useRef } from "react";
import { bindFields } from "@/core/data/scene/stores/bindStore";
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
 * bar, known from its placement alone.
 *
 * Gestures (`overviewIntent` decides at pointer-down):
 *  - **drag across the rail** — select a range; releasing jumps straight to it
 *    (one undoable jump, like a box zoom);
 *  - **click** — centre the window there;
 *  - **drag the window box** — move it. A box covering nearly the whole rail
 *    (the zoomed-out default) is not grabbable: there, a drag selects instead,
 *    or there would be nowhere to select from.
 *
 * The window box follows the LIVE range imperatively (one `style` write per change,
 * no React render — P17); the bars change only when the views do.
 */
/** A press that moves less than this is a click, not a selection. */
const CLICK_SLOP_PX = 4;

/** A box wider than this share of the world is too wide to grab. */
const GRABBABLE_MAX_SHARE = 0.9;

/** What a press at world time `t` starts. Pure, so the rule is pinned by tests. */
export const overviewIntent = (
  t: number,
  live: { start: number; end: number },
  world: { start: number; end: number },
): "move" | "select" => {
  const share = (live.end - live.start) / (world.end - world.start);
  const insideBox = t >= live.start && t <= live.end;
  return insideBox && share < GRABBABLE_MAX_SHARE ? "move" : "select";
};

export const OverviewStrip = () => {
  const views = useExperimentStore((s) => s.layers);
  const worldSpan = useExperimentStore((s) => s.worldSpan);
  const rangeApi = useRangeStoreApi();
  const stripRef = useRef<HTMLDivElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const selectionRef = useRef<HTMLDivElement | null>(null);

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
    const width = liveRange.end - liveRange.start;
    const t = timeAtClientX(event.clientX);
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const listen = (onMove: (move: PointerEvent) => void, onUp: (up: PointerEvent) => void) => {
      const up = (e: PointerEvent) => {
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", up);
        target.removeEventListener("pointercancel", cancel);
        onUp(e);
      };
      const cancel = () => {
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", up);
        target.removeEventListener("pointercancel", cancel);
        hideSelection();
      };
      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerup", up);
      target.addEventListener("pointercancel", cancel);
    };

    if (overviewIntent(t, liveRange, worldSpan) === "move") {
      const grabOffset = t - liveRange.start;
      listen(
        (move) => {
          const start = timeAtClientX(move.clientX) - grabOffset;
          rangeApi.getState().setLiveRange({ start, end: start + width });
        },
        () => {},
      );
      return;
    }

    // Select: draw the range as it is dragged; on release, a real drag jumps to
    // it and a click centres the current window there. Both are `jumpTo`, so
    // both are in the undo history.
    const startX = event.clientX;
    listen(
      (move) => {
        if (Math.abs(move.clientX - startX) < CLICK_SLOP_PX) return hideSelection();
        showSelection(t, timeAtClientX(move.clientX));
      },
      (up) => {
        hideSelection();
        if (Math.abs(up.clientX - startX) < CLICK_SLOP_PX) {
          rangeApi.getState().jumpTo({ start: t - width / 2, end: t + width / 2 });
          return;
        }
        const end = timeAtClientX(up.clientX);
        rangeApi.getState().jumpTo({ start: Math.min(t, end), end: Math.max(t, end) });
      },
    );
  };

  const showSelection = (a: number, b: number) => {
    const node = selectionRef.current;
    if (!node) return;
    const lo = Math.max(worldSpan.start, Math.min(a, b));
    const hi = Math.min(worldSpan.end, Math.max(a, b));
    node.style.display = "block";
    node.style.left = `${((lo - worldSpan.start) / worldWidth) * 100}%`;
    node.style.width = `${((hi - lo) / worldWidth) * 100}%`;
  };

  const hideSelection = () => {
    if (selectionRef.current) selectionRef.current.style.display = "none";
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
      {/* The range being selected — the same colours as the canvas' zoom box. */}
      <div
        ref={selectionRef}
        className="pointer-events-none absolute inset-y-0 hidden border-x border-sky-400/80 bg-sky-400/25"
      />
    </div>
  );
};
