import { QuickPalette } from "@/core/command/QuickPalette";
import { useEffect, useRef } from "react";

import { Arkitekt } from "./Arkitekt";

const palette = () => window.api?.palette;

/**
 * Does this body child count as an overlay the bar must make room for?
 * Radix dialogs, popovers, menus and the "Run on" picker all portal to
 * `body`; tooltips do too, but they are hover noise and must not resize the
 * window every time the pointer crosses a row.
 */
export const isOverlayElement = (el: Element): boolean => {
  if (el.id === "root") return false;
  if (["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT", "LINK"].includes(el.tagName)) return false;
  if ((el as HTMLElement).hidden) return false;
  if (el.querySelector('[role="tooltip"]')) return false;
  return el.childElementCount > 0;
};

/**
 * The floating quick bar's whole UI (`?role=quick`, QuickPaletteWindow in
 * main): the palette panel at the top centre of a transparent window.
 *
 * - The window follows the panel's height (`resizeQuick`), so the bar is only
 *   as tall as its results.
 * - While any overlay is open (a dialog, the "Run on" picker, a confirm) it
 *   asks for the expanded size and holds itself open through blurs — a file
 *   picker or a dialog taking focus must not hide the bar mid-action.
 * - A click on the transparent margin hides it, like a click outside.
 */
export const QuickShell = () => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const hasProfile = Arkitekt.useHasActiveProfile();

  // Only the panel paints.
  useEffect(() => {
    document.documentElement.classList.add("quick-window");
    return () => document.documentElement.classList.remove("quick-window");
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    let expanded = false;
    const report = () => {
      // + the shell's padding, so the panel's shadow is not clipped.
      palette()?.resizeQuick?.({ height: panel.offsetHeight + 16, expanded });
    };
    const checkOverlays = () => {
      const next = [...document.body.children].some(isOverlayElement);
      if (next === expanded) return;
      expanded = next;
      palette()?.keepQuickOpen?.(next);
      report();
    };
    const resizes = new ResizeObserver(report);
    resizes.observe(panel);
    const overlays = new MutationObserver(checkOverlays);
    overlays.observe(document.body, { childList: true, subtree: true });
    report();
    return () => {
      resizes.disconnect();
      overlays.disconnect();
    };
  }, []);

  return (
    <div
      className="flex h-screen w-screen justify-center p-2"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) palette()?.hideQuick?.();
      }}
    >
      <div
        ref={panelRef}
        className="h-fit w-[664px] max-w-full overflow-hidden rounded-xl border border-border/50 bg-background/95 text-foreground shadow-2xl"
      >
        {hasProfile ? (
          <Arkitekt.Guard
            bootingFallback={<QuickNotice>Starting…</QuickNotice>}
            connectingFallback={<QuickNotice>Connecting…</QuickNotice>}
            notConnectedFallback={<SignInNotice />}
          >
            <QuickPalette />
          </Arkitekt.Guard>
        ) : (
          <SignInNotice />
        )}
      </div>
    </div>
  );
};

const QuickNotice = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-12 items-center px-4 text-sm text-muted-foreground">{children}</div>
);

const SignInNotice = () => (
  <button
    type="button"
    className="flex h-12 w-full items-center px-4 text-left text-sm text-muted-foreground hover:text-foreground"
    onClick={() => palette()?.openInMain?.("/")}
  >
    Sign in to Orkestrator to search — open the app
  </button>
);

export default QuickShell;
