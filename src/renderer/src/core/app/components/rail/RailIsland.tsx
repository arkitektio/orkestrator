import { cn } from "@/core/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

/**
 * The rail's islands, and the vertical budget they share.
 *
 * An island is a soft card holding one compact row per piece of ambient,
 * long-running work — the shape the task island
 * (`rekuest/components/global/TaskNotificationStack`) established and which
 * uploads, downloads, local actions, the agent and app updates all now take.
 *
 * They live in the rail for the reason the task island does: this work is
 * ambient and outlives whatever surface started it, so it belongs in the
 * chrome that is always there rather than floating over the page, where it
 * covered content and moved with nothing.
 *
 * The rail is narrow and a file or action name can be any length, so every
 * part of a row either truncates or is `shrink-0`, and the `min-w-0` here is
 * what lets the rail's flex column keep its own width.
 */

/**
 * The column every island sits in.
 *
 * Each island caps its own height, but half a dozen of them busy at once would
 * still ask for more room than the rail has: the `nav` around them is
 * `flex-1 overflow-hidden` (`components/layout/AppLayout.tsx`), so the overflow
 * would be clipped in silence — taking `RailFooter` with it. One scroller for
 * all of them keeps that budget explicit: the stack scrolls, the footer stays,
 * and the tab list above competes for what is left.
 *
 * `overscroll-contain` so reaching the end of this scroller does not start
 * scrolling the tab list behind it.
 */
export const RailIslandStack = ({ children }: { children: React.ReactNode }) => (
  <div className="app-no-drag flex max-h-[60vh] min-h-0 shrink flex-col overflow-y-auto overscroll-contain">
    {children}
  </div>
);

/**
 * One island. Renders nothing — not even an empty card — when it has nothing
 * to say, so an idle rail carries no empty panels.
 */
export const RailIsland = ({
  show,
  islandKey,
  testId,
  maxHeightClassName = "max-h-[30vh]",
  children,
}: {
  show: boolean;
  /** Distinguishes the islands to `AnimatePresence`. */
  islandKey: string;
  testId?: string;
  /** Tighter cap for an island that is only ever one row. */
  maxHeightClassName?: string;
  children: React.ReactNode;
}) => (
  <AnimatePresence>
    {show && (
      <motion.div
        key={islandKey}
        initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: 8, filter: "blur(6px)" }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        // `app-no-drag`: the rail is a window-drag region, and a drag region
        // swallows the clicks of anything inside it that has not opted out.
        className="app-no-drag relative min-w-0 shrink-0 px-2 pb-2"
      >
        <div
          data-testid={testId}
          className={cn(
            "min-w-0 overflow-y-auto overflow-x-hidden rounded-xl border border-border/60 bg-background/90 shadow-md shadow-black/5 dark:shadow-black/30",
            maxHeightClassName,
          )}
        >
          <AnimatePresence initial={false}>{children}</AnimatePresence>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

/** One line in an island: folds in and out by height, hairline separators. */
export const RailIslandRow = ({
  working,
  testId,
  children,
}: {
  working: boolean;
  testId?: string;
  children: React.ReactNode;
}) => (
  <motion.div
    layout="position"
    initial={{ height: 0, opacity: 0 }}
    animate={{ height: "auto", opacity: 1 }}
    exit={{ height: 0, opacity: 0 }}
    transition={{ type: "spring", bounce: 0, duration: 0.35 }}
    className="min-w-0 overflow-hidden [&:not(:first-child)]:border-t [&:not(:first-child)]:border-border/50"
  >
    <div
      data-testid={testId}
      aria-busy={working}
      className="group relative min-w-0 px-2.5 py-2"
    >
      {/* The island's busy sweep: a soft band of light travelling across a row
          that is still working. */}
      {working && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-task-sweep"
        />
      )}
      {children}
    </div>
  </motion.div>
);

/** The name of a transfer: truncates, and dims once it is no longer moving. */
export const RailIslandName = ({
  name,
  working,
}: {
  name: string;
  working: boolean;
}) => (
  <span
    className={cn(
      "min-w-0 flex-1 truncate text-xs font-medium",
      !working && "text-foreground/70",
    )}
    title={name}
  >
    {name}
  </span>
);

/**
 * A hairline bar, or — before anything has moved — the travelling segment the
 * task island uses instead of a bar that would claim 0%.
 */
export const RailIslandProgress = ({
  progress,
  started,
}: {
  progress: number;
  started: boolean;
}) =>
  started ? (
    <div className="relative mt-1.5 h-1 w-full overflow-hidden rounded-md bg-muted">
      <div
        className="h-full rounded-md bg-primary transition-[width] duration-200"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  ) : (
    <div
      aria-hidden
      className="relative mt-1.5 h-1 w-full overflow-hidden rounded-md bg-muted"
    >
      <div className="h-full w-1/3 rounded-md bg-primary/70 animate-task-sweep" />
    </div>
  );
