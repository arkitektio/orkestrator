import { useCommandPalette } from "@/core/command/CommandPaletteProvider";
import { CyclingPlaceholder } from "@/core/command/CyclingPlaceholder";
import { cn } from "@/core/util/utils";
import { Search } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * The rail's search field. Clicking it (or ⌘K) unfolds it into the palette.
 *
 * It deliberately does NOT show the current path — `PageLayout` already renders
 * breadcrumbs — only the cycling "Search… / Ask… / Do…" prompt.
 */
/**
 * Publish the pill's exact rect. The palette opens ON this spot and its top row
 * is a copy of this one, so the panel reads as this control grown rather than
 * as a second search field appearing next to it. Measured rather than assumed:
 * the rail's width is a token and the chrome above it changes height per
 * platform and in fullscreen.
 *
 * A plain function of the element rather than a closure stashed in a ref. It is
 * wanted from two different effects, and a ref holding a callback — written by
 * one effect so another can call it — is just a slower way of writing this.
 */
const publishOrigin = (element: HTMLElement | null) => {
  if (!element) return;
  const rect = element.getBoundingClientRect();
  const root = document.documentElement.style;
  root.setProperty("--palette-origin-width", `${rect.width}px`);
  root.setProperty("--palette-origin-height", `${rect.height}px`);
  root.setProperty("--palette-origin-top", `${rect.top}px`);
  root.setProperty("--palette-origin-left", `${rect.left}px`);
};

export const TitleSearchBar = () => {
  const { open, togglePalette } = useCommandPalette();
  const ref = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const publish = () => publishOrigin(element);
    publish();

    const observer = new ResizeObserver(publish);
    observer.observe(element);
    window.addEventListener("resize", publish);
    window.addEventListener("scroll", publish, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", publish);
      window.removeEventListener("scroll", publish, true);
    };
  }, []);

  // Re-measure on the way open. A `ResizeObserver` only fires when the pill
  // itself changes SIZE — if something above it in the rail changed height, the
  // pill has moved without resizing and the stored rect is stale, which would
  // open the panel a few pixels off the control it is supposed to be.
  useEffect(() => {
    if (open) publishOrigin(ref.current);
  }, [open]);

  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={open}
      aria-label="Search and run commands"
      title="Search and run commands"
      onClick={() => togglePalette({ fresh: true })}
      className={cn(
        // `app-no-drag` is mandatory: the zone around this is the window's only
        // drag region, and a drag region swallows the clicks of anything inside
        // it — without this the pill would be silently dead.
        "app-no-drag group flex h-8 w-full items-center gap-2 rounded-lg px-2.5",
        "border border-border/40 bg-background/40 text-xs text-muted-foreground",
        "transition-colors hover:border-border/70 hover:bg-background hover:text-foreground",
        // Hidden — not unmounted — while the palette is open. The panel is
        // drawn on this exact spot, so leaving the pill visible underneath
        // would show two search fields stacked. Keeping it in the layout means
        // the rail does not jump, and its rect stays measurable.
        "aria-expanded:invisible",
      )}
    >
      <Search className="h-3.5 w-3.5 shrink-0 opacity-70" />

      <CyclingPlaceholder className="min-w-0 flex-1 text-left opacity-70" />

      <kbd className="shrink-0 rounded border border-border/50 px-1 py-px text-[10px] tracking-wider opacity-0 transition-opacity group-hover:opacity-60">
        ⌘K
      </kbd>
    </button>
  );
};

export default TitleSearchBar;
