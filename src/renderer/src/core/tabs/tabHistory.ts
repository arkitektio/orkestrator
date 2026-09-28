import {
  createMemoryHistory,
  type Action,
  type Location,
  type MemoryHistory,
  type To,
} from "@remix-run/router";

/**
 * `Listener` and `Update` live in the package's `dist/history.d.ts` but are
 * not re-exported from its entry point, so they are read off `listen` itself
 * rather than deep-imported from a path the package does not promise.
 */
type Listener = Parameters<MemoryHistory["listen"]>[0];
type Update = Parameters<Listener>[0];

/**
 * A tab's history: a memory history, wrapped so the app can actually use it.
 *
 * `@remix-run/router`'s `createMemoryHistory` is what gives each tab an
 * independent back/forward stack, but two of its properties would silently
 * break a tab if used raw — both verified in `dist/router.js` for 1.23.3:
 *
 *  1. `push`/`replace` only notify `listen` when the history was created with
 *     `v5Compat: true`. `unstable_HistoryRouter` re-renders ONLY through
 *     `listen`, so without the flag a tab would navigate and never repaint.
 *  2. `listen` holds exactly ONE listener — `listen(fn) { listener = fn }`. The
 *     router needs it and the tab store needs it, and the second registration
 *     silently replaces the first. So this wrapper owns the single underlying
 *     subscription and fans out.
 *
 * It also mirrors the entry stack, because the raw history keeps `entries`
 * closure-local and exposes only `index` — and back/forward greying, plus
 * persistence, need the whole stack.
 */

export type SerializedEntry = {
  pathname: string;
  search: string;
  hash: string;
  state?: unknown;
};

export type SerializedHistory = {
  entries: SerializedEntry[];
  index: number;
};

export type TabHistory = MemoryHistory & {
  /** The mirrored stack — what the raw history will not tell us. */
  readonly entries: readonly Location[];
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
  serialize(): SerializedHistory;
};

const toSerializedEntry = (location: Location): SerializedEntry => {
  const entry: SerializedEntry = {
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
  };
  // `state` is whatever a caller passed to `navigate(to, { state })`. It is
  // best-effort in storage: anything that will not survive JSON is dropped
  // rather than poisoning the whole tab record.
  if (location.state !== null && location.state !== undefined) {
    try {
      entry.state = JSON.parse(JSON.stringify(location.state));
    } catch {
      /* unserialisable state is simply not persisted */
    }
  }
  return entry;
};

export const createTabHistory = (initial?: SerializedHistory): TabHistory => {
  const seeds =
    initial && initial.entries.length > 0
      ? initial.entries
      : [{ pathname: "/", search: "", hash: "" }];

  const raw = createMemoryHistory({
    initialEntries: seeds.map((e) => ({
      pathname: e.pathname,
      search: e.search,
      hash: e.hash,
      state: e.state ?? null,
    })),
    initialIndex: initial ? Math.min(Math.max(initial.index, 0), seeds.length - 1) : undefined,
    v5Compat: true,
  });

  // Seed the mirror from what the raw history was built with. Keys are the
  // raw history's own for the current entry and synthetic for the rest —
  // nothing in the app reads `key`, so that is harmless, and it means the
  // mirror never drifts from what `raw.location` reports.
  let entries: Location[] = seeds.map((e, i) => ({
    pathname: e.pathname,
    search: e.search,
    hash: e.hash,
    state: e.state ?? null,
    key: i === raw.index ? raw.location.key : `seed-${i}`,
  }));

  const listeners = new Set<Listener>();

  // The one and only subscription on the raw history.
  raw.listen((update: Update) => {
    switch (update.action) {
      case "PUSH":
        // A push after going back discards the forward branch — the one rule
        // that makes this a browser history rather than a log.
        entries = [...entries.slice(0, raw.index), update.location];
        break;
      case "REPLACE":
        entries = entries.map((entry, i) => (i === raw.index ? update.location : entry));
        break;
      case "POP":
        // Nothing to do: the stack is unchanged and `index` is read live.
        break;
    }
    listeners.forEach((listener) => listener(update));
  });

  // One object literal, declared as the intersection: a missing member of
  // `History` is then a visible hole here rather than a runtime surprise —
  // which matters because typecheck is not part of this work's verification.
  // Getters, not spread: spreading would freeze `index`/`location` at
  // construction time.
  const history: TabHistory = {
    get action(): Action {
      return raw.action;
    },
    get location(): Location {
      return raw.location;
    },
    get index(): number {
      return raw.index;
    },
    get entries(): readonly Location[] {
      return entries;
    },
    get canGoBack(): boolean {
      return raw.index > 0;
    },
    get canGoForward(): boolean {
      return raw.index < entries.length - 1;
    },
    createHref: (to: To) => raw.createHref(to),
    createURL: (to: To) => raw.createURL(to),
    encodeLocation: (to: To) => raw.encodeLocation(to),
    push: (to: To, state?: unknown) => raw.push(to, state),
    replace: (to: To, state?: unknown) => raw.replace(to, state),
    go: (delta: number) => raw.go(delta),
    listen: (listener: Listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    serialize: () => ({
      entries: entries.map(toSerializedEntry),
      index: raw.index,
    }),
  };

  return history;
};
