import { useSmartDragActive, useSmartTabDrop } from "@/core/providers/smart/useSmartTabDrop";
import { Columns2 } from "lucide-react";

/**
 * The window's right edge: "open to the side", as a place rather than a menu
 * item. A smart card let go against it opens beside what you are reading.
 *
 * Only while a droppable card is in the air, and only then: at rest a band of
 * dead page down the right edge would swallow clicks meant for the content
 * under it.
 *
 * Mid-drag an invisible band overhangs the page; nothing is drawn until the
 * card reaches it. Then the edge slides open IN the layout, the page ducking left to make room — the gesture
 * the auto-hide title bar taught, turned ninety degrees. The whole edge is one
 * drop target, band and panel alike, so the pointer stays "over" it while the
 * page moves out from under, and letting it go anywhere in there opens beside.
 * Leaving closes it, and the band it falls back to lies well inside the panel,
 * so it cannot chatter open and shut on the boundary.
 *
 * The page reflowing mid-drag is safe here: what Chromium cancels a drag over
 * is the SOURCE moving right after `dragstart`, before it has taken the drag
 * image, and this only opens once the card has travelled all the way across.
 */

/** The band that catches the card before the edge opens. */
const DROP_BAND_WIDTH = 40;

/** How far the open edge pushes the page aside, in chrome pixels. */
const PANEL_WIDTH = 112;

const SplitDropEdge = () => {
  const { ref, isOver } = useSmartTabDrop("beside");

  return (
    // `chrome-zoom`, so the panel's width is the same on screen whatever the
    // page zoom; its height then needs `100% * --page-zoom`, as the rail's does.
    <div
      ref={ref}
      data-testid="right-edge-drop"
      data-state={isOver ? "open" : "closed"}
      className="chrome-zoom app-no-drag relative flex shrink-0"
      style={{ height: "calc(100% * var(--page-zoom))" }}
    >
      {/* The catch: invisible, so nothing shows until the card reaches the
          edge. Overhangs the page while the edge is shut — the wrapper has no
          width of its own until then — and sits inside the panel once open.

          It must stay hittable while the panel opens. The panel starts at 0px,
          so a catch that stepped aside on open would hand the very next
          `dragover` to the page, which closes the edge, which brings the catch
          back: an endless open/shut flicker with no stable place to drop. */}
      <div
        aria-hidden
        data-testid="right-edge-catch"
        style={{ width: DROP_BAND_WIDTH }}
        className="absolute inset-y-0 right-0 z-30"
      />

      {/* What pushes the page: a box whose WIDTH is animated, with the panel
          inside it at full width all along, so the symbol slides out from under
          the edge instead of being squeezed out of a narrowing column. */}
      <div
        className="overflow-hidden transition-[width] duration-200 ease-out"
        style={{ width: isOver ? PANEL_WIDTH : 0 }}
      >
        <div className="h-full py-2 pr-2" style={{ width: PANEL_WIDTH }}>
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-primary/70 bg-primary/10 text-primary">
            <Columns2 className="h-6 w-6" />
          </div>
        </div>
      </div>

      <span className="sr-only">Drop to open beside this page</span>
    </div>
  );
};

export const RightEdge = () => {
  const dragging = useSmartDragActive();
  return dragging ? <SplitDropEdge /> : null;
};

export default RightEdge;
