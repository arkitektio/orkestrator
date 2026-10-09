import { cn } from "@/core/util/utils";
import { useEffect, useRef, useState } from "react";

import {
  clampSplitRatio,
  DEFAULT_SPLIT_RATIO,
  MAX_SPLIT_RATIO,
  MIN_SPLIT_RATIO,
  saveSplitRatio,
  splitRatioFromPointer,
} from "./splitRatio";

/**
 * The gap between the two panes of a split view, as a drag handle.
 *
 * The gap itself is the window surface showing between two cards, the same
 * width as the margin around them, so it needs no line of its own at rest.
 * Same shape as the rail's resizer otherwise: a 1px line only on hover or
 * while dragging, pointer capture so the drag survives the pointer outrunning
 * the handle. The ratio is measured against
 * the handle's PARENT — the content card the panes are laid out in — so it
 * needs no knowledge of the rail, the zoom or the card's margins.
 *
 * Moves are coalesced to one `onChange` per frame; `onCommit` fires once when
 * the drag ends, which is when the value is worth persisting.
 */
export const SplitDivider = ({
  ratio,
  onChange,
}: {
  ratio: number;
  onChange: (ratio: number) => void;
}) => {
  const [dragging, setDragging] = useState(false);
  const frame = useRef<number | null>(null);
  // Where the drag has got to; read on release. Seeded from the prop when a
  // drag starts, so a press-and-release without a move commits what is shown.
  const latest = useRef(ratio);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    latest.current = ratio;
    setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const parent = event.currentTarget.parentElement;
    if (!parent) return;
    const box = parent.getBoundingClientRect();
    const next = splitRatioFromPointer(event.clientX, box.left, box.width);
    latest.current = next;
    if (frame.current === null) {
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        onChange(latest.current);
      });
    }
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
    onChange(latest.current);
    saveSplitRatio(latest.current);
  };

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const commit = (next: number) => {
    const clamped = clampSplitRatio(next);
    latest.current = clamped;
    onChange(clamped);
    saveSplitRatio(clamped);
  };

  return (
    <div
      data-split-divider
      className="group relative z-30 w-2 shrink-0 cursor-col-resize touch-none"
      style={{ order: 1 }}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize split view"
      aria-valuemin={Math.round(MIN_SPLIT_RATIO * 100)}
      aria-valuemax={Math.round(MAX_SPLIT_RATIO * 100)}
      aria-valuenow={Math.round(ratio * 100)}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => commit(DEFAULT_SPLIT_RATIO)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          commit(ratio - 0.05);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          commit(ratio + 0.05);
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

export default SplitDivider;
