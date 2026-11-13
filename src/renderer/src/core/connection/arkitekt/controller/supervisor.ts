import { isSuspect, retryAt, type Link } from "./link";

/**
 * Keeps the links honest after their first check.
 *
 * A service used to be checked once, when its session came up, and then
 * never again: a laptop that changed network kept "ready" services whose
 * address was dead, and a service that had failed stayed failed until the
 * user clicked retry (or the mesh happened to come up). The supervisor checks
 * again when there is a reason to:
 *
 *  - the network may have changed (`networkChanged`): every service, once,
 *    after things settled for a moment;
 *  - the mesh came up or went away (`meshUp` / `meshDown`);
 *  - a service's client keeps failing to reach it (`networkError`);
 *  - a service is down: again after 5 s, doubling, a minute at most
 *    (`link.ts`), while the window is visible.
 *
 * Every check it starts is quiet: a ready service stays ready and a failed
 * one stays failed while it runs, so nothing on screen flips for a check
 * nobody asked for. It decides WHEN; `check` (the controller) does the work.
 */

export type SupervisorDeps = {
  /** The live session's links, by service key. */
  links: () => Record<string, Link>;
  /** Check these services again, quietly. */
  check: (serviceKeys: string[]) => void;
  /** Is this service's current address behind the mesh? */
  onMesh?: (serviceKey: string) => boolean;
  now?: () => number;
  visible?: () => boolean;
  /** Called with a listener for "the window became visible again"; returns the unsubscribe. */
  onVisible?: (listener: () => void) => () => void;
};

/** A burst of network events (interfaces come up one by one) is one change. */
export const NETWORK_SETTLE_MS = 750;
/** A service whose client keeps failing is checked at most this often on that ground. */
export const SUSPECT_INTERVAL_MS = 10_000;

const documentVisible = () => typeof document === "undefined" || document.visibilityState !== "hidden";
const onDocumentVisible = (listener: () => void) => {
  if (typeof document === "undefined") return () => {};
  const handler = () => {
    if (document.visibilityState !== "hidden") listener();
  };
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
};

export const createSupervisor = ({
  links,
  check,
  onMesh = () => false,
  now = Date.now,
  visible = documentVisible,
  onVisible = onDocumentVisible,
}: SupervisorDeps) => {
  let settleTimer: ReturnType<typeof setTimeout> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  const suspectedAt = new Map<string, number>();

  const keysWhere = (test: (link: Link, key: string) => boolean): string[] =>
    Object.entries(links())
      .filter(([key, link]) => test(link, key))
      .map(([key]) => key);

  const run = (keys: string[]) => {
    if (!disposed && keys.length > 0) check(keys);
  };

  /** (Re)arm the one timer for the down link that is due first. */
  const schedule = () => {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = undefined;
    if (disposed) return;
    const due = Object.values(links())
      .map(retryAt)
      .filter((at): at is number => at !== undefined);
    if (due.length === 0) return;
    retryTimer = setTimeout(
      () => {
        retryTimer = undefined;
        // A hidden window does not keep knocking; `onVisible` picks it up again.
        if (!visible()) return;
        const at = now();
        run(keysWhere((link) => (retryAt(link) ?? Infinity) <= at));
        // Whatever was not due yet, or could not be checked.
        schedule();
      },
      Math.max(0, Math.min(...due) - now()),
    );
  };

  const stopWatchingVisibility = onVisible(schedule);

  return {
    /** The links changed (a check ended, a session came or went): re-plan the retries. */
    linksChanged: schedule,

    /** The network may have changed: check everything that has been checked, once it settled. */
    networkChanged: () => {
      if (disposed) return;
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        settleTimer = undefined;
        run(keysWhere((link) => link.phase === "up" || link.phase === "down"));
      }, NETWORK_SETTLE_MS);
    },

    /** The mesh node runs: what was down may answer now. */
    meshUp: () => run(keysWhere((link) => link.phase === "down")),

    /** The mesh node stopped: what was reached through it is not, any more. */
    meshDown: () => run(keysWhere((link, key) => link.phase === "up" && onMesh(key))),

    /** A service's client could not reach it; the link has already counted it. */
    networkError: (serviceKey: string) => {
      const link = links()[serviceKey];
      if (!link || !isSuspect(link)) return;
      const at = now();
      if (at - (suspectedAt.get(serviceKey) ?? -Infinity) < SUSPECT_INTERVAL_MS) return;
      suspectedAt.set(serviceKey, at);
      run([serviceKey]);
    },

    dispose: () => {
      disposed = true;
      if (settleTimer) clearTimeout(settleTimer);
      if (retryTimer) clearTimeout(retryTimer);
      stopWatchingVisibility();
    },
  };
};

export type Supervisor = ReturnType<typeof createSupervisor>;
