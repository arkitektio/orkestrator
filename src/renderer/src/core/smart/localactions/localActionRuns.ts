import { LucideIcon } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

/**
 * Every local action currently running, wherever it was started from.
 *
 * A local action used to live entirely inside the row that fired it: its
 * progress and its `AbortController` were `useState` in `usePerformAction`. The
 * two surfaces that call it — the cmdk row in the smart popover and
 * `LocalActionButton` — both unmount the moment the action starts doing
 * anything interesting (selecting the row closes the popover). The action kept
 * running with nobody able to see it and, worse, nobody able to cancel it: the
 * controller went with the unmounted component. Clicking again did not abort
 * it either, it started a SECOND run.
 *
 * So the run lives here instead — module level, like `agent/store.ts` and
 * `rekuest/lib/taskNotifications.ts`. There is exactly one registry per app, it
 * has to outlive every mount, and a module store is directly testable with no
 * React. The rail island renders from it, and a row that comes back re-attaches
 * to its own run through {@link selectRunForKey}.
 */

export type LocalActionRunStatus = "running" | "completed" | "error";

export type LocalActionRun = {
  id: string;
  /**
   * What a remounted row re-attaches to: the registry id of the action, or its
   * title when there is none. NOT the run id — the row does not know that.
   */
  key: string;
  title: string;
  icon?: LucideIcon;
  /** Undefined until the action reports its first progress. */
  progress?: number;
  status: LocalActionRunStatus;
  error?: string;
  startedAt: number;
  controller: AbortController;
};

export type LocalActionRunState = {
  runs: LocalActionRun[];
};

/**
 * How long a finished run stays before it clears itself. The same eight
 * seconds an upload and a quietly finished task get — long enough to read,
 * short enough not to accumulate.
 */
const COMPLETED_RUN_TTL_MS = 8000;

/**
 * Hard cap on the list. A failure persists until it is dismissed (see below),
 * and each run pins an `AbortController`, so an app that fails an action every
 * minute would otherwise grow one forever. Same bounded-history reasoning as
 * `MAX_DISMISSED` in `rekuest/lib/taskNotifications.ts`.
 */
const MAX_RUNS = 20;

export const localActionRunStore = createStore<LocalActionRunState>(() => ({
  runs: [],
}));

const setRuns = (update: (runs: LocalActionRun[]) => LocalActionRun[]) =>
  localActionRunStore.setState((state) => ({ runs: update(state.runs) }));

/** Drop the oldest finished run once the list is over the cap. Never a live one. */
const evictOverflow = (runs: LocalActionRun[]): LocalActionRun[] => {
  if (runs.length <= MAX_RUNS) return runs;
  const index = runs.findIndex((run) => run.status !== "running");
  // All of them running: leave it alone rather than abandon live work.
  if (index === -1) return runs;
  return [...runs.slice(0, index), ...runs.slice(index + 1)];
};

export const startLocalActionRun = ({
  key,
  title,
  icon,
}: {
  key: string;
  title: string;
  icon?: LucideIcon;
}): { id: string; controller: AbortController } => {
  const id = uuidv4();
  const controller = new AbortController();
  setRuns((runs) =>
    evictOverflow([
      ...runs,
      {
        id,
        key,
        title,
        icon,
        status: "running",
        startedAt: Date.now(),
        controller,
      },
    ]),
  );
  return { id, controller };
};

export const setLocalActionRunProgress = (id: string, progress: number) =>
  setRuns((runs) =>
    runs.map((run) => (run.id === id ? { ...run, progress } : run)),
  );

export const finishLocalActionRun = (
  id: string,
  outcome: { status: "completed" | "error"; error?: string },
) => {
  setRuns((runs) =>
    runs.map((run) =>
      run.id === id
        ? {
            ...run,
            status: outcome.status,
            error: outcome.error,
            progress: outcome.status === "completed" ? 100 : run.progress,
          }
        : run,
    ),
  );

  // A failure stays until it is dismissed: it may have happened behind a
  // popover that closed seconds ago, and the island is the only place it will
  // ever be read. A success clears itself.
  if (outcome.status === "completed") {
    setTimeout(() => removeRun(id), COMPLETED_RUN_TTL_MS);
  }
};

const removeRun = (id: string) =>
  setRuns((runs) => runs.filter((run) => run.id !== id));

/** Stop the action and take its row away — a cancel leaves nothing behind. */
export const cancelLocalActionRun = (id: string) => {
  const run = localActionRunStore.getState().runs.find((r) => r.id === id);
  run?.controller.abort();
  removeRun(id);
};

/** Take the row away without stopping anything (the X on a failed run). */
export const dismissLocalActionRun = (id: string) => removeRun(id);

/**
 * The run a row with this key should show: the newest one still going. A
 * finished run is deliberately ignored, so a row that comes back after its
 * action succeeded offers to run it again rather than showing a stale bar.
 */
export const selectRunForKey = (
  state: LocalActionRunState,
  key: string,
): LocalActionRun | undefined => {
  for (let index = state.runs.length - 1; index >= 0; index--) {
    const run = state.runs[index];
    if (run.key === key && run.status === "running") return run;
  }
  return undefined;
};

export const useLocalActionRuns = <T,>(selector: (state: LocalActionRunState) => T): T =>
  useStore(localActionRunStore, selector);

/** Test seam: drop everything, without aborting. */
export const resetLocalActionRuns = () =>
  localActionRunStore.setState({ runs: [] });
