import { createPath, parsePath } from "react-router-dom";
import { z } from "zod";

import { createTabHistory, type SerializedHistory, type TabHistory } from "./tabHistory";

/**
 * The open tabs: what the rail shows as "Open", each with a history of its own.
 *
 * Tabs and pins are deliberately separate layers. Pins (`../pins.ts`) are
 * bookmarks — only what the user asked to keep, no history. Tabs are the
 * ephemeral working set, each carrying a full back/forward stack. They meet at
 * one optional field, `pinKey`: clicking a pin focuses the open tab that came
 * from it, else opens one. Same membership scoping as pins, same refusal to
 * persist anything for a signed-out user, same per-row salvage on read.
 *
 * Everything here is a pure function over `TabsState`; only `loadTabs`,
 * `saveTabs` and `bootTabs` touch storage.
 */

export type TabRecord = {
  id: string;
  history: TabHistory;
  label: string;
  /**
   * The pathname a PAGE-reported label belongs to. While the tab is still on
   * that pathname, the path-derived fallback must not overwrite it — the page
   * knows its own name ("HeLa s3"); the path only knows an id ("5").
   */
  labelPath?: string;
  /** The pin this tab was opened from, if any. */
  pinKey?: string;
  lastActiveAt: number;
};

export type TabsState = {
  tabs: TabRecord[];
  /** Always the id of a tab in `tabs` — there is never zero tabs. */
  activeId: string;
};

/** Past this the strip stops being scannable and starts being a list. */
export const MAX_TABS = 12;
/**
 * How many tabs stay MOUNTED. A tab is either warm (mounted, hidden if not
 * active — scroll, form state and a loaded scene survive a switch) or cold
 * (unmounted, only its history kept). A scene holds a multi-gigabyte cache, so
 * the mounted set must be bounded; the active tab is always warm, the rest by
 * recency.
 */
export const MAX_WARM = 4;

const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** A label good enough until the page reports its own title. */
export const labelForPath = (to: string): string => {
  const pathname = parsePath(to).pathname ?? "/";
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "Home";
  const last = decodeURIComponent(segments[segments.length - 1]);
  return last.charAt(0).toUpperCase() + last.slice(1);
};

export const createTab = (
  to: string,
  options: { label?: string; pinKey?: string; now?: number; id?: string } = {},
): TabRecord => {
  const parsed = parsePath(to);
  const entry = {
    pathname: parsed.pathname ?? "/",
    search: parsed.search ?? "",
    hash: parsed.hash ?? "",
  };
  return {
    id: options.id ?? newId(),
    history: createTabHistory({ entries: [entry], index: 0 }),
    label: options.label ?? labelForPath(to),
    ...(options.pinKey ? { pinKey: options.pinKey } : {}),
    lastActiveAt: options.now ?? Date.now(),
  };
};

export const activeTab = (state: TabsState): TabRecord =>
  state.tabs.find((t) => t.id === state.activeId) ?? state.tabs[0];

export const locationPathOf = (tab: TabRecord): string => createPath(tab.history.location);

// ── transitions ──

export type OpenOptions = {
  label?: string;
  pinKey?: string;
  /** Open without focusing, like a middle-click. */
  background?: boolean;
  /**
   * At the cap, drop the least recently used non-active tab instead of
   * refusing. Off by default — a refused ⌘T is a visible no-op the user can
   * act on, whereas a silently discarded tab is not. Boot turns it on for deep
   * links, which must land somewhere.
   */
  evict?: boolean;
  now?: number;
};

export const openTab = (state: TabsState, to: string, options: OpenOptions = {}): TabsState => {
  const now = options.now ?? Date.now();
  let tabs = state.tabs;

  if (tabs.length >= MAX_TABS) {
    if (!options.evict) return state;
    const victim = [...tabs]
      .filter((t) => t.id !== state.activeId)
      .sort((a, b) => a.lastActiveAt - b.lastActiveAt)[0];
    if (!victim) return state;
    tabs = tabs.filter((t) => t.id !== victim.id);
  }

  const tab = createTab(to, { label: options.label, pinKey: options.pinKey, now });
  return {
    tabs: [...tabs, tab],
    activeId: options.background ? state.activeId : tab.id,
  };
};

export const focusTab = (state: TabsState, id: string, now: number = Date.now()): TabsState => {
  if (!state.tabs.some((t) => t.id === id) || state.activeId === id) return state;
  return {
    tabs: state.tabs.map((t) => (t.id === id ? { ...t, lastActiveAt: now } : t)),
    activeId: id,
  };
};

/**
 * Close a tab. Closing the active one moves to its right-hand neighbour, else
 * the left — the browser rule — and closing the last replaces it with a fresh
 * tab at the root rather than ever reaching zero.
 */
export const closeTab = (state: TabsState, id: string, now: number = Date.now()): TabsState => {
  const index = state.tabs.findIndex((t) => t.id === id);
  if (index === -1) return state;

  const remaining = state.tabs.filter((t) => t.id !== id);

  if (remaining.length === 0) {
    const fresh = createTab("/", { now });
    return { tabs: [fresh], activeId: fresh.id };
  }

  if (state.activeId !== id) {
    return { tabs: remaining, activeId: state.activeId };
  }

  const next = remaining[Math.min(index, remaining.length - 1)];
  return focusTab({ tabs: remaining, activeId: next.id }, next.id, now);
};

export const closeOtherTabs = (state: TabsState, id: string): TabsState => {
  const keep = state.tabs.find((t) => t.id === id);
  if (!keep) return state;
  return { tabs: [keep], activeId: id };
};

export const moveTab = (state: TabsState, id: string, toIndex: number): TabsState => {
  const from = state.tabs.findIndex((t) => t.id === id);
  if (from === -1) return state;
  const tabs = [...state.tabs];
  const [moved] = tabs.splice(from, 1);
  tabs.splice(Math.max(0, Math.min(toIndex, tabs.length)), 0, moved);
  return { ...state, tabs };
};

export type LabelSource = {
  /** `page`: the page's own `title`. `path`: derived from the URL, a fallback. */
  source: "page" | "path";
  pathname: string;
};

/**
 * Name a tab.
 *
 * Two sources compete: the page's own title, and a fallback derived from the
 * path. The page always knows better, but it reports later (effects run
 * child-first, and it may be waiting on a query), so precedence is by
 * LOCATION rather than by timing: a page title claims its pathname, and a
 * path label for that same pathname is then ignored. Navigating to a new
 * pathname releases the claim, so the fallback applies until the next page
 * reports.
 */
export const setTabLabel = (
  state: TabsState,
  id: string,
  label: string,
  origin?: LabelSource,
): TabsState => {
  if (!label) return state;
  const tab = state.tabs.find((t) => t.id === id);
  if (!tab) return state;

  if (origin?.source === "path" && tab.labelPath === origin.pathname) {
    return state; // a page already named this location
  }

  const labelPath = origin?.source === "page" ? origin.pathname : undefined;
  if (tab.label === label && tab.labelPath === labelPath) return state;

  return {
    ...state,
    tabs: state.tabs.map((t) => (t.id === id ? { ...t, label, labelPath } : t)),
  };
};

/** Focus the tab a pin opened, or open one for it. */
export const focusOrOpenForPin = (
  state: TabsState,
  pinKey: string,
  to: string,
  options: Omit<OpenOptions, "pinKey"> = {},
): TabsState => {
  const existing = state.tabs.find((t) => t.pinKey === pinKey);
  if (existing) return focusTab(state, existing.id, options.now);
  return openTab(state, to, { ...options, pinKey });
};

/** The ids that stay mounted: the active one, then the most recent up to the cap. */
export const warmIds = (state: TabsState): Set<string> => {
  const byRecency = [...state.tabs]
    .filter((t) => t.id !== state.activeId)
    .sort((a, b) => b.lastActiveAt - a.lastActiveAt)
    .slice(0, Math.max(0, MAX_WARM - 1))
    .map((t) => t.id);
  return new Set([state.activeId, ...byRecency]);
};

// ── persistence ──

const SerializedEntrySchema = z.object({
  pathname: z.string(),
  search: z.string(),
  hash: z.string(),
  state: z.unknown().optional(),
});

const PersistedTabSchema = z.object({
  id: z.string(),
  label: z.string(),
  pinKey: z.string().optional(),
  lastActiveAt: z.number(),
  history: z.object({
    entries: z.array(SerializedEntrySchema).min(1),
    index: z.number().int(),
  }),
});

export const TabsPersistedSchema = z.object({
  version: z.literal(1),
  activeId: z.string(),
  tabs: z.array(PersistedTabSchema),
});

export type TabsPersisted = z.infer<typeof TabsPersistedSchema>;

export const tabsStorageKey = (profileId: string): string => `orkestrator:tabs:v1:${profileId}`;

export const serializeTabs = (state: TabsState): TabsPersisted => ({
  version: 1,
  activeId: state.activeId,
  tabs: state.tabs.map((t) => ({
    id: t.id,
    label: t.label,
    ...(t.pinKey ? { pinKey: t.pinKey } : {}),
    lastActiveAt: t.lastActiveAt,
    history: t.history.serialize() as SerializedHistory,
  })),
});

const reviveTab = (row: z.infer<typeof PersistedTabSchema>): TabRecord => ({
  id: row.id,
  history: createTabHistory(row.history),
  label: row.label,
  ...(row.pinKey ? { pinKey: row.pinKey } : {}),
  lastActiveAt: row.lastActiveAt,
});

/**
 * Read a membership's tabs, or `null` when there is nothing usable. One
 * malformed row is dropped rather than discarding the whole set — losing every
 * open tab to one bad record would read as the app forgetting itself.
 */
export const loadTabs = (
  profileId: string | null,
  storage: Storage = localStorage,
): TabsState | null => {
  if (!profileId) return null;

  let raw: string | null = null;
  try {
    raw = storage.getItem(tabsStorageKey(profileId));
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const outer = z
    .object({ version: z.literal(1), activeId: z.string(), tabs: z.array(z.unknown()) })
    .safeParse(parsed);
  if (!outer.success) return null;

  const tabs = outer.data.tabs.flatMap((candidate) => {
    const row = PersistedTabSchema.safeParse(candidate);
    return row.success ? [reviveTab(row.data)] : [];
  });
  if (tabs.length === 0) return null;

  const activeId = tabs.some((t) => t.id === outer.data.activeId)
    ? outer.data.activeId
    : tabs[tabs.length - 1].id;

  return { tabs, activeId };
};

/** Refuses for a signed-out user: tabs hold tenant-scoped ids, so there is no
 * membership to attach them to — the same rule as pins. */
export const saveTabs = (
  profileId: string | null,
  state: TabsState,
  storage: Storage = localStorage,
): void => {
  if (!profileId) return;
  try {
    storage.setItem(tabsStorageKey(profileId), JSON.stringify(serializeTabs(state)));
  } catch {
    /* quota or blocked storage; the working set is a convenience */
  }
};

/**
 * The tabs to start with.
 *
 * One rule covers every entry path that carries intent in the hash: restore
 * what was saved; then, if the hash names a path that is not where the
 * restored active tab already is, open that path as a new active tab. That is
 * a cold-start deep link (hash, nothing saved → one tab at the hash), a reload
 * (hash equals the mirrored active location → nothing new) and a deep link
 * into a running session (hash differs → new tab).
 *
 * A membership SWITCH passes `null`: at that moment the hash still mirrors the
 * previous membership's tab, which is not intent, and must not be re-opened
 * inside the new organization.
 */
export const bootTabs = (
  profileId: string | null,
  bootPath: string | null,
  storage: Storage = localStorage,
  now: number = Date.now(),
): TabsState => {
  const restored = loadTabs(profileId, storage);

  if (!restored) {
    const tab = createTab(bootPath ?? "/", { now });
    return { tabs: [tab], activeId: tab.id };
  }

  if (bootPath && bootPath !== locationPathOf(activeTab(restored))) {
    // A deep link must land somewhere even at the cap.
    return openTab(restored, bootPath, { evict: true, now });
  }

  return restored;
};
