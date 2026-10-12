import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * The open/close state of a bar that slides down from the window's top edge
 * (`AutoHideTitleBar`, `PageEdgeBar`).
 *
 * ## Why it is not plain hover
 *
 * The bar is a drag region, and `-webkit-app-region: drag` does not merely
 * swallow clicks: the pointer is not SEEN over it at all. A bar that watched its
 * own `mouseleave` therefore shut the moment the pointer arrived on it. So:
 *
 * - it OPENS from a sentinel, a few pixels of `app-no-drag` overhanging the top
 *   of the page, which is the one place up here that does get pointer events;
 * - it CLOSES on a document-level move that lands clearly BELOW it. No events
 *   while the pointer is on the bar means "still on the bar", which is exactly
 *   the behaviour wanted.
 */

/**
 * How far below the open bar the pointer must be before it closes. Without the
 * slack a pointer skimming the bar's lower edge — or the row of pixels the
 * closing animation is passing through — would chatter it open and shut.
 */
const CLOSE_SLACK = 8;

/**
 * Grace before a focus-out closes it, so tabbing from one button on the bar to
 * the next does not collapse the bar between them.
 */
const BLUR_DELAY_MS = 120;

/** `height`: how far down the window the open bar reaches. */
export const useTopEdgeReveal = (height: number) => {
  const [revealed, setRevealed] = useState(false);
  // A timer handle, which is what a ref is actually for — unlike `revealed`,
  // nothing renders from it. The functions below are plain ones: there is
  // exactly one piece of state here and it changes almost never.
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
      if (event.clientY <= height + CLOSE_SLACK) return;
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      setRevealed(false);
    };

    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, [revealed, height]);

  return { revealed, reveal, hideSoon };
};

/**
 * Whether the window's title bar (`AutoHideTitleBar`) is open, for chrome
 * elsewhere in the window that shows itself with it: the page's notch
 * (`PageEdgeBar`) sits in the page's column, not in the bar. One window, one
 * bar, one answer — a module-level store, as `useWindowState` is.
 */
let titleBarRevealed = false;
const titleBarListeners = new Set<() => void>();

export const publishTitleBarRevealed = (revealed: boolean): void => {
  if (titleBarRevealed === revealed) return;
  titleBarRevealed = revealed;
  titleBarListeners.forEach((listener) => listener());
};

const subscribeTitleBar = (listener: () => void): (() => void) => {
  titleBarListeners.add(listener);
  return () => {
    titleBarListeners.delete(listener);
  };
};

const getTitleBarRevealed = (): boolean => titleBarRevealed;

export const useTitleBarRevealed = (): boolean =>
  useSyncExternalStore(subscribeTitleBar, getTitleBarRevealed, getTitleBarRevealed);
