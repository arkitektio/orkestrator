import { createPath, parsePath } from "react-router-dom";
import { z } from "zod";

import { createTabHistory, type SerializedHistory, type TabHistory } from "./tabHistory";

/**
 * The open tabs: what the rail shows as "Open", each with a history of its own.
 *
 * There is one list. A tab the user wants to keep is PINNED — a flag on the tab
 * itself, as in a browser — rather than copied into a second list of bookmarks
 * beneath the first. A pinned tab sits at the top of the strip, survives "Close
 * others" and is never the one evicted to make room. Tabs are per membership:
 * nothing is persisted for a signed-out user, and a malformed row is dropped on
 * read rather than taking the rest with it.
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
  /**
   * Kept. Pinned tabs form a block at the top of the strip — every transition
   * below preserves that — so "pinned" reads off the position as well as the
   * icon.
   */
  pinned?: boolean;
  lastActiveAt: number;
};

/**
 * Two tabs shown side by side. Both ids are tabs in `tabs`, and `activeId` is
 * always one of them: the active tab is the FOCUSED pane, so everything that
 * already means "the active tab" — the chrome's Back/Forward, the hash mirror,
 * the palette's navigate — keeps meaning "the pane you last touched".
 */
export type SplitPanes = { left: string; right: string };

export type TabsState = {
  tabs: TabRecord[];
  /** Always the id of a tab in `tabs` — there is never zero tabs. */
  activeId: string;
  /** Absent when one tab fills the content area, which is the usual case. */
  split?: SplitPanes;
};

/** Past this the strip stops being scannable and starts being a list. */
/**
 * Where a fresh tab starts: the new-tab page — a search field and the modules,
 * as a browser's new tab is an address bar and your top sites.
 */
export const NEW_TAB_PATH = "/new";

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
  options: { label?: string; now?: number; id?: string } = {},
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
    lastActiveAt: options.now ?? Date.now(),
  };
};

export const activeTab = (state: TabsState): TabRecord =>
  state.tabs.find((t) => t.id === state.activeId) ?? state.tabs[0];

export const inSplit = (split: SplitPanes | undefined, id: string): boolean =>
  split !== undefined && (split.left === id || split.right === id);

/** The tab sharing the screen with the active one, or `null` when not split. */
export const splitPartnerId = (state: TabsState): string | null => {
  if (!state.split) return null;
  return state.split.left === state.activeId ? state.split.right : state.split.left;
};

/**
 * Where focus moving from `from` to `to` leaves the split. Focusing a tab that
 * is already a pane changes nothing; focusing one outside the split puts it in
 * the pane that had focus, so the strip drives the focused pane and the split
 * itself persists — as a browser's split view does.
 */
const focusInto = (
  split: SplitPanes | undefined,
  from: string,
  to: string,
): SplitPanes | undefined => {
  if (!split || inSplit(split, to)) return split;
  return split.left === from ? { ...split, left: to } : { ...split, right: to };
};

/** `state` with `split` dropped, not set to `undefined` — no dangling key. */
const withoutSplit = (state: TabsState): TabsState => {
  const { split: _split, ...rest } = state;
  return rest;
};

const withSplit = (state: TabsState, split: SplitPanes | undefined): TabsState =>
  split ? { ...state, split } : withoutSplit(state);

export const locationPathOf = (tab: TabRecord): string => createPath(tab.history.location);

// ── transitions ──

export type OpenOptions = {
  label?: string;
  /** Open without focusing, like a middle-click. */
  background?: boolean;
  /**
   * At the cap, drop the least recently used tab that is neither active nor
   * pinned instead of refusing. Off by default — a refused ⌘T is a visible
   * no-op the user can act on, whereas a silently discarded tab is not. Boot
   * turns it on for deep links, which must land somewhere.
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
      // Never a pinned one: pinning is how the user said "not this". Nor a
      // pane of the split: it is on screen.
      .filter((t) => t.id !== state.activeId && !t.pinned && !inSplit(state.split, t.id))
      .sort((a, b) => a.lastActiveAt - b.lastActiveAt)[0];
    if (!victim) return state;
    tabs = tabs.filter((t) => t.id !== victim.id);
  }

  const tab = createTab(to, { label: options.label, now });
  if (options.background) return { ...state, tabs: [...tabs, tab] };
  return withSplit(
    { ...state, tabs: [...tabs, tab], activeId: tab.id },
    focusInto(state.split, state.activeId, tab.id),
  );
};

export const focusTab = (state: TabsState, id: string, now: number = Date.now()): TabsState => {
  if (!state.tabs.some((t) => t.id === id) || state.activeId === id) return state;
  return withSplit(
    {
      ...state,
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, lastActiveAt: now } : t)),
      activeId: id,
    },
    focusInto(state.split, state.activeId, id),
  );
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

  // Closing a pane ends the split; the other pane fills the card.
  if (inSplit(state.split, id)) {
    const other = state.split!.left === id ? state.split!.right : state.split!.left;
    const base = withoutSplit({ ...state, tabs: remaining });
    return state.activeId === id ? focusTab(base, other, now) : base;
  }

  if (state.activeId !== id) {
    return { ...state, tabs: remaining };
  }

  const next = remaining[Math.min(index, remaining.length - 1)];
  return focusTab({ ...state, tabs: remaining, activeId: next.id }, next.id, now);
};

/**
 * Close every other tab — except the pinned ones, which is what pinning is
 * for, and the other pane of a split, which is on screen.
 */
export const closeOtherTabs = (state: TabsState, id: string): TabsState => {
  if (!state.tabs.some((t) => t.id === id)) return state;
  const keep = (t: TabRecord) => t.id === id || Boolean(t.pinned) || inSplit(state.split, t.id);
  return focusTab({ ...state, tabs: state.tabs.filter(keep) }, id);
};

// ── split view ──

/**
 * Show `id` beside the active tab. `side` is where `id` goes; the active tab
 * takes the other pane and keeps focus. Splitting with a tab that is already
 * the other pane moves it to the named side (a swap); splitting with the active
 * tab itself is a no-op — one tab cannot be both panes.
 */
export const splitTab = (
  state: TabsState,
  id: string,
  side: "left" | "right" = "right",
): TabsState => {
  if (id === state.activeId || !state.tabs.some((t) => t.id === id)) return state;
  const split: SplitPanes =
    side === "right" ? { left: state.activeId, right: id } : { left: id, right: state.activeId };
  if (state.split?.left === split.left && state.split.right === split.right) return state;
  return { ...state, split };
};

/**
 * Open `to` in a new tab shown BESIDE the active one — "open to the side".
 * Focus stays where it is, as with a background tab: you asked to see the
 * page next to this one, not to leave this one. Not split yet: the new tab
 * takes the right pane. Already split: it takes the other pane, whichever
 * side that is, so the page you are on never moves.
 */
export const openTabBeside = (
  state: TabsState,
  to: string,
  options: Omit<OpenOptions, "background"> = {},
): TabsState => {
  const opened = openTab(state, to, { ...options, background: true });
  if (opened === state) return state;
  const fresh = opened.tabs[opened.tabs.length - 1];
  const side = opened.split && opened.split.right === opened.activeId ? "left" : "right";
  return splitTab(opened, fresh.id, side);
};

export const unsplit = (state: TabsState): TabsState =>
  state.split ? withoutSplit(state) : state;

export const swapSplit = (state: TabsState): TabsState =>
  state.split ? { ...state, split: { left: state.split.right, right: state.split.left } } : state;

/**
 * What ⌘\ does. Split: end it. Not split: show the most recently used other
 * tab on the right — the one you were just in is the one you most likely
 * want beside this — or, with nothing else open, a fresh new-tab page there.
 */
export const toggleSplit = (state: TabsState, now: number = Date.now()): TabsState => {
  if (state.split) return unsplit(state);
  const recent = [...state.tabs]
    .filter((t) => t.id !== state.activeId)
    .sort((a, b) => b.lastActiveAt - a.lastActiveAt)[0];
  if (recent) return splitTab(state, recent.id);
  const opened = openTab(state, NEW_TAB_PATH, { background: true, evict: true, now });
  if (opened === state) return state;
  return splitTab(opened, opened.tabs[opened.tabs.length - 1].id);
};

const pinnedCount = (tabs: TabRecord[]): number => tabs.filter((t) => t.pinned).length;

/** Move a tab within its own block: a pinned tab stays among the pinned. */
export const moveTab = (state: TabsState, id: string, toIndex: number): TabsState => {
  const from = state.tabs.findIndex((t) => t.id === id);
  if (from === -1) return state;
  const tabs = [...state.tabs];
  const [moved] = tabs.splice(from, 1);
  const boundary = pinnedCount(tabs);
  const [min, max] = moved.pinned ? [0, boundary] : [boundary, tabs.length];
  tabs.splice(Math.max(min, Math.min(toIndex, max)), 0, moved);
  return { ...state, tabs };
};

/**
 * Pin or unpin a tab.
 *
 * Either way it lands on the boundary between the two blocks — last of the
 * pinned, or first of the rest — which is the shortest move that keeps the
 * pinned block contiguous, so the row travels as little as possible from under
 * the pointer that just clicked it.
 */
export const setTabPinned = (state: TabsState, id: string, pinned: boolean): TabsState => {
  const tab = state.tabs.find((t) => t.id === id);
  if (!tab || Boolean(tab.pinned) === pinned) return state;

  const rest = state.tabs.filter((t) => t.id !== id);
  const { pinned: _was, ...bare } = tab;
  const next: TabRecord = pinned ? { ...bare, pinned: true } : bare;

  const tabs = [...rest];
  tabs.splice(pinnedCount(rest), 0, next);
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

/**
 * The ids that stay mounted: whatever is on screen — the active tab, and the
 * other pane of a split — then the most recent up to the cap.
 */
export const warmIds = (state: TabsState): Set<string> => {
  const partner = splitPartnerId(state);
  const shown = partner ? [state.activeId, partner] : [state.activeId];
  const byRecency = [...state.tabs]
    .filter((t) => !shown.includes(t.id))
    .sort((a, b) => b.lastActiveAt - a.lastActiveAt)
    .slice(0, Math.max(0, MAX_WARM - shown.length))
    .map((t) => t.id);
  return new Set([...shown, ...byRecency]);
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
  pinned: z.boolean().optional(),
  lastActiveAt: z.number(),
  history: z.object({
    entries: z.array(SerializedEntrySchema).min(1),
    index: z.number().int(),
  }),
});

const SplitSchema = z.object({ left: z.string(), right: z.string() });

export const TabsPersistedSchema = z.object({
  version: z.literal(1),
  activeId: z.string(),
  // Added later; a payload without it is simply not split.
  split: SplitSchema.optional(),
  tabs: z.array(PersistedTabSchema),
});

export type TabsPersisted = z.infer<typeof TabsPersistedSchema>;

export const tabsStorageKey = (profileId: string): string => `orkestrator:tabs:v1:${profileId}`;

export const serializeTabs = (state: TabsState): TabsPersisted => ({
  version: 1,
  activeId: state.activeId,
  ...(state.split ? { split: state.split } : {}),
  tabs: state.tabs.map((t) => ({
    id: t.id,
    label: t.label,
    ...(t.pinned ? { pinned: true } : {}),
    lastActiveAt: t.lastActiveAt,
    history: t.history.serialize() as SerializedHistory,
  })),
});

const reviveTab = (row: z.infer<typeof PersistedTabSchema>): TabRecord => ({
  id: row.id,
  history: createTabHistory(row.history),
  label: row.label,
  ...(row.pinned ? { pinned: true } : {}),
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
    .object({
      version: z.literal(1),
      activeId: z.string(),
      split: SplitSchema.optional(),
      tabs: z.array(z.unknown()),
    })
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

  // A split survives only whole: both panes present, and the focus in one of
  // them. Anything less is dropped rather than repaired — the tabs themselves
  // are what matter.
  const split = outer.data.split;
  const has = (id: string) => tabs.some((t) => t.id === id);
  const splitIntact =
    split !== undefined &&
    split.left !== split.right &&
    has(split.left) &&
    has(split.right) &&
    inSplit(split, activeId);

  return splitIntact ? { tabs, activeId, split } : { tabs, activeId };
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
