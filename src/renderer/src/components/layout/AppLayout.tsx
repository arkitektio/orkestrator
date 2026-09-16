import { RailChrome, WindowsOverlayStrip } from "@/app/components/chrome/RailChrome";
import { RailResizer } from "@/app/components/chrome/RailResizer";

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
  return (
    <div className="flex flex-col bg-sidebar dark:text-white h-screen">
      {/* Windows only; nothing at all on macOS, Linux or the web. */}
      <WindowsOverlayStrip />

      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
      {/* Desktop rail — the only chrome this window has. */}
      <div className="relative flex-initial hidden md:flex md:flex-col md:w-(--rail-width) shrink-0">
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
      </div>

      {/* The floating content card. `min-h-0`/`min-w-0` keep its own scroll
          containers scrolling instead of growing the card past the window. */}
      <div className="flex-grow min-w-0 min-h-0 flex overflow-hidden z-2 bg-background md:rounded-xl md:border md:border-border/60 md:shadow-sm md:m-2 md:ml-0">
        {children}
      </div>
      </div>

      {/* Mobile navigation - bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-sidebar dark:border-gray-700 shadow-lg md:hidden">
        <nav
          aria-label="Modules"
          className="flex h-16 w-full min-w-0 flex-row items-center overflow-hidden px-1 py-3"
        >
          {navigationBar}
        </nav>
      </div>
    </div>
  );
};
