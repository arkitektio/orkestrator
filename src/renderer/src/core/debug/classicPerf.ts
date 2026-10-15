import type { ApolloClient, ApolloLink, Operation } from "@apollo/client";
import { getMainDefinition } from "@apollo/client/utilities";

/**
 * Opt-in recording of the app's NON-GPU work: what a session costs in
 * network operations, cache broadcasts and React commits, per tab.
 *
 * Built to measure the cascades this app is prone to — a hidden tab still
 * rendering, a task event re-rendering every card, a focus sweep refetching
 * every avatar — before and after fixing them. Nothing is counted (and
 * nothing is patched) unless a recording runs: `start()` wraps each Apollo
 * client's link and its cache's `broadcastWatches`, `stop()` puts them back
 * and returns the report. The per-tab `<Profiler>` in `TabOutlet` reports
 * through `noteCommit`, which is a no-op while not recording (and React only
 * calls it in development / profiling builds).
 *
 * Settings → Developer has the buttons (the report is also logged to the
 * console as tables).
 */

export type ClassicPerfReport = {
  durationMs: number;
  /** `service · kind name` → count (kind: query / mutation / subscription). */
  operations: Record<string, number>;
  /** service → cache broadcasts (each one re-reads every watched query). */
  broadcasts: Record<string, number>;
  /** tab id → commits while shown / hidden, and their render time. */
  commits: Record<string, { shown: number; hidden: number; shownMs: number; hiddenMs: number }>;
};

type Restore = () => void;

type Session = {
  startedAt: number;
  report: ClassicPerfReport;
  restore: Restore[];
};

let session: Session | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const bump = (record: Record<string, number>, key: string) => {
  record[key] = (record[key] ?? 0) + 1;
};

const kindOf = (operation: Operation) => {
  try {
    const definition = getMainDefinition(operation.query);
    return definition.kind === "OperationDefinition" ? definition.operation : "fragment";
  } catch {
    return "unknown";
  }
};

type Instrumentable = {
  link: ApolloLink;
  cache: { broadcastWatches?: (...args: unknown[]) => void };
};

const instrument = (service: string, client: Instrumentable, current: Session): Restore[] => {
  const restore: Restore[] = [];

  const link = client.link as ApolloLink & { request: ApolloLink["request"] };
  const request = link.request;
  link.request = function (operation, forward) {
    bump(current.report.operations, `${service} · ${kindOf(operation)} ${operation.operationName || "(anonymous)"}`);
    return request.call(this, operation, forward);
  };
  restore.push(() => {
    link.request = request;
  });

  const cache = client.cache as { broadcastWatches?: (...args: unknown[]) => void };
  const broadcast = cache.broadcastWatches;
  if (typeof broadcast === "function") {
    cache.broadcastWatches = function (...args: unknown[]) {
      bump(current.report.broadcasts, service);
      return broadcast.apply(this, args);
    };
    restore.push(() => {
      // The original lives on the prototype: drop the instance override.
      delete cache.broadcastWatches;
      if (cache.broadcastWatches !== broadcast) cache.broadcastWatches = broadcast;
    });
  }
  return restore;
};

export const classicPerf = {
  isRecording: () => session !== null,

  /** Start recording over every Apollo client in the service map. */
  start: (serviceMap: Record<string, { type?: string; client?: unknown } | undefined>) => {
    if (session) return;
    const current: Session = {
      startedAt: performance.now(),
      report: { durationMs: 0, operations: {}, broadcasts: {}, commits: {} },
      restore: [],
    };
    for (const [key, service] of Object.entries(serviceMap)) {
      if (service?.type !== "apollo" || !service.client) continue;
      current.restore.push(...instrument(key, service.client as ApolloClient<unknown> as Instrumentable, current));
    }
    session = current;
    notify();
  },

  /** Stop, un-patch everything, and hand back what was counted. */
  stop: (): ClassicPerfReport | null => {
    const current = session;
    if (!current) return null;
    session = null;
    current.restore.forEach((restore) => restore());
    current.report.durationMs = Math.round(performance.now() - current.startedAt);
    notify();
    return current.report;
  },

  /** `<Profiler onRender>` of a tab. Cheap no-op unless recording. */
  noteCommit: (tabId: string, visible: boolean, actualDuration: number) => {
    if (!session) return;
    const entry = (session.report.commits[tabId] ??= { shown: 0, hidden: 0, shownMs: 0, hiddenMs: 0 });
    if (visible) {
      entry.shown += 1;
      entry.shownMs += actualDuration;
    } else {
      entry.hidden += 1;
      entry.hiddenMs += actualDuration;
    }
  },

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** How big one service's Apollo cache is, and what a `gc()` over it costs. */
export type CacheSize = {
  service: string;
  /** Normalized objects, `ROOT_QUERY` included. */
  entities: number;
  /** Fields on `ROOT_QUERY`: one per distinct query root (and argument set) ever written. */
  rootFields: number;
  /** Length of the serialized cache: a rough size, not the heap it takes. */
  bytes: number;
  /** One `cache.gc()`, and how many objects it freed. */
  gcMs: number;
  collected: number;
};

/**
 * Size every Apollo cache and time one `gc()` on each — to tell whether the
 * cache is worth bounding at all, before building anything that does. Runs
 * synchronously (serializes each cache): call it at a quiet moment.
 */
export const measureCaches = (
  serviceMap: Record<string, { type?: string; client?: unknown } | undefined>,
): CacheSize[] => {
  const sizes: CacheSize[] = [];
  for (const [service, entry] of Object.entries(serviceMap)) {
    if (entry?.type !== "apollo" || !entry.client) continue;
    const cache = (entry.client as ApolloClient<unknown>).cache;
    const snapshot = cache.extract() as Record<string, Record<string, unknown> | undefined>;
    const bytes = JSON.stringify(snapshot).length;
    const started = performance.now();
    const collected = cache.gc().length;
    sizes.push({
      service,
      // `__META` is Apollo's bookkeeping (its extra root ids), not an object.
      entities: Object.keys(snapshot).filter((key) => key !== "__META").length,
      rootFields: Object.keys(snapshot.ROOT_QUERY ?? {}).filter((key) => key !== "__typename").length,
      bytes,
      gcMs: Math.round((performance.now() - started) * 10) / 10,
      collected,
    });
  }
  return sizes.sort((a, b) => b.bytes - a.bytes);
};

/** The report as rows, busiest first, for a table or the console. */
export const summarizeReport = (report: ClassicPerfReport) => {
  const seconds = Math.max(report.durationMs / 1000, 0.001);
  const sorted = (record: Record<string, number>) =>
    Object.entries(record)
      .sort(([, a], [, b]) => b - a)
      .map(([key, count]) => ({ key, count, perSecond: Math.round((count / seconds) * 10) / 10 }));
  return {
    seconds: Math.round(seconds * 10) / 10,
    operations: sorted(report.operations),
    broadcasts: sorted(report.broadcasts),
    commits: Object.entries(report.commits)
      .map(([tab, c]) => ({ tab, ...c, shownMs: Math.round(c.shownMs), hiddenMs: Math.round(c.hiddenMs) }))
      .sort((a, b) => b.shownMs + b.hiddenMs - (a.shownMs + a.hiddenMs)),
  };
};
