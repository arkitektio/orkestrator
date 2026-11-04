import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon, type LucideIcon } from "lucide-react";

import { cn } from "@/core/util/utils";

/** How a pane was entered: by a click on its row, or by typing on the root. */
export type PaneEntry = { typed?: string };

export interface FloatMenuEntry {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Muted, right of the label: a count, what it runs with. */
  hint?: ReactNode;
  /** Drawn in the brand hue: what needs an answer (staged layers). */
  accent?: boolean;
  /** Left out of the root entirely. */
  hidden?: boolean;
  /** The pane, rendered only while open. */
  content: (entry: PaneEntry) => ReactNode;
}

const SLIDE = { type: "spring", bounce: 0, duration: 0.25 } as const;

/**
 * A float's body as a drill-in menu: a few rows at the root, each sliding in
 * its own pane with a way back. One thing on screen at a time, so the float
 * stays small and its hierarchy reads at a glance — which the card that
 * stacked every list on one page did not.
 *
 * - The root shows `summary` (one muted line of context) above the rows.
 * - A pane slides in from the right, the root back from the left; the height
 *   follows the content.
 * - Escape inside a pane goes back first (the float's own Escape is the next
 *   one). Typing a character on the root opens `typeTo` and hands it the
 *   character, so a click-opened card is still type-to-search.
 *
 * Controlled (`pane`, `onPaneChange`) so the float can send it back to the
 * root, e.g. when it closes the pane's subject.
 */
export const FloatMenu = ({
  entries,
  pane,
  onPaneChange,
  summary,
  typeTo,
  autoFocus,
}: {
  entries: FloatMenuEntry[];
  pane: string | null;
  onPaneChange: (pane: string | null, entry?: PaneEntry) => void;
  summary?: ReactNode;
  /** The entry a character typed on the root opens. */
  typeTo?: string;
  /** Focus the first row (a click opened the float: the keyboard is meant for it). */
  autoFocus?: boolean;
}) => {
  const [entered, setEntered] = useState<PaneEntry>({});
  const shown = entries.filter((entry) => !entry.hidden);
  const open = pane ? shown.find((entry) => entry.id === pane) : undefined;
  const rootRef = useRef<HTMLDivElement>(null);

  // A pane whose entry went away (staged layers all kept) falls back to the root.
  useEffect(() => {
    if (pane && !open) onPaneChange(null);
  }, [pane, open, onPaneChange]);

  useEffect(() => {
    if (autoFocus && !pane) rootRef.current?.querySelector<HTMLButtonElement>("button[data-float-row]")?.focus();
    // Only when the float first opens: later the user is somewhere else.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (id: string | null, entry: PaneEntry = {}) => {
    setEntered(entry);
    onPaneChange(id, entry);
  };

  // The body's height, measured, so the spring follows the pane swap.
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  useEffect(() => {
    const node = innerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setHeight(node.offsetHeight));
    observer.observe(node);
    setHeight(node.offsetHeight);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      className="overflow-hidden"
      animate={{ height }}
      transition={SLIDE}
      onKeyDown={(event) => {
        if (event.key === "Escape" && pane && !event.defaultPrevented) {
          event.preventDefault();
          go(null);
          return;
        }
        // Type-to-search from the root: the first character opens the pane it is for.
        if (
          !pane &&
          typeTo &&
          event.key.length === 1 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey &&
          event.key.trim() !== ""
        ) {
          event.preventDefault();
          go(typeTo, { typed: event.key });
        }
      }}
    >
      <div ref={innerRef}>
        <AnimatePresence initial={false} mode="popLayout" custom={pane ? 1 : -1}>
          {open ? (
            <motion.div
              key={open.id}
              custom={1}
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={SLIDE}
            >
              <div className="flex items-center gap-1.5 border-t border-border/60 px-2 py-1.5">
                <button
                  type="button"
                  className="flex h-7 items-center gap-0.5 rounded-md pl-1 pr-2 text-xs text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => go(null)}
                  aria-label="Back"
                >
                  <ChevronLeftIcon className="h-3.5 w-3.5" />
                  Back
                </button>
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{open.label}</span>
              </div>
              <div className="max-h-[min(28rem,65vh)] overflow-y-auto">{open.content(entered)}</div>
            </motion.div>
          ) : (
            <motion.div
              key="root"
              ref={rootRef}
              initial={{ x: "-30%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-30%", opacity: 0 }}
              transition={SLIDE}
              className="flex flex-col"
            >
              {summary && <div className="px-3 pb-2.5 pt-1 text-xs text-muted-foreground empty:hidden">{summary}</div>}
              <ul className="flex flex-col gap-0.5 border-t border-border/60 p-1.5">
                {shown.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      data-float-row
                      className={cn(
                        "group flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-xs outline-none hover:bg-muted focus-visible:bg-muted",
                        entry.accent && "text-primary",
                      )}
                      onClick={() => go(entry.id)}
                    >
                      <entry.icon className={cn("h-3.5 w-3.5 shrink-0", !entry.accent && "text-muted-foreground")} />
                      <span className="min-w-0 flex-1 truncate font-medium">{entry.label}</span>
                      {entry.hint != null && (
                        <span className={cn("shrink-0 tabular-nums", entry.accent ? "text-primary/80" : "text-muted-foreground")}>
                          {entry.hint}
                        </span>
                      )}
                      <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
