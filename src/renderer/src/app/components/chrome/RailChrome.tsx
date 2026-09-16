import { getChromeMode, trafficLightGutter, useWindowState } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Check, RotateCw, Share2 } from "lucide-react";

import { useActiveTabNavigation } from "@/command/tabs/useActiveTabNavigation";
import { useCopyUniversalLink } from "@/hooks/use-copy-universal-link";
import { TitleSearchBar } from "./TitleSearchBar";
import { WindowControls } from "./WindowControls";

/**
 * The window's chrome, with no title bar.
 *
 * There is no horizontal bar anywhere in this app: the traffic lights sit
 * directly on the rail's surface and the rail IS the chrome, so the window reads
 * as one continuous surface with the content floating on top of it. A title bar
 * row would reintroduce exactly the hard horizontal divide this shape exists to
 * remove.
 *
 * Two rows: the lights and the navigation controls share the first, the search
 * pill gets the second. The consequence of having no bar is that dragging lives
 * here — `app-drag` on this zone is the only way to move the window, which makes
 * the `app-no-drag` on every control up here load-bearing rather than
 * defensive. A drag region swallows clicks silently.
 */

const navButtonClass =
  "app-no-drag flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent";

/**
 * Back, forward, reload, share — the row above the search, as a browser has.
 *
 * Each tab has a memory history of its own, which — unlike the old
 * `HashRouter` — knows its depth. So Back and Forward are greyed at the ends
 * rather than silently doing nothing. Share copies the active tab's universal
 * link (`lib/universalLink.ts`): the one URL that opens this page from a chat
 * or an email, whatever machine it is read on.
 */
const NavButtons = () => {
  const { back, forward, canGoBack, canGoForward, location } = useActiveTabNavigation();
  const { copy, copied } = useCopyUniversalLink(location);

  const reload = () => {
    if (window.api) {
      void window.api.reloadWindow();
    } else {
      window.location.reload();
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Back"
        className={navButtonClass}
        disabled={!canGoBack}
        onClick={back}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Forward"
        className={navButtonClass}
        disabled={!canGoForward}
        onClick={forward}
      >
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Reload"
        className={navButtonClass}
        onClick={reload}
      >
        <RotateCw className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Share"
        title={copied ? "Link copied" : "Copy a link to this page"}
        className={navButtonClass}
        onClick={() => void copy()}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Share2 className="h-3.5 w-3.5" />}
      </button>
    </>
  );
};

export const RailChrome = () => {
  const mode = getChromeMode();
  const { fullscreen, maximized } = useWindowState();

  const gutter = trafficLightGutter(mode, fullscreen);

  return (
    <div className={cn("flex shrink-0 flex-col gap-1.5 px-2 pb-2 pt-2", mode !== "none" && "app-drag")}>
      <div className="flex h-7 items-center gap-0.5">
        {/* Horizontal room for the real traffic lights, which macOS draws over
            this surface. Collapses in fullscreen, where it removes them —
            otherwise the controls beside them would sit permanently indented. */}
        {gutter > 0 && (
          <div
            aria-hidden
            data-testid="traffic-light-gutter"
            className="shrink-0 transition-[width] duration-150"
            style={{ width: gutter }}
          />
        )}

        <NavButtons />

        <div className="flex-1" />

        {/* Linux is the one genuinely frameless platform, so it is the one that
            needs us to supply these — inline here rather than stranded at the
            foot of the rail. */}
        {mode === "buttons" && <WindowControls maximized={maximized} compact />}
      </div>

      <TitleSearchBar />
    </div>
  );
};

/**
 * A thin drag strip across the top of the window — Windows only.
 *
 * Windows keeps its own Controls Overlay buttons (which is what preserves Snap
 * Layouts), and the system draws them at the top-right of the window. With no
 * title bar they would land on top of the floating content card, over whatever
 * that page puts in its own header. This strip pushes the rail and the card down
 * by the overlay's height so the buttons have somewhere to be, and doubles as
 * the drag region.
 *
 * It is the one concession this layout makes to a platform: 32px of empty
 * surface, the same colour as everything around it.
 */
export const WindowsOverlayStrip = () => {
  const mode = getChromeMode();

  if (mode !== "overlay") {
    return null;
  }

  return (
    <div
      aria-hidden
      className="app-drag w-full shrink-0"
      style={{ height: "env(titlebar-area-height, 32px)" }}
    />
  );
};
