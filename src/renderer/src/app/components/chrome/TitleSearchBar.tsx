import { useCommandPalette } from "@/command/CommandPaletteProvider";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import React, { useEffect, useRef } from "react";
import useReactRouterBreadcrumbs from "use-react-router-breadcrumbs";

/**
 * The rail's search field — a browser's URL bar, in the place a browser puts it.
 *
 * At rest it shows where you are, which is why it reads as an address bar rather
 * than as a button: the palette is how you go somewhere, so the control that
 * opens it should say where "here" is. Clicking it (or ⌘K) unfolds it into the
 * palette.
 *
 * The trail is deliberately minimal — the last two crumbs, not the whole path.
 * `PageLayout` already renders the full breadcrumbs in its own header a few
 * pixels below, and repeating them in full would read as a bug; two crumbs is
 * enough to say "which thing, inside which module" at a glance.
 */
export const TitleSearchBar = () => {
  const { open, togglePalette } = useCommandPalette();
  const breadcrumbs = useReactRouterBreadcrumbs();
  const ref = useRef<HTMLButtonElement | null>(null);
  const publishRef = useRef<(() => void) | null>(null);

  // Publish the pill's exact rect. The palette opens ON this spot and its top
  // row is a copy of this one, so the panel reads as this control grown rather
  // than as a second search field appearing next to it. Measured rather than
  // assumed: the rail's width is a token and the chrome above it changes height
  // per platform and in fullscreen.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const publish = () => {
      const rect = element.getBoundingClientRect();
      const root = document.documentElement.style;
      root.setProperty("--palette-origin-width", `${rect.width}px`);
      root.setProperty("--palette-origin-height", `${rect.height}px`);
      root.setProperty("--palette-origin-top", `${rect.top}px`);
      root.setProperty("--palette-origin-left", `${rect.left}px`);
    };

    publishRef.current = publish;
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
    if (open) publishRef.current?.();
  }, [open]);

  const trail = React.useMemo(() => {
    const labels = breadcrumbs
      .map(({ breadcrumb }) => (typeof breadcrumb === "string" ? breadcrumb : undefined))
      // Non-string crumbs are components (a fetched entity's name, still
      // loading); skip rather than render a React element into the pill.
      .filter((label): label is string => Boolean(label));

    return labels.slice(-2);
  }, [breadcrumbs]);

  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={open}
      aria-label="Search and run commands"
      title={trail.join(" / ") || "Search and run commands"}
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

      <span className="flex min-w-0 flex-1 items-center gap-1 truncate text-left">
        {trail.length > 0 ? (
          trail.map((label, index) => (
            <React.Fragment key={`${label}-${index}`}>
              {index > 0 && (
                <span aria-hidden className="shrink-0 opacity-40">
                  /
                </span>
              )}
              <span
                className={cn(
                  "truncate",
                  // The leaf is where you are; its ancestor is context.
                  index === trail.length - 1 ? "text-foreground/80" : "opacity-60",
                )}
              >
                {label}
              </span>
            </React.Fragment>
          ))
        ) : (
          <span className="truncate opacity-70">Search Orkestrator</span>
        )}
      </span>

      <kbd className="shrink-0 rounded border border-border/50 px-1 py-px text-[10px] tracking-wider opacity-0 transition-opacity group-hover:opacity-60">
        ⌘K
      </kbd>
    </button>
  );
};

export default TitleSearchBar;
