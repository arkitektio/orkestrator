import { dragZoneDoubleClick, getChromeMode, useWindowState } from "@/core/util/platform";
import { cn } from "@/core/util/utils";
import { useEffect } from "react";

import { publishTitleBarRevealed, useTopEdgeReveal } from "./useTopEdgeReveal";
import { WindowControls } from "./WindowControls";

/**
 * The title bar that isn't there until you reach for it — Windows and Linux.
 *
 * On both the page fills the window to its very top edge: there is no reserved
 * strip and no system caption (Windows hides it, Linux is frameless). Push the pointer against the top edge
 * and this bar slides down, nudging everything below it, with the window buttons
 * in it and the whole strip draggable; move down past it and it collapses again.
 * While it is open each page wears a notch on its top edge, rising into the
 * bar: close the page, or open it in a window of its own (`PageEdgeBar`).
 *
 * On Windows this is what replaced the Windows Controls Overlay. WCO's buttons are drawn
 * by the OS and cannot be hidden — `setTitleBarOverlay({ height: 0 })` clamps to
 * 30px — so keeping it meant either a permanent 32px strip across the top (what
 * this app had) or system buttons floating over the page's top-right corner with
 * that strip click-dead. Drawing our own is the only way the page gets the whole
 * window. See `WindowManager.chromeOptions` for what it costs: the Snap Layouts
 * flyout. On Linux it replaced buttons that sat inline in the rail's chrome
 * row, so both platforms now wear the same chrome.
 *
 * The open/close state is not plain hover, and is shared with macOS's
 * `PageEdgeBar`: see `useTopEdgeReveal`.
 */

/** How far the bar pushes the app down when open. */
export const AUTO_HIDE_BAR_HEIGHT = 32;

/**
 * The strip of page that opens the bar. Deep enough to catch a pointer thrown
 * at the top edge, shallow enough to stay inside the card's own margin.
 */
const SENTINEL_HEIGHT = 6;

export const AutoHideTitleBar = () => {
  const mode = getChromeMode();
  const { maximized } = useWindowState();
  const { revealed, reveal, hideSoon } = useTopEdgeReveal(AUTO_HIDE_BAR_HEIGHT);

  // The page's notch shows itself with the bar, from the page's own column
  // (`PageEdgeBar`); a bar that is gone is a bar that is shut.
  useEffect(() => {
    publishTitleBarRevealed(revealed);
    return () => publishTitleBarRevealed(false);
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
        // Windows zooms it — on frameless Linux that last part is ours to
        // supply. The buttons inside carry `app-no-drag`, without which the
        // drag region swallows their clicks in silence.
        className="app-drag flex items-center justify-end overflow-hidden px-1 transition-[height] duration-200 ease-out"
        onDoubleClick={dragZoneDoubleClick()}
        style={{ height: revealed ? AUTO_HIDE_BAR_HEIGHT : 0 }}
      >
        <WindowControls maximized={maximized} compact />
      </div>
    </div>
  );
};

export default AutoHideTitleBar;
