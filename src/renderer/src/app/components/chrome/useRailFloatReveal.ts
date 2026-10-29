import { useEffect, useRef, useState } from "react";

/**
 * Whether the floating rail is out, and the gestures that bring it out and put
 * it away.
 *
 * - **Out:** the pointer pushed against the window's left edge (a sentinel
 *   strip, `RailFloatSentinel`), or a card dragged onto it — the rail takes
 *   drops, and floating must not cost that.
 * - **Away:** a move that lands clearly to the right of the rail, after a
 *   short grace so a pointer overshooting the edge for a moment does not snap
 *   it shut; or Escape.
 *
 * ## Why not `mouseleave`
 *
 * The rail's top row is a window-drag region, and the pointer is not SEEN over
 * a drag region at all (`useTopEdgeReveal`): crossing it would read as leaving
 * the rail. Menus opened from the rail portal to `body`, so moving into one
 * would too. So, as with the title bar, silence means "still here", and only a
 * move that is actually over the page counts.
 *
 * ## What holds it open
 *
 * - An overlay opened from the rail (the user menu, a tab's context menu): it
 *   reaches past the rail's edge, and shutting the rail would unmount it under
 *   the pointer. Those overlays carry `.chrome-zoom` (`ChromeSurface.tsx`),
 *   which is what tells them apart from the page's.
 * - A card in the air: native drags fire no pointer moves, and the rail is
 *   where the card is going.
 */

/** How far right of the rail the pointer may stray before it counts as gone. */
const CLOSE_SLACK = 12;

/** How long the pointer must stay gone before the rail slides away. */
const CLOSE_DELAY_MS = 200;

/** An overlay opened from the chrome, open, and not itself inside the rail. */
const heldByOverlay = (rail: HTMLElement | null): boolean =>
  Array.from(document.querySelectorAll<HTMLElement>('.chrome-zoom[data-state="open"]')).some(
    (element) => !rail?.contains(element),
  );

export const useRailFloatReveal = ({
  floating,
  dragging,
  railRef,
}: {
  floating: boolean;
  dragging: boolean;
  railRef: React.RefObject<HTMLElement | null>;
}) => {
  const [revealed, setRevealed] = useState(false);
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

  // A pending close must not fire into an unmounted component.
  useEffect(() => cancelClose, []);

  // Docking puts it back in the layout, where "out" means nothing; the next
  // time it floats it starts tucked away.
  useEffect(() => {
    if (floating) return;
    cancelClose();
    setRevealed(false);
  }, [floating]);

  useEffect(() => {
    if (!floating || !revealed || dragging) return;

    const onMove = (event: PointerEvent) => {
      const rail = railRef.current;
      const right = rail ? rail.getBoundingClientRect().right : 0;
      if (event.clientX <= right + CLOSE_SLACK || heldByOverlay(rail)) {
        cancelClose();
        return;
      }
      if (closeTimer.current !== null) return;
      closeTimer.current = window.setTimeout(() => {
        closeTimer.current = null;
        setRevealed(false);
      }, CLOSE_DELAY_MS);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      // An open menu takes its own Escape first.
      if (event.key !== "Escape" || event.defaultPrevented || heldByOverlay(railRef.current)) return;
      cancelClose();
      setRevealed(false);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("keydown", onKeyDown);
      cancelClose();
    };
  }, [floating, revealed, dragging, railRef]);

  return { revealed: floating && revealed, reveal };
};
