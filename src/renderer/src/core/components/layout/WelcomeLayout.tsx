import { AutoHideTitleBar } from "@/core/app/components/chrome/AutoHideTitleBar";
import { WindowControls } from "@/core/app/components/chrome/WindowControls";
import { UpdateIsland } from "@/core/app/updates/UpdateIsland";
import { dragZoneDoubleClick, getChromeMode, useWindowState } from "@/core/lib/platform";
import { cn } from "@/core/lib/utils";
import { useEffect } from "react";

export type WelcomeLayoutProps = {
  children: React.ReactNode;
};

/**
 * The window when nobody is signed in: the welcome screen, and nothing else.
 *
 * The rail is chrome for a session — modules, open tabs, the org
 * switcher — and every one of those is membership-scoped, so signed out it
 * would be a column of empty lists around a login form. This shell keeps only
 * what the WINDOW needs: the drag strip (the rail normally provides it, and
 * with no title bar there is no other way to move the window) and, on Linux,
 * our own window buttons. The card is the same inset card the app uses, so
 * signing in reads as the rail arriving, not as a different app.
 */
export const WelcomeLayout = ({ children }: WelcomeLayoutProps) => {
  const mode = getChromeMode();
  const { maximized } = useWindowState();

  // No pill to unfold from and nowhere to go: the palette's hotkeys are off
  // for the whole document while this is up. Uses the palette's own opt-out
  // (`[data-command-hotkey='off']`, matched with `closest` from the event
  // target) — on the body it covers keys pressed with nothing focused too.
  useEffect(() => {
    const previous = document.body.getAttribute("data-command-hotkey");
    document.body.setAttribute("data-command-hotkey", "off");
    return () => {
      if (previous === null) document.body.removeAttribute("data-command-hotkey");
      else document.body.setAttribute("data-command-hotkey", previous);
    };
  }, []);

  return (
    <div data-testid="welcome-layout" className="flex h-screen flex-col bg-sidebar text-foreground">
      {/* Windows only, and 0px tall until the pointer touches the top edge;
          nothing at all on macOS, Linux or the web. */}
      <AutoHideTitleBar />

      {/* The one strip of window surface: draggable, and on macOS wide
          enough for the traffic lights the system draws over it. */}
      <div
        data-testid="welcome-drag-strip"
        className={cn("flex h-10 shrink-0 items-center px-2", mode !== "none" && "app-drag")}
        onDoubleClick={dragZoneDoubleClick(mode)}
      >
        <div className="flex-1" />
        {mode === "buttons" && <WindowControls maximized={maximized} compact />}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-background mx-2 mb-2 rounded-xl border border-border/60 shadow-sm">
        {children}
      </div>

      {/* The one island that belongs here: an update downloads whether or not
          anyone is signed in, and there is no rail to put it in. Same component
          and same store as in the rail — only the container differs. */}
      <div className="app-no-drag pointer-events-none fixed bottom-2 left-2 z-50 w-72 [&>*]:pointer-events-auto">
        <UpdateIsland />
      </div>
    </div>
  );
};

export default WelcomeLayout;
