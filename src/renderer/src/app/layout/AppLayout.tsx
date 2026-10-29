import { AutoHideTitleBar } from "@/app/components/chrome/AutoHideTitleBar";
import { PageEdgeBar } from "@/app/components/chrome/PageEdgeBar";
import { RailChrome } from "@/app/components/chrome/RailChrome";
import { RailBackdrop } from "@/app/components/chrome/RailBackdrop";
import { RailResizer } from "@/app/components/chrome/RailResizer";
import { useRailFloatShortcut, useRailFloating } from "@/app/components/chrome/railFloat";
import { useRailFloatReveal } from "@/app/components/chrome/useRailFloatReveal";
import { RailDropOverlay, useRailDrop } from "@/app/components/navigation/RailDrop";
import { RightEdge } from "@/app/components/navigation/RightEdge";
import { dragZoneDoubleClick, getChromeMode, useWindowState } from "@/core/util/platform";
import { cn } from "@/core/util/utils";
import { useCallback, useEffect, useRef } from "react";
import { ChromeSurfaceProvider } from "../../core/ui/ChromeSurface";
import { PageDialogHost } from "../../core/dialogs/PageDialogHost";
import { PageSidebarShortcut } from "@/core/layout/pageSidebarToggle";

export type AppLayoutProps = {
  navigationBar: React.ReactNode;
  children: React.ReactNode;
};

/**
 * One continuous surface, with the content floating on it.
 *
 * There is deliberately no title bar row. The window's own chrome — the traffic
 * lights, the drag region, the search pill — lives at the top of the rail, so
 * the rail and the window background read as a single material and the content
 * area sits on top of it as an inset, rounded card. A horizontal bar would put
 * back the hard divide this shape exists to remove.
 *
 * The inset is what makes it work: the gap around the card is the window
 * surface showing through, which is why the outer element is `bg-sidebar` and
 * the card is `bg-background`.
 */
export const AppLayout = ({ children, navigationBar }: AppLayoutProps) => {
  const mode = getChromeMode();
  // The whole rail takes a dropped card, and gives up its drag region to do it
  // — see `RailDrop.tsx`.
  const railDrop = useRailDrop();

  // Floating: the rail leaves the layout and slides in over the page from the
  // left edge (`railFloat.ts`, `useRailFloatReveal.ts`). The SAME element in
  // the same place either way, only its classes change, so docking or floating
  // never remounts the rail and re-runs everything in it.
  useRailFloatShortcut();
  const floating = useRailFloating();
  const railRef = useRef<HTMLDivElement | null>(null);
  const { revealed, reveal } = useRailFloatReveal({ floating, dragging: railDrop.dragging, railRef });
  const tucked = floating && !revealed;
  const attachDrop = railDrop.ref;
  const setRailRef = useCallback(
    (element: HTMLDivElement | null) => {
      railRef.current = element;
      attachDrop(element);
    },
    [attachDrop],
  );

  // macOS draws the traffic lights at the window's top-left, which is the
  // page card's corner while the rail is tucked away: they go with the rail
  // and come back as it slides in. Fullscreen leaves them alone, in the
  // hover-down title bar.
  const { fullscreen } = useWindowState();
  const lightsVisible = fullscreen || !tucked;
  useEffect(() => {
    if (mode !== "mac") return;
    window.api?.windowControls?.setWindowButtonsVisible?.(lightsVisible);
  }, [mode, lightsVisible]);
  useEffect(
    () => () => {
      if (mode === "mac") window.api?.windowControls?.setWindowButtonsVisible?.(true);
    },
    [mode],
  );

  return (
    // `rail-glass-surface`: with the translucent sidebar on, this is the
    // desktop seen through the OS blur, with the sidebar colour laid back over
    // it at the share the transparency setting leaves (`index.css`).
    //
    // `isolate`: the backdrop sits at -z-10 INSIDE this element, over the
    // window surface and under everything on it, so it spans the whole chrome:
    // behind the rail and in the frame around the page card (and between the
    // two cards of a split), the same material all the way round.
    <div className="rail-glass-surface relative isolate flex flex-col bg-sidebar text-foreground h-screen">
      <RailBackdrop />
      <PageSidebarShortcut />
      {/* Windows and Linux only, and 0px tall until the pointer touches the
          top edge; nothing at all on the web. macOS has its own, over the
          page alone (`PageEdgeBar`, below). */}
      <ChromeSurfaceProvider>
        <div className="chrome-zoom shrink-0">
          <AutoHideTitleBar />
        </div>
      </ChromeSurfaceProvider>

      {/* `relative`: the floating rail is placed against this row. */}
      <div className="relative flex-1 min-h-0 flex flex-row">
      {/* The floating rail's handle: the window's left edge. A few pixels of
          the frame around the page card, never the card itself, so it takes
          nothing from the page. A card dragged here brings the rail out too,
          so it can still be dropped there as a tab. */}
      {tucked && (
        <div
          aria-hidden
          data-testid="rail-float-sentinel"
          className="app-no-drag absolute inset-y-0 left-0 z-30 w-1.5"
          onPointerEnter={reveal}
          onDragEnter={reveal}
        />
      )}
      {/* The rail — the only chrome this window has. `chrome-zoom` pins it at
          native size while the page zooms (`ChromeSurface.tsx`); the provider
          lets the menus and tooltips it opens follow it out of their portals. */}
      <ChromeSurfaceProvider>
      <div
        ref={setRailRef}
        data-rail-floating={floating ? (revealed ? "revealed" : "tucked") : undefined}
        // Tucked away it is off-screen, and must not be tabbed into either.
        inert={tucked}
        // No fill and no hairline of its own: the rail IS the window surface,
        // and a tint a few percent off `bg-sidebar` read as a seam beside the
        // chrome around the page. What sets the rail apart is the content
        // card floating next to it, not a colour.
        //
        // And because it IS the window surface, all of it drags the window, not
        // just the chrome row at the top: the gaps between the module tiles, the
        // run of empty rail below the open tabs, the margins either side of the
        // footer. Every interactive block inside carries `app-no-drag` (the
        // module grid, the tab list, the task stack, the footer, the resizer) —
        // a drag region swallows clicks in silence, so that opt-out is
        // load-bearing, and `RailChrome.test.tsx` asserts it.
        className={cn(
          // `isolate`: the rail's own overlays (resizer, drop target) stack
          // among themselves, not against the page card.
          "chrome-zoom isolate flex flex-col w-(--rail-width)",
          floating
            ? // Over the page, as a drawer: flush with the window's edges, so its
              // top row is exactly where the docked rail's is and the macOS
              // traffic lights land in it without being moved (moving them is
              // not reliable: AppKit puts them back on its own relayouts).
              // Opaque (the glass and backdrop are behind the page, not behind
              // this), and never a drag region of its own — over the page that
              // would hide the pointer from the move that puts it away. Its top
              // row still drags the window while it is out; tucked away, not
              // even that (`index.css`).
              cn(
                "absolute inset-y-0 left-0 z-40 rounded-r-xl border-r border-page-edge bg-sidebar shadow-xl transition-transform duration-200 ease-out",
                tucked && "-translate-x-[calc(100%+1rem)]",
              )
            : cn(
                "relative flex-initial shrink-0",
                // ...except while a card is in the air, when the rail is a drop
                // target instead and the OS must stop swallowing the pointer.
                mode !== "none" && !railDrop.dragging && "app-drag",
                railDrop.dragging && "app-no-drag",
              ),
          floating && railDrop.dragging && "app-no-drag",
        )}
        onDoubleClick={dragZoneDoubleClick()}
      >
        <RailChrome />
        {/* A plain `nav`, deliberately NOT shadcn's `NavigationMenu`. That
            primitive's root is `max-w-max … items-center justify-center`: it
            sizes itself to its CONTENT and centres it, which was right when
            this rail was a strip of icons and is wrong now that it holds lists.
            It silently defeated every `w-full`/`min-w-0` beneath it, so a long
            pinned label grew its row past the rail and spilled out of BOTH
            sides — clipped on the left, over the content on the right. */}
        <nav
          aria-label="Modules and pinned pages"
          className="flex min-h-0 w-full min-w-0 flex-1 flex-col items-stretch overflow-hidden px-1 pb-3"
        >
          {navigationBar}
        </nav>
        <RailResizer />
        {railDrop.dragging && <RailDropOverlay isOver={railDrop.isOver} />}
      </div>
      </ChromeSurfaceProvider>

      {/* The page's column. `PageEdgeBar` puts a notch on the card's top edge
          (close the page, open it in a window) while the pointer is against
          the window's: with the title bar above on Windows and Linux, and on
          macOS with a bar of its own in here, so the page ducks and the rail,
          which holds the traffic lights, stays put. Nothing on the web. */}
      <div className="flex min-h-0 min-w-0 flex-grow flex-col">
      <PageEdgeBar />

      {/* The floating content card. `min-h-0`/`min-w-0` keep its own scroll
          containers scrolling instead of growing the card past the window.

          Split view (`TabOutlet`) puts a divider in here, and then each pane
          is its own card: this one gives up its fill, border and shadow so the
          window surface shows through the gap between the two — the same
          material as around them. A `has-` variant rather than a prop, so the
          layout need not know about tabs.

          `isolate` and the `clip-path`: `overflow-hidden` alone does not hold
          a composited descendant — a scene's canvas, anything transformed or
          backdrop-blurred — inside rounded corners in Chromium; it paints
          square over them. A clip-path clips every layer, and the isolation
          keeps the page's stacking inside the card. Split, the panes clip
          themselves the same way (`TabOutlet`), so this one steps back. */}
      <div className="relative isolate flex-1 min-w-0 min-h-0 flex overflow-hidden z-2 bg-background rounded-xl border border-page-edge shadow-sm m-2 [clip-path:inset(0_round_var(--radius-xl))] has-[[data-split-divider]]:bg-transparent has-[[data-split-divider]]:border-transparent has-[[data-split-divider]]:shadow-none has-[[data-split-divider]]:[clip-path:none]">
        {/* Dialogs opened from the page cover the card, not the rail beside it. */}
        <PageDialogHost>{children}</PageDialogHost>
      </div>
      </div>

      {/* The right edge: nothing at rest, an "open to the side" drop band
          while a card is in the air. */}
      <RightEdge />
      </div>

    </div>
  );
};
