import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createLeadingRafCoalescer } from "@/core/data/scene/perf/rafCoalesce";
import { usePlaneStore, usePlaneStoreApi } from "./planeStore";
import { categoricalTicks, memberTicks, numericTicks, TARGET_X_SPACING_PX, TARGET_Y_SPACING_PX, type PlaneTick } from "./planeTicks";
import { dataAt, panByPixels, viewForBox, zoomAbout, zoomFactorForWheel, type PlaneAxes } from "./planeView";

/**
 * The frame of a plane: the plot area the canvas fills, the two axes around it
 * (ticks, grid lines, titles), and the gestures over it.
 *
 * Gestures, in a plane's words:
 *  - **scroll** zooms about the cursor -- shift for x only, alt for y only;
 *  - **drag** pans; **shift-drag** draws a box and zooms into it (undoable);
 *  - **double-click** fits the data.
 *
 * The view is the store's (`planeStore`); this file only writes it. Hover is
 * written once per frame, leading-edge, so a tooltip is on screen in the frame
 * the pointer moved in.
 */

export type PlaneAxisSpec = {
  /** `label · unit`, drawn along the axis; null for none. */
  title?: string | null;
  /** Member labels at integer positions: a categorical axis (groups, grid members). */
  categories?: readonly string[] | null;
  /** Whether a categorical member's label sits at its centre (`i + 0.5`, a grid cell) or at `i`. */
  centred?: boolean;
  /**
   * An enumerating axis of unbounded members (a grid's rows or columns): member
   * `m` is the cell `[m, m + 1]` (`flipped`: `[-(m + 1), -m]`, running down).
   */
  members?: { label: (member: number) => string; flipped?: boolean; first?: number; last?: number } | null;
};

const GUTTER = { left: 64, right: 14, top: 12, bottom: 44 };

/**
 * How far a pointer may travel and still be a click: below it nothing pans, so
 * clicking a point leaves the view where it was.
 */
export const CLICK_SLOP_PX = 4;

/** Whether a pointer has left its press far enough to be a drag. */
export const isDrag = (start: { px: number; py: number }, at: { px: number; py: number }): boolean =>
  Math.hypot(at.px - start.px, at.py - start.py) > CLICK_SLOP_PX;

/** A click on the plot: where, in data space and on the canvas. */
export type PlanePick = { x: number; y: number; px: number; py: number };

export const PlaneFrame = ({
  x,
  y,
  children,
  overlay,
  className,
  onPick,
}: {
  x: PlaneAxisSpec;
  y: PlaneAxisSpec;
  /** A click that was not a drag (left button, no shift). A double-click still fits. */
  onPick?: (pick: PlanePick) => void;
  /** The canvas, filling the plot area. */
  children: ReactNode;
  /** DOM over the plot area: tooltips, legends, notices. Pointer-transparent unless they opt in. */
  overlay?: ReactNode;
  className?: string;
}) => {
  return (
    <div className={`relative h-full w-full select-none overflow-hidden ${className ?? ""}`}>
      <Axes x={x} y={y} />
      <div
        className="absolute"
        style={{ left: GUTTER.left, right: GUTTER.right, top: GUTTER.top, bottom: GUTTER.bottom }}
      >
        <div className="absolute inset-0">{children}</div>
        <Gestures onPick={onPick} />
        <div className="pointer-events-none absolute inset-0">{overlay}</div>
      </div>
    </div>
  );
};

const ticksFor = (spec: PlaneAxisSpec, lo: number, hi: number, lengthPx: number, spacing: number): PlaneTick[] =>
  spec.members
    ? memberTicks(lo, hi, lengthPx, spacing, spec.members.label, spec.members.flipped ?? false, {
        first: spec.members.first ?? -Infinity,
        last: spec.members.last ?? Infinity,
      })
    : spec.categories && spec.categories.length > 0
    ? categoricalTicks(lo, hi, lengthPx, spec.categories, spacing, spec.centred ?? true)
    : numericTicks(lo, hi, lengthPx, spacing);

/** Ticks, grid lines and titles. Re-rendered per frame while the view moves: a few dozen elements. */
const Axes = ({ x, y }: { x: PlaneAxisSpec; y: PlaneAxisSpec }) => {
  const live = usePlaneStore((s) => s.live);
  const size = usePlaneStore((s) => s.sizePx);
  const xTicks = useMemo(() => ticksFor(x, live.x0, live.x1, size.width, TARGET_X_SPACING_PX), [x, live.x0, live.x1, size.width]);
  const yTicks = useMemo(() => ticksFor(y, live.y0, live.y1, size.height, TARGET_Y_SPACING_PX), [y, live.y0, live.y1, size.height]);
  const xPx = (v: number) => ((v - live.x0) / (live.x1 - live.x0)) * size.width;
  const yPx = (v: number) => ((live.y1 - v) / (live.y1 - live.y0)) * size.height;

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Grid and frame: under everything drawn in the plot area. */}
      <div
        className="absolute border border-white/10"
        style={{ left: GUTTER.left, right: GUTTER.right, top: GUTTER.top, bottom: GUTTER.bottom }}
      >
        {xTicks.map((t) => (
          <div key={`gx${t.value}`} className="absolute inset-y-0 w-px bg-white/[0.06]" style={{ left: xPx(t.value) }} />
        ))}
        {yTicks.map((t) => (
          <div key={`gy${t.value}`} className="absolute inset-x-0 h-px bg-white/[0.06]" style={{ top: yPx(t.value) }} />
        ))}
      </div>
      {/* x axis */}
      <div className="absolute" style={{ left: GUTTER.left, right: GUTTER.right, bottom: 0, height: GUTTER.bottom }}>
        {xTicks.map((t) => (
          <div
            key={`x${t.value}`}
            className="absolute top-1 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] tabular-nums text-muted-foreground"
            style={{ left: xPx(t.value) }}
          >
            {t.label}
          </div>
        ))}
        {x.title && (
          <div className="absolute inset-x-0 bottom-1 truncate text-center text-[11px] font-medium text-foreground/80">{x.title}</div>
        )}
      </div>
      {/* y axis */}
      <div className="absolute" style={{ left: 0, width: GUTTER.left, top: GUTTER.top, bottom: GUTTER.bottom }}>
        {yTicks.map((t) => (
          <div
            key={`y${t.value}`}
            className="absolute right-2 -translate-y-1/2 truncate text-right font-mono text-[10px] tabular-nums text-muted-foreground"
            style={{ top: yPx(t.value), maxWidth: GUTTER.left - 18 }}
          >
            {t.label}
          </div>
        ))}
        {y.title && (
          <div
            className="absolute inset-y-0 left-0.5 flex items-center justify-center overflow-hidden text-[11px] font-medium text-foreground/80"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            <span className="truncate">{y.title}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const axesOf = (event: { shiftKey: boolean; altKey: boolean }): PlaneAxes => (event.shiftKey ? "x" : event.altKey ? "y" : "both");

/** The gesture surface over the plot area. Writes the view and the hover; renders a box while one is drawn. */
const Gestures = ({ onPick }: { onPick?: (pick: PlanePick) => void }) => {
  const planeApi = usePlaneStoreApi();
  const ref = useRef<HTMLDivElement>(null);
  // Read when a click lands, so a new callback never rebinds the listeners.
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const [box, setBox] = useState<{ a: { px: number; py: number }; b: { px: number; py: number } } | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const local = (event: { clientX: number; clientY: number }) => {
      const rect = element.getBoundingClientRect();
      return { px: event.clientX - rect.left, py: event.clientY - rect.top };
    };

    const hover = createLeadingRafCoalescer<{ px: number; py: number } | null>((at) => {
      const { live, sizePx, setHover } = planeApi.getState();
      if (!at) return setHover(null);
      const d = dataAt(live, sizePx, at.px, at.py);
      setHover({ x: d.x, y: d.y, px: at.px, py: at.py });
    });

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const { live, sizePx, setLive } = planeApi.getState();
      const at = local(event);
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      setLive(zoomAbout(live, dataAt(live, sizePx, at.px, at.py), zoomFactorForWheel(delta), axesOf(event)));
    };

    let drag: {
      start: { px: number; py: number };
      last: { px: number; py: number };
      boxing: boolean;
      /** Past the click slop: a pan (or a box), no longer a click. */
      moved: boolean;
      button: number;
    } | null = null;
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.button !== 1) return;
      element.setPointerCapture(event.pointerId);
      const at = local(event);
      drag = { start: at, last: at, boxing: event.shiftKey && event.button === 0, moved: false, button: event.button };
    };
    const onMove = (event: PointerEvent) => {
      const at = local(event);
      hover.schedule(at);
      if (!drag) return;
      if (!drag.moved) {
        if (!isDrag(drag.start, at)) return;
        drag.moved = true;
      }
      if (drag.boxing) {
        setBox({ a: drag.start, b: at });
      } else {
        const { live, sizePx, setLive } = planeApi.getState();
        setLive(panByPixels(live, sizePx, at.px - drag.last.px, at.py - drag.last.py, event.altKey ? "y" : "both"));
      }
      drag.last = at;
    };
    const onUp = (event: PointerEvent) => {
      if (!drag) return;
      if (!drag.moved) {
        // A click: nothing panned, nothing to commit.
        const at = local(event);
        const pick = pickRef.current;
        if (pick && drag.button === 0 && !drag.boxing && event.type === "pointerup") {
          const { live, sizePx } = planeApi.getState();
          const d = dataAt(live, sizePx, at.px, at.py);
          pick({ x: d.x, y: d.y, px: at.px, py: at.py });
        }
        setBox(null);
        drag = null;
        return;
      }
      if (drag.boxing) {
        const { committed, sizePx, jumpTo } = planeApi.getState();
        const view = viewForBox(committed, sizePx, drag.start, local(event));
        if (view) jumpTo(view);
        setBox(null);
      } else {
        planeApi.getState().commit();
      }
      drag = null;
    };
    const onLeave = () => hover.schedule(null);
    const onDouble = () => planeApi.getState().fit();

    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("pointerdown", onDown);
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerup", onUp);
    element.addEventListener("pointercancel", onUp);
    element.addEventListener("pointerleave", onLeave);
    element.addEventListener("dblclick", onDouble);
    return () => {
      hover.cancel();
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("pointerdown", onDown);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerup", onUp);
      element.removeEventListener("pointercancel", onUp);
      element.removeEventListener("pointerleave", onLeave);
      element.removeEventListener("dblclick", onDouble);
    };
  }, [planeApi]);

  return (
    <div ref={ref} className="absolute inset-0 cursor-crosshair touch-none">
      {box && (
        <div
          className="pointer-events-none absolute border border-sky-300/80 bg-sky-300/10"
          style={{
            left: Math.min(box.a.px, box.b.px),
            top: Math.min(box.a.py, box.b.py),
            width: Math.abs(box.a.px - box.b.px),
            height: Math.abs(box.a.py - box.b.py),
          }}
        />
      )}
    </div>
  );
};
