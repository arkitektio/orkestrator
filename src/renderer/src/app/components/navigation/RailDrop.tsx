import { cn } from "@/lib/utils";
import { useSmartDragActive, useSmartTabDrop } from "@/providers/smart/useSmartTabDrop";

/**
 * The whole rail as one place to drop a card: let one go anywhere on it — a
 * module tile, the tab strip, the empty run below it, the margins around the
 * footer — and it opens as a tab.
 *
 * The rail rather than the tab strip on purpose. The strip is only as tall as
 * the tabs in it, so aiming at "where the tabs are" meant aiming at a box that
 * moves and is usually a sliver at the top; the rail is the thing you can see
 * and throw a card at.
 *
 * ## Why the drag region is given up while a card is in the air
 *
 * The rail is a window-drag region (`app-drag`), and a drag region is hit-tested
 * by the OS, beneath the page: the pointer is not SEEN over it (this is the same
 * fact `AutoHideTitleBar` is built around). Everything in the rail that takes a
 * click already opts out with `app-no-drag`, but the parts that do NOT — the
 * gaps, the empty run under the tabs — are exactly the parts this is meant to
 * catch, and they are deliberately left draggable because together they are the
 * largest window-drag target in the window.
 *
 * So the rail opts out for the length of a drag and no longer: while a card is
 * in the air the whole rail takes drops, and the moment the drag ends dragging
 * the rail moves the window again.
 */
export const useRailDrop = () => {
  const dragging = useSmartDragActive();
  const { ref, isOver } = useSmartTabDrop("tab");
  return { ref, isOver, dragging };
};

/**
 * What the rail looks like with a card over it.
 *
 * A child rather than classes on the rail itself: the rail paints no fill and
 * no edge of its own — that is what makes it read as the window surface — and
 * this is a thing laid over it for as long as the drag lasts, not a colour it
 * has. `pointer-events-none` so the tab strip underneath still gets its own
 * hover, and so this cannot steal the drop from the rail it is drawn on.
 */
export const RailDropOverlay = ({ isOver }: { isOver: boolean }) => (
  <div
    aria-hidden
    data-testid="rail-drop-overlay"
    data-over={isOver || undefined}
    className={cn(
      "pointer-events-none absolute inset-1 z-20 rounded-xl border border-dashed transition-colors",
      isOver ? "border-primary/60 bg-primary/10" : "border-border/40",
    )}
  >
    {/* Only once the card is actually over the rail: while it is merely in the
        air the dashed outline is invitation enough, and a label that followed
        the pointer around the window would be noise. */}
    {isOver && (
      <span className="absolute inset-x-0 bottom-3 text-center text-[10px] font-medium uppercase tracking-wider text-primary">
        Drop to open
      </span>
    )}
  </div>
);
