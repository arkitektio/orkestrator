import { describeError, isAbort } from "@/core/notify/describeError";
import { formatArg, redactText, redactValue } from "./redact";

/**
 * What the app remembers about its last few minutes, so a bug report can say
 * what went wrong and how the user got there.
 *
 * Kept in memory, in this window, in bounded rings. Nothing here leaves the
 * computer by itself: it goes out only inside a report the user files, after
 * a preview where each part can be left out. Everything is redacted on the
 * way in (`redact.ts`), so the buffer never holds a credential.
 *
 * Plain module state: recording must work before React mounts, outside any
 * provider, and from an Apollo link.
 */
export type RecordedError = {
  at: number;
  /** The page it happened on. */
  route: string | null;
  /** Where it surfaced. */
  source: "toast" | "dialog" | "page" | "uncaught";
  /** What failed, when the caller said: "Couldn't move the folder". */
  title?: string;
  /** The sentence the user saw. */
  message: string;
  /** The raw text behind it (codes, paths, stack). */
  technical: string;
};

export type RecordedRequest = {
  at: number;
  route: string | null;
  service: string;
  operation: string;
  kind: string;
  variables?: unknown;
  /** HTTP status when the transport answered with one. */
  status: number | null;
  message: string;
};

export type RecordedConsole = {
  at: number;
  level: "warn" | "error";
  text: string;
  /** How often the same line came in a row. */
  count: number;
};

export type RecordedStep = {
  at: number;
  kind: "navigate" | "dialog" | "sheet" | "action";
  label: string;
};

export type DiagnosticsSnapshot = {
  errors: readonly RecordedError[];
  requests: readonly RecordedRequest[];
  console: readonly RecordedConsole[];
  steps: readonly RecordedStep[];
};

export const LIMITS = { errors: 50, requests: 50, console: 300, steps: 100 } as const;

const EMPTY: DiagnosticsSnapshot = { errors: [], requests: [], console: [], steps: [] };

let snapshot: DiagnosticsSnapshot = EMPTY;
let route: string | null = null;
/** Error objects already recorded: a toast and the uncaught net see the same one. */
let seen = new WeakSet<object>();

const listeners = new Set<() => void>();
let scheduled: ReturnType<typeof setTimeout> | null = null;

/**
 * Listeners hear of a change a moment later, and once: a console line can be
 * written during a render, and a render that logs must not start the next.
 */
const emit = () => {
  if (scheduled !== null || listeners.size === 0) return;
  scheduled = setTimeout(() => {
    scheduled = null;
    listeners.forEach((listener) => listener());
  }, 200);
};

const push = <K extends keyof DiagnosticsSnapshot>(key: K, entry: DiagnosticsSnapshot[K][number]) => {
  const next = [...snapshot[key], entry] as DiagnosticsSnapshot[K][number][];
  if (next.length > LIMITS[key]) next.splice(0, next.length - LIMITS[key]);
  snapshot = { ...snapshot, [key]: next };
  emit();
};

export const subscribeDiagnostics = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getDiagnostics = (): DiagnosticsSnapshot => snapshot;

/** The page the user is on; errors and requests are stamped with it. */
export const currentRoute = () => route;

export const recordError = (
  error: unknown,
  info: { source: RecordedError["source"]; title?: string },
): void => {
  if (isAbort(error)) return;
  if (error && typeof error === "object") {
    if (seen.has(error)) return;
    seen.add(error);
  }
  const described = describeError(error);
  const stack = error instanceof Error && error.stack ? error.stack : "";
  const technical = [described.technical, stack].filter((part, i, all) => part && all.indexOf(part) === i).join("\n");
  push("errors", {
    at: Date.now(),
    route,
    source: info.source,
    title: info.title,
    message: redactText(described.message, 500),
    technical: redactText(technical, 6000),
  });
};

export const recordRequest = (request: {
  service: string;
  operation: string;
  kind: string;
  variables?: unknown;
  status: number | null;
  message: string;
}): void => {
  push("requests", {
    at: Date.now(),
    route,
    service: request.service,
    operation: request.operation,
    kind: request.kind,
    variables:
      request.variables && Object.keys(request.variables as object).length > 0
        ? redactValue(request.variables)
        : undefined,
    status: request.status,
    message: redactText(request.message, 1000),
  });
};

export const recordConsole = (level: RecordedConsole["level"], args: readonly unknown[]): void => {
  let text: string;
  try {
    text = redactText(args.map(formatArg).join(" "));
  } catch {
    return;
  }
  const last = snapshot.console[snapshot.console.length - 1];
  if (last && last.level === level && last.text === text) {
    const repeated = { ...last, at: Date.now(), count: last.count + 1 };
    snapshot = { ...snapshot, console: [...snapshot.console.slice(0, -1), repeated] };
    emit();
    return;
  }
  push("console", { at: Date.now(), level, text, count: 1 });
};

export const recordStep = (kind: RecordedStep["kind"], label: string): void => {
  push("steps", { at: Date.now(), kind, label: redactText(label, 300) });
};

/** The active tab moved to `path`. A repeat of the current page is not a step. */
export const recordNavigation = (path: string): void => {
  const clean = redactText(path, 300);
  if (clean === route) return;
  route = clean;
  recordStep("navigate", clean);
};

/**
 * What each mounted page's query looks like right now: references only, so
 * keeping them costs nothing and wakes nobody. A report reads them when it is
 * filed; the debug badge has its own, reactive copy while debug mode is on.
 */
export type PageQueryState = {
  tabId: string | null;
  label: string;
  variables?: unknown;
  data?: unknown;
  error?: unknown;
};

const pageQueries = new Map<string, PageQueryState>();

export const setPageQuery = (id: string, state: PageQueryState): void => {
  pageQueries.set(id, state);
};

export const clearPageQuery = (id: string): void => {
  pageQueries.delete(id);
};

/** The queries of the pages in `tabId` (every page when it is null). */
export const pageQueriesOf = (tabId: string | null): PageQueryState[] =>
  [...pageQueries.values()].filter((query) => tabId === null || query.tabId === tabId);

/** Tests only. */
export const resetDiagnostics = () => {
  snapshot = EMPTY;
  route = null;
  seen = new WeakSet();
  pageQueries.clear();
  if (scheduled !== null) clearTimeout(scheduled);
  scheduled = null;
};
