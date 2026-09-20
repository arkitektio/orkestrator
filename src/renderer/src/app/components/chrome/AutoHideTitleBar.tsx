import { getChromeMode, useWindowState } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

import { WindowControls } from "./WindowControls";

/**
 * The title bar that isn't there until you reach for it — Windows only.
 *
 * On Windows the page now fills the window to its very top edge: there is no
 * reserved strip and no system caption. Push the pointer against the top edge
 * and this bar slides down, nudging everything below it, with the window buttons
 * in it and the whole strip draggable; move down past it and it collapses again.
 *
 * This is what replaced the Windows Controls Overlay. WCO's buttons are drawn
 * by the OS and cannot be hidden — `setTitleBarOverlay({ height: 0 })` clamps to
 * 30px — so keeping it meant either a permanent 32px strip across the top (what
 * this app had) or system buttons floating over the page's top-right corner with
 * that strip click-dead. Drawing our own is the only way the page gets the whole
 * window. See `WindowManager.chromeOptions` for what it costs: the Snap Layouts
 * flyout.
 *
 * ## Why the open/close state is not plain hover
 *
 * The bar is a drag region, and `-webkit-app-region: drag` does not merely
 * swallow clicks: the pointer is not SEEN over it at all. A bar that watched its
 * own `mouseleave` therefore shut the moment the pointer arrived on it — the
 * user could never reach the buttons. So:
 *
 * - it OPENS from a sentinel, a few pixels of `app-no-drag` overhanging the top
 *   of the page, which is the one place up here that does get pointer events;
 * - it CLOSES on a document-level move that lands clearly BELOW it. No events
 *   while the pointer is on the bar means "still on the bar", which is exactly
 *   the behaviour wanted.
 */

/** How far the bar pushes the app down when open. */
export const AUTO_HIDE_BAR_HEIGHT = 32;

/**
 * The strip of page that opens the bar. Deep enough to catch a pointer thrown
 * at the top edge, shallow enough to stay inside the card's own margin.
 */
const SENTINEL_HEIGHT = 6;

/**
 * How far below the open bar the pointer must be before it closes. Without the
 * slack a pointer skimming the bar's lower edge — or the row of pixels the
 * closing animation is passing through — would chatter it open and shut.
 */
const CLOSE_SLACK = 8;

/**
 * Grace before a focus-out closes it, so tabbing from one window button to the
 * next does not collapse the bar between them.
 */
const BLUR_DELAY_MS = 120;

export const AutoHideTitleBar = () => {
  const mode = getChromeMode();
  const { maximized } = useWindowState();
  const [revealed, setRevealed] = useState(false);
  // A timer handle, which is what a ref is actually for — unlike `revealed`,
  // nothing renders from it. These four are plain functions: the component has
  // exactly one piece of state and re-renders almost never, so the `useCallback`
  // chain they used to be existed only to satisfy the dependency arrays it had
  // itself created.
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

  // The close half of the gesture, and the ONLY thing allowed to close it: a
  // move that landed clearly below the bar.
  //
  // Nothing else is trustworthy up here. Moving onto the bar hands the pointer
  // to the OS as a caption drag, and the page is told about that as a
  // `mouseleave` on the document with no related target — indistinguishable
  // from the pointer leaving the window. Closing on that flickered: the bar
  // collapsed, which dropped the pointer back onto the sentinel, which reopened
  // it, forever. Silence now means "still on the bar", which is the truth far
  // more often than not; and a pointer that really did leave the window closes
  // the bar on its first move back into the page.
  useEffect(() => {
    if (!revealed) return;

    const onMove = (event: MouseEvent) => {
      if (event.clientY <= AUTO_HIDE_BAR_HEIGHT + CLOSE_SLACK) return;
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      setRevealed(false);
    };

    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, [revealed]);

  if (mode !== "autohide") {
    return null;
  }

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={reveal}
      // Keyboard reaches the buttons too: they stay in the tab order while the
      // bar is shut, and React's focus events bubble, so tabbing into one opens
      // it rather than moving focus to something invisible.
      onFocus={reveal}
      onBlur={hideSoon}
    >
      {/* Overhangs the page, which is why the wrapper is `relative` and has no
          `overflow-hidden`: with the bar collapsed this is the only part of the
          component with any area at all.

          `app-no-drag` is what makes it work. The rail beneath is a drag region
          and a drag region is blind to the pointer, so without the opt-out the
          top few pixels over the rail would never report a hover and the bar
          would only open above the content card.

          It stays MOUNTED once the bar is open and goes inert instead:
          unmounting an element from under the pointer fires a mouseout with no
          related target, which reads as "the pointer left". */}
      <div
        aria-hidden
        data-testid="titlebar-hover-sentinel"
        className={cn("app-no-drag absolute inset-x-0 top-0 z-50", revealed && "pointer-events-none")}
        style={{ height: SENTINEL_HEIGHT }}
      />

      <div
        data-testid="autohide-titlebar"
        data-state={revealed ? "revealed" : "hidden"}
        // A real title bar: drag it and the window moves, double-click it and
        // Windows zooms it. The buttons inside carry `app-no-drag`, without
        // which the drag region swallows their clicks in silence.
        className="app-drag flex items-center justify-end overflow-hidden px-1 transition-[height] duration-200 ease-out"
        style={{ height: revealed ? AUTO_HIDE_BAR_HEIGHT : 0 }}
      >
        <WindowControls maximized={maximized} compact />
      </div>
    </div>
  );
};

export default AutoHideTitleBar;
