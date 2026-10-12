import { locationPathOf } from "@/core/tabs/tabs";
import { useActiveTabId, useSplit, useTabActions, useTabList } from "@/core/tabs/TabsProvider";
import { useSplitRatio } from "@/core/tabs/useSplitRatio";
import { getChromeMode } from "@/core/util/platform";
import { cn } from "@/core/util/utils";
import { AppWindow, Columns2, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { useTitleBarRevealed, useTopEdgeReveal } from "./useTopEdgeReveal";

/**
 * What a page can do from the window's top edge, on the edge of its card: a
 * notch that closes it, opens it in a window of its own, or splits it with a
 * new tab to its right. It shows when the
 * pointer is pushed against the top edge and the page ducks away. Split, each
 * pane carries its own, so "close" never has to guess which page was meant.
 *
 * What makes the page duck differs by platform:
 *
 * - **Windows and Linux** already have the gesture: `AutoHideTitleBar` slides
 *   down over the whole window. The notches rise from the cards into that bar
 *   and show with it; nothing else is drawn here.
 * - **macOS** keeps its real traffic lights on the rail, so there are no
 *   window buttons to show and the rail stays where the lights are: only the
 *   page card moves, by a bar of its own in the page's column. The strip it
 *   leaves is window surface, and draggable — a title bar over the page,
 *   which the Mac build otherwise has only over the rail.
 */

/** How far the page ducks on macOS, and how far a notch rises above its card anywhere. */
export const PAGE_EDGE_BAR_HEIGHT = 19;

/** The card's own top margin (`m-2` in `AppLayout`): the gap the notch crosses to reach it. */
const CARD_MARGIN = 8;

/**
 * The strip that opens the bar: all of the card's top margin. Deeper than the
 * other platforms' sentinel because a Mac window's top edge is no wall — the
 * pointer carries on into the menu bar, and has to be caught on the way.
 */
const SENTINEL_HEIGHT = CARD_MARGIN;

/**
 * Where a notch sits on its card's top edge: at the left, just past the
 * rounded corner, so its sides meet the straight run of the edge.
 */
const NOTCH_INSET = "1.25rem";

/**
 * How far from the page column's right edge a notch's left side keeps on
 * Windows and Linux, where the window buttons stand at that end of the title
 * bar: a very narrow right-hand pane would otherwise put its notch on top of
 * them.
 */
const WINDOW_BUTTONS_CLEARANCE = 160;

const notchButtonClass =
  "app-no-drag flex h-4.5 w-5.5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none";

const EdgeNotch = ({
  tabId,
  revealed,
  focused,
  reach,
  canSplit,
  clearRight,
  className,
  style,
}: {
  tabId: string;
  revealed: boolean;
  /** One pane of a split has focus, and wears the same edge as its card. */
  focused: boolean;
  /** From the bar's lower edge down onto the card's border, which the notch covers. */
  reach: number;
  /** Alone on screen, a page can take a partner; in a split both panes are taken. */
  canSplit: boolean;
  /** Keep the notch's left side this far from the cell's right edge, however narrow the pane. */
  clearRight?: number;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const { close, splitWith } = useTabActions();
  const tabs = useTabList();

  const openInWindow = () => {
    const tab = tabs.find((t) => t.id === tabId);
    // The tab's location as it is NOW: the history object is live.
    if (tab) window.api?.openSecondWindow(locationPathOf(tab));
  };

  return (
    <div className={cn("relative min-w-0", className)} style={style}>
      <div
        data-testid="page-edge-notch"
        data-tab-id={tabId}
        className={cn(
          // Hung from the card, not from the bar: it rides down with the page
          // and comes up out of the window's edge, rather than sliding over it.
          // `app-no-drag`: on Windows and Linux it stands on the title bar,
          // and a drag region is hit-tested beneath z-index.
          "app-no-drag absolute bottom-0 flex items-center gap-0.5 rounded-t-md border border-b-0 bg-background px-1 transition-[opacity,visibility] duration-200",
          focused ? "border-primary/40" : "border-border/60",
          // `invisible` takes the buttons out of the tab order too: shut,
          // there is nothing here to land on.
          revealed ? "pointer-events-auto opacity-100" : "invisible opacity-0",
        )}
        style={{
          height: PAGE_EDGE_BAR_HEIGHT + reach - 2,
          left: clearRight ? `max(0px, min(${NOTCH_INSET}, calc(100% - ${clearRight}px)))` : NOTCH_INSET,
        }}
      >
        <button type="button" aria-label="Close page" title="Close page" className={notchButtonClass} onClick={() => close(tabId)}>
          <X className="h-3.25 w-3.25" />
        </button>
        <button
          type="button"
          aria-label="Open in new window"
          title="Open in new window"
          className={notchButtonClass}
          onClick={openInWindow}
        >
          <AppWindow className="h-3.25 w-3.25" />
        </button>
        {canSplit && (
          <button
            type="button"
            aria-label="Split"
            title="Split: a new tab to the right"
            className={notchButtonClass}
            // A fresh new-tab page beside this one, which keeps the focus.
            onClick={() => splitWith(tabId)}
          >
            <Columns2 className="h-3.25 w-3.25" />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * The card's top margin, cell for cell what `TabOutlet` lays out below it, so
 * each notch stands on its own pane.
 */
const EdgeNotches = ({ revealed, clearRight }: { revealed: boolean; clearRight?: number }) => {
  const split = useSplit();
  const activeId = useActiveTabId();
  const ratio = useSplitRatio();

  // Split, the card steps back for two panes that sit a border's width inside
  // it (`AppLayout`, `TabOutlet`).
  const reach = CARD_MARGIN + (split ? 2 : 1);

  return (
    <div className="pointer-events-none absolute inset-x-2 top-full flex" style={{ height: reach }}>
      {split ? (
        <>
          <EdgeNotch
            tabId={split.left}
            revealed={revealed}
            focused={split.left === activeId}
            reach={reach}
            canSplit={false}
            className="shrink-0 grow-0"
            style={{ flexBasis: `calc(${ratio * 100}% - 0.25rem)` }}
          />
          <div className="w-2 shrink-0" />
          <EdgeNotch
            tabId={split.right}
            revealed={revealed}
            focused={split.right === activeId}
            reach={reach}
            canSplit={false}
            clearRight={clearRight}
            className="flex-1"
          />
        </>
      ) : (
        <EdgeNotch
          tabId={activeId}
          revealed={revealed}
          focused={false}
          reach={reach}
          canSplit
          clearRight={clearRight}
          className="flex-1"
        />
      )}
    </div>
  );
};

// Over the card (`z-2`): a notch covers the stretch of border it sits on.
const zoneClass = "relative z-3 shrink-0";

const MacPageEdgeBar = () => {
  const { revealed, reveal } = useTopEdgeReveal(PAGE_EDGE_BAR_HEIGHT + CARD_MARGIN);
  const zone = useRef<HTMLDivElement>(null);

  // A pointer thrown at the top edge can cross the sentinel between two
  // samples and be gone into the menu bar. Leaving the window through the top
  // of the page is the same request, so it opens the bar too; it closes as
  // ever, on the first move back down into the page.
  const revealRef = useRef(reveal);
  revealRef.current = reveal;
  useEffect(() => {
    const onLeave = (event: MouseEvent) => {
      const box = zone.current?.getBoundingClientRect();
      if (!box || event.clientY > SENTINEL_HEIGHT) return;
      if (event.clientX >= box.left && event.clientX <= box.right) revealRef.current();
    };
    const root = document.documentElement;
    root.addEventListener("mouseleave", onLeave);
    return () => root.removeEventListener("mouseleave", onLeave);
  }, []);

  return (
    <div ref={zone} className={zoneClass} onMouseEnter={reveal}>
      {/* Stays mounted once open and goes inert instead — see `AutoHideTitleBar`. */}
      <div
        aria-hidden
        data-testid="page-edge-sentinel"
        className={cn("app-no-drag absolute inset-x-0 top-0 z-50", revealed && "pointer-events-none")}
        style={{ height: SENTINEL_HEIGHT }}
      />

      <div
        data-testid="page-edge-bar"
        data-state={revealed ? "revealed" : "hidden"}
        // macOS zooms on a double-click of a drag region by itself.
        className="app-drag transition-[height] duration-200 ease-out"
        style={{ height: revealed ? PAGE_EDGE_BAR_HEIGHT : 0 }}
      />

      <EdgeNotches revealed={revealed} />
    </div>
  );
};

/** Windows and Linux: no bar of its own, only the notches, shown with the window's title bar. */
const TitleBarPageEdge = () => {
  const revealed = useTitleBarRevealed();
  return (
    <div className={zoneClass}>
      <EdgeNotches revealed={revealed} clearRight={WINDOW_BUTTONS_CLEARANCE} />
    </div>
  );
};

/** Nothing on the web, which has no frame of ours and no top edge to push against. */
export const PageEdgeBar = () => {
  const mode = getChromeMode();
  if (mode === "mac") return <MacPageEdgeBar />;
  if (mode === "autohide") return <TitleBarPageEdge />;
  return null;
};

export default PageEdgeBar;
