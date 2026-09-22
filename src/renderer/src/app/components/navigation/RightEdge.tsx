import { ChromeSurfaceProvider } from "@/components/layout/ChromeSurface";
import { cn } from "@/lib/utils";
import { useSmartDragActive, useSmartTabDrop } from "@/providers/smart/useSmartTabDrop";
import { motion } from "framer-motion";
import { Columns2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import RailTabs from "./RailTabs";

/**
 * The window's right edge, which does two things and never both at once.
 *
 * At rest it is the tab strip you do not have to go left for: push the pointer
 * against the edge and the open tabs slide in, the page ducking left to make
 * room for them, and slide back out when the pointer leaves. Mid-drag it is
 * "open to the side": a card let go against the edge opens beside what you are
 * reading.
 *
 * Both are the gesture the auto-hide title bar taught (`AutoHideTitleBar`) —
 * throw the pointer at an edge and the chrome that lives there comes to meet
 * it, nudging the page rather than covering it — turned ninety degrees, and
 * both are aimed rather than found in a menu.
 *
 * ## Why the open/close state is not plain hover
 *
 * Same reason as the title bar, and then one more. The rail is a window-drag
 * region and a drag region is blind to the pointer, so the strip of page that
 * OPENS this is `app-no-drag`; and since the panel pushes the page as it grows,
 * a `mouseleave` on the panel itself would fire on the row of pixels the
 * animation is passing through and chatter it shut. So it opens from a
 * sentinel and closes on a document-level move that lands clearly to its LEFT.
 * Silence means "still on the panel", which is what is wanted.
 */

/** The strip of page that opens the peek. Deep enough to catch a thrown pointer. */
const SENTINEL_WIDTH = 6;

/** The band that takes a drop while a card is in the air. */
const DROP_BAND_WIDTH = 40;

/** How far the panel pushes the page aside when open: the rail's own width. */
const PANEL_WIDTH = "var(--rail-width)";

/**
 * How far left of the open panel the pointer must be before it closes. Without
 * the slack a pointer skimming the panel's edge — or the column of pixels the
 * opening animation is passing through — would chatter it open and shut.
 */
const CLOSE_SLACK = 12;

/** Grace before a focus-out closes it, so tabbing between rows does not. */
const BLUR_DELAY_MS = 120;

/**
 * Menus, tooltips and hover cards opened from inside the panel portal to
 * `body`, so they are not "inside" it as far as the pointer is concerned, and
 * they usually open to its LEFT — which is exactly where the close rule looks.
 * A pointer on one of them is still a pointer on the panel.
 */
const isOverlay = (target: EventTarget | null) =>
  target instanceof Element &&
  target.closest("[data-radix-popper-content-wrapper],[role='menu'],[role='dialog']") !== null;

/**
 * "Open to the side", as a place rather than a menu item.
 *
 * Only while a droppable card is in the air, and only then: at rest a band of
 * dead page down the right edge would swallow clicks meant for the content
 * under it. It overhangs the page rather than pushing it — a reflow mid-drag
 * is exactly what Chromium cancels a drag over.
 */
const SplitDropEdge = () => {
  const { ref, isOver } = useSmartTabDrop("beside");

  return (
    <motion.div
      ref={ref}
      data-testid="right-edge-drop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
      style={{ width: DROP_BAND_WIDTH }}
      className={cn(
        "app-no-drag absolute inset-y-2 right-0 z-30 flex items-center justify-center",
        "rounded-l-xl border border-r-0 border-dashed transition-colors",
        isOver
          ? "border-primary/70 bg-primary/15 text-primary"
          : "border-border/50 bg-background/40 text-muted-foreground/70 backdrop-blur-sm",
      )}
    >
      <Columns2 className="h-4 w-4" />
      <span className="sr-only">Drop to open beside this page</span>
    </motion.div>
  );
};

/**
 * The open tabs, on the right, for as long as the pointer stays there.
 *
 * In the layout rather than over it: the panel's width is what grows, the page
 * beside it gives up the space, and the window surface shows through the gap
 * the same way it does around the rail on the other side.
 */
const TabPeek = () => {
  const [revealed, setRevealed] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | null>(null);

  const cancelClose = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const reveal = () => {
    cancelClose();
    setRevealed(true);
  };

  const hideSoon = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setRevealed(false), BLUR_DELAY_MS);
  };

  // A pending close must not fire into an unmounted component.
  useEffect(() => cancelClose, []);

  // The close half of the gesture: a move that landed clearly LEFT of the
  // panel, or Escape. Watched on the document rather than as the panel's own
  // `mouseleave`, so that the menus it opens — which are not in it — keep it.
  useEffect(() => {
    if (!revealed) return;

    const onMove = (event: MouseEvent) => {
      const panel = panelRef.current;
      if (!panel || isOverlay(event.target)) return;
      if (event.clientX >= panel.getBoundingClientRect().left - CLOSE_SLACK) return;
      cancelClose();
      setRevealed(false);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRevealed(false);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("keydown", onKey);
    };
  }, [revealed]);

  return (
    <>
      {/* Overhangs the page — the wrapper has no width of its own until the
          panel opens — which is why it is the one thing up against the edge
          that the pointer can reach.

          It stays MOUNTED once the panel is open and goes inert instead:
          unmounting an element from under the pointer fires a mouseout with no
          related target, which reads as "the pointer left". */}
      <div
        aria-hidden
        data-testid="right-edge-sentinel"
        onMouseEnter={reveal}
        style={{ width: SENTINEL_WIDTH }}
        className={cn(
          "app-no-drag absolute inset-y-0 right-0 z-50",
          revealed && "pointer-events-none",
        )}
      />

      {/* What pushes the page: a box whose WIDTH is animated, with the panel
          inside it at full width all along, so the tabs slide out from under
          the edge instead of being squeezed out of a narrowing column.

          `chrome-zoom` here rather than deeper in: the width is the rail's
          own (`--rail-width`), which is measured in chrome pixels, so the box
          that spends it must be the counter-zoomed one. Its height then needs
          `100% * --page-zoom`, a length inside a zoomed box rendering at
          `1 / --page-zoom` of itself. */}
      <div
        ref={panelRef}
        data-testid="right-edge-tabs"
        data-state={revealed ? "revealed" : "hidden"}
        onMouseEnter={reveal}
        onFocus={reveal}
        onBlur={hideSoon}
        className="chrome-zoom app-no-drag overflow-hidden transition-[width] duration-200 ease-out"
        style={{
          width: revealed ? PANEL_WIDTH : 0,
          height: "calc(100% * var(--page-zoom))",
        }}
      >
        <div
          className="h-full py-2 pr-2"
          style={{ width: PANEL_WIDTH }}
        >
          <div className="flex h-full flex-col overflow-y-auto rounded-xl border border-border/60 bg-sidebar/80 py-2 shadow-sm backdrop-blur-sm">
            {/* Mounted only while it is open: a second tab strip in the tree
                at all times would be a second set of drop targets and a second
                subscription to every tab's history, for nothing. */}
            {revealed && (
              <ChromeSurfaceProvider>
                <RailTabs />
              </ChromeSurfaceProvider>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export const RightEdge = () => {
  const dragging = useSmartDragActive();

  return (
    // No width of its own: the sentinel and the drop band overhang the page,
    // and only the open panel takes room.
    <div className="relative flex shrink-0">
      {/* One or the other. A drag that starts while the peek is open takes the
          edge over, and the peek closes with it — which is what you want: the
          panel is in the way of the very drop the edge is now offering. */}
      {dragging ? <SplitDropEdge /> : <TabPeek />}
    </div>
  );
};

export default RightEdge;
