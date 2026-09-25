import { cn } from "@/core/lib/utils";
import { useEffect, useRef, useState } from "react";

import {
  applyRailWidth,
  clampRailWidth,
  DEFAULT_RAIL_WIDTH,
  loadRailWidth,
  MAX_RAIL_WIDTH,
  MIN_RAIL_WIDTH,
  railWidthFromPointer,
  saveRailWidth,
} from "./railWidth";

/**
 * The rail's right edge, as a drag handle.
 *
 * Writes straight to the `--rail-width` custom property during the drag rather
 * than through React state: the rail's width is pure CSS, and re-rendering the
 * whole navigation tree on every pointer move would make the drag stutter for
 * no benefit. React only hears about it when the pointer is released, and only
 * so the value can be persisted.
 *
 * Wider than it looks (8px of target, 1px of line) because a 1px hit area is a
 * fight; the visible line only appears on hover or while dragging, so the rail
 * has no seam at rest.
 */
export const RailResizer = () => {
  const [dragging, setDragging] = useState(false);
  const frame = useRef<number | null>(null);
  const latest = useRef(DEFAULT_RAIL_WIDTH);

  // Restore before first paint, so the rail does not flash at its default width
  // and then jump to the user's.
  useEffect(() => {
    const stored = loadRailWidth();
    latest.current = stored;
    applyRailWidth(stored);
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    // Pointer capture keeps the drag alive when the pointer outruns the handle,
    // which it will — that is the whole point of dragging an edge.
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;

    // The rail starts at the viewport's left edge, so the pointer's x IS the
    // width — once page pixels are turned into the counter-zoomed rail's own
    // (`railWidthFromPointer`). Coalesced into one write per frame.
    const next = railWidthFromPointer(event.clientX, event.currentTarget.currentCSSZoom);
    latest.current = next;

    if (frame.current === null) {
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        applyRailWidth(latest.current);
      });
    }
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
    saveRailWidth(latest.current);
  };

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const reset = () => {
    latest.current = DEFAULT_RAIL_WIDTH;
    applyRailWidth(DEFAULT_RAIL_WIDTH);
    saveRailWidth(DEFAULT_RAIL_WIDTH);
  };

  const nudge = (delta: number) => {
    const next = clampRailWidth(latest.current + delta);
    latest.current = next;
    applyRailWidth(next);
    saveRailWidth(next);
  };

  return (
    <div
      // `app-no-drag`: without it the window's drag region would swallow the
      // pointer and the handle would move the whole window instead of resizing.
      className={cn(
        "app-no-drag group absolute inset-y-0 -right-1 z-30 w-2 cursor-col-resize touch-none",
      )}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuemin={MIN_RAIL_WIDTH}
      aria-valuemax={MAX_RAIL_WIDTH}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={reset}
      onKeyDown={(event) => {
        // Keyboard-reachable, since a drag handle otherwise is not.
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          nudge(-16);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          nudge(16);
        }
      }}
    >
      <div
        className={cn(
          "mx-auto h-full w-px transition-colors",
          dragging ? "bg-primary/60" : "bg-transparent group-hover:bg-border",
        )}
      />
    </div>
  );
};

export default RailResizer;
