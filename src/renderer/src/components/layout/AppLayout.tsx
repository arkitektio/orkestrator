import { AutoHideTitleBar } from "@/app/components/chrome/AutoHideTitleBar";
import { RailChrome } from "@/app/components/chrome/RailChrome";
import { RailResizer } from "@/app/components/chrome/RailResizer";
import { RailDropOverlay, useRailDrop } from "@/app/components/navigation/RailDrop";
import { RightEdge } from "@/app/components/navigation/RightEdge";
import { dragZoneDoubleClick, getChromeMode } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { ChromeSurfaceProvider } from "./ChromeSurface";
import { PageDialogHost } from "./PageDialogHost";

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

  return (
    // `rail-glass-surface`: with the translucent sidebar on, this is the
    // desktop seen through the OS blur, with the sidebar colour laid back over
    // it at the share the transparency setting leaves (`index.css`).
    <div className="rail-glass-surface flex flex-col bg-sidebar text-foreground h-screen">
      {/* Windows only, and 0px tall until the pointer touches the top edge;
          nothing at all on macOS, Linux or the web. */}
      <ChromeSurfaceProvider>
        <div className="chrome-zoom shrink-0">
          <AutoHideTitleBar />
        </div>
      </ChromeSurfaceProvider>

      <div className="flex-1 min-h-0 flex flex-row">
      {/* The rail — the only chrome this window has. `chrome-zoom` pins it at
          native size while the page zooms (`ChromeSurface.tsx`); the provider
          lets the menus and tooltips it opens follow it out of their portals. */}
      <ChromeSurfaceProvider>
      <div
        ref={railDrop.ref}
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
          "chrome-zoom relative flex-initial flex flex-col w-(--rail-width) shrink-0",
          // ...except while a card is in the air, when the rail is a drop
          // target instead and the OS must stop swallowing the pointer.
          mode !== "none" && !railDrop.dragging && "app-drag",
          railDrop.dragging && "app-no-drag",
        )}
        onDoubleClick={dragZoneDoubleClick(mode)}
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
      <div className="relative isolate flex-grow min-w-0 min-h-0 flex overflow-hidden z-2 bg-background rounded-xl border border-border/60 shadow-sm m-2 [clip-path:inset(0_round_var(--radius-xl))] has-[[data-split-divider]]:bg-transparent has-[[data-split-divider]]:border-transparent has-[[data-split-divider]]:shadow-none has-[[data-split-divider]]:[clip-path:none]">
        {/* Dialogs opened from the page cover the card, not the rail beside it. */}
        <PageDialogHost>{children}</PageDialogHost>
      </div>

      {/* The right edge: nothing at rest, an "open to the side" drop band
          while a card is in the air. */}
      <RightEdge />
      </div>

    </div>
  );
};
