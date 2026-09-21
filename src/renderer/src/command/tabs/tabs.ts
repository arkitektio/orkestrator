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

/**
 * How a tab's pages lay themselves out, as DEFAULTS: what `PageLayout` shows
 * before the URL says otherwise (`?pageSidebar=`, `?sidebar=`). Set when the
 * tab is opened — a tab opened to the side starts without its page sidebar,
 * having half the width — and kept with the tab; the toggles on the page
 * still work, per location, as they always did.
 */
export type TabLayout = {
  /** The page's own right-hand panel (its sidebars, or Help). */
  pageSidebar?: boolean;
  sidebar?: boolean;
};

export type TabRecord = {
  id: string;
  history: TabHistory;
  label: string;
  layout?: TabLayout;
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
  /**
   * The tab shown to this one's RIGHT, when this one is on screen: its
   * partner in a split view. The partner belongs to this tab — switching to a
   * tab shows it with its own partner, or alone if it has none, and a partner
   * is never handed from one tab to the next. Always the id of a tab in
   * `tabs` (`closeTab` scrubs it), never this tab's own.
   */
  beside?: string;
};

/**
 * Two tabs shown side by side: the view tab and its partner. `activeId` is
 * always one of them: the active tab is the FOCUSED pane, so everything that
 * already means "the active tab" — the chrome's Back/Forward, the hash mirror,
 * the palette's navigate — keeps meaning "the pane you last touched".
 */
export type SplitPanes = { left: string; right: string };

export type TabsState = {
  tabs: TabRecord[];
  /**
   * The FOCUSED tab: always the id of a tab in `tabs` — there is never zero
   * tabs — and always `viewId` or the view tab's `beside`.
   */
  activeId: string;
  /** The tab on the LEFT of the content area — the one whose partner, if any, is shown. */
  viewId: string;
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
  options: { label?: string; now?: number; id?: string; layout?: TabLayout } = {},
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
    ...(options.layout ? { layout: options.layout } : {}),
    lastActiveAt: options.now ?? Date.now(),
  };
};

export const activeTab = (state: TabsState): TabRecord =>
  state.tabs.find((t) => t.id === state.activeId) ?? state.tabs[0];

const tabOf = (state: TabsState, id: string): TabRecord | undefined =>
  state.tabs.find((t) => t.id === id);

/** The pair on screen — the view tab and its partner — or `undefined` when the view tab has none. */
export const shownSplit = (state: TabsState): SplitPanes | undefined => {
  const right = tabOf(state, state.viewId)?.beside;
  return right && right !== state.viewId && tabOf(state, right)
    ? { left: state.viewId, right }
    : undefined;
};

export const inSplit = (split: SplitPanes | undefined, id: string): boolean =>
  split !== undefined && (split.left === id || split.right === id);

/** The tab sharing the screen with the active one, or `null` when not split. */
export const splitPartnerId = (state: TabsState): string | null => {
  const split = shownSplit(state);
  if (!split) return null;
  return split.left === state.activeId ? split.right : split.left;
};

/** `tabs` with tab `id`'s partner set, or removed for `undefined` — no dangling key. */
const withBeside = (tabs: TabRecord[], id: string, beside: string | undefined): TabRecord[] =>
  tabs.map((t) => {
    if (t.id !== id) return t;
    const { beside: _was, ...bare } = t;
    return beside ? { ...bare, beside } : bare;
  });

const touched = (tabs: TabRecord[], id: string, now: number): TabRecord[] =>
  tabs.map((t) => (t.id === id ? { ...t, lastActiveAt: now } : t));

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
  /** The new tab's page-layout defaults — see `TabLayout`. */
  layout?: TabLayout;
};

export const openTab = (state: TabsState, to: string, options: OpenOptions = {}): TabsState => {
  const now = options.now ?? Date.now();
  let tabs = state.tabs;

  if (tabs.length >= MAX_TABS) {
    if (!options.evict) return state;
    const shown = shownSplit(state);
    const victim = [...tabs]
      // Never a pinned one: pinning is how the user said "not this". Nor
      // anything on screen.
      .filter((t) => t.id !== state.viewId && !t.pinned && !inSplit(shown, t.id))
      .sort((a, b) => a.lastActiveAt - b.lastActiveAt)[0];
    if (!victim) return state;
    tabs = tabs.filter((t) => t.id !== victim.id).map((t) =>
      t.beside === victim.id ? withBeside([t], t.id, undefined)[0] : t,
    );
  }

  const tab = createTab(to, { label: options.label, now, layout: options.layout });
  if (options.background) return { ...state, tabs: [...tabs, tab] };
  // A new tab starts alone: it has no partner, and takes none from the tab
  // it was opened from.
  return { ...state, tabs: [...tabs, tab], activeId: tab.id, viewId: tab.id };
};

/**
 * Focus a tab. The tab on screen as the view's partner is focused where it
 * is — the right pane; any other tab becomes the view, shown with its own
 * partner or alone.
 */
export const focusTab = (state: TabsState, id: string, now: number = Date.now()): TabsState => {
  if (!tabOf(state, id) || state.activeId === id) return state;
  const tabs = touched(state.tabs, id, now);
  if (shownSplit(state)?.right === id) return { ...state, tabs, activeId: id };
  return { ...state, tabs, activeId: id, viewId: id };
};

/**
 * Close a tab. Closing the active one moves to its right-hand neighbour, else
 * the left — the browser rule — and closing the last replaces it with a fresh
 * tab at the root rather than ever reaching zero.
 */
export const closeTab = (state: TabsState, id: string, now: number = Date.now()): TabsState => {
  const index = state.tabs.findIndex((t) => t.id === id);
  if (index === -1) return state;

  // Gone from the strip, and from beside every tab that showed it.
  const remaining = state.tabs
    .filter((t) => t.id !== id)
    .map((t) => (t.beside === id ? withBeside([t], t.id, undefined)[0] : t));

  if (remaining.length === 0) {
    const fresh = createTab("/", { now });
    return { tabs: [fresh], activeId: fresh.id, viewId: fresh.id };
  }

  if (id === state.viewId) {
    // Its partner, if it had one, fills the card; else the neighbour rule.
    const partner = shownSplit(state)?.right;
    const next = partner ?? remaining[Math.min(index, remaining.length - 1)].id;
    return { tabs: touched(remaining, next, now), activeId: next, viewId: next };
  }

  // The focused partner: focus falls back to the view tab, now alone.
  if (id === state.activeId) return { ...state, tabs: remaining, activeId: state.viewId };

  return { ...state, tabs: remaining };
};

/**
 * Close every other tab — except the pinned ones, which is what pinning is
 * for, and the tab's own partner, which is on screen beside it.
 */
export const closeOtherTabs = (state: TabsState, id: string, now: number = Date.now()): TabsState => {
  const tab = tabOf(state, id);
  if (!tab) return state;
  const keep = (t: TabRecord) => t.id === id || Boolean(t.pinned) || t.id === tab.beside;
  const tabs = state.tabs.filter(keep);
  // The view stays the view if it survived and `id` is its partner; otherwise
  // `id` is the view now. Either way it has focus.
  const viewKept = tabs.some((t) => t.id === state.viewId);
  const viewId = viewKept && shownSplit(state)?.right === id ? state.viewId : id;
  return { tabs: touched(tabs, id, now), activeId: id, viewId };
};

// ── split view ──

/**
 * Show `id` beside the view tab: `side: "right"` makes it the view's partner;
 * `side: "left"` makes it the view, with the current view as ITS partner.
 * Either way the tab that had focus keeps it if it is still on screen.
 * Splitting the view with itself is a no-op — one tab cannot be both panes.
 */
export const splitTab = (
  state: TabsState,
  id: string,
  side: "left" | "right" = "right",
): TabsState => {
  if (id === state.viewId || !tabOf(state, id)) return state;
  if (side === "right") {
    if (tabOf(state, state.viewId)?.beside === id) return state;
    const activeId = state.activeId === state.viewId ? state.viewId : id;
    return { ...state, tabs: withBeside(state.tabs, state.viewId, id), activeId };
  }
  // The old view is on screen either way (as the right pane now); a focused
  // old partner is not, so focus lands on the old view too.
  return { ...state, tabs: withBeside(state.tabs, id, state.viewId), viewId: id, activeId: state.viewId };
};

/**
 * Split tab `id` — from its row in the strip, whichever tab is on screen: it
 * becomes the view, with `partnerId` beside it, or a fresh new-tab page
 * when no partner is named. Splitting a tab with itself is a no-op.
 */
export const splitTabWith = (
  state: TabsState,
  id: string,
  partnerId?: string,
  now: number = Date.now(),
): TabsState => {
  if (!tabOf(state, id) || partnerId === id) return state;
  const viewed = focusTab(state, id, now);
  return partnerId
    ? splitTab(viewed, partnerId)
    : openTabBeside(viewed, NEW_TAB_PATH, { evict: true, now });
};

/** What a tab opened to the side starts with: no page sidebar, in half the width. */
export const BESIDE_LAYOUT: TabLayout = { pageSidebar: false };

/**
 * Open `to` in a new tab shown BESIDE the view tab — "open to the side".
 * Focus stays where it is, as with a background tab: you asked to see the
 * page next to this one, not to leave this one. It takes the right pane,
 * replacing the view's previous partner if it had one, and starts without
 * its page sidebar (`BESIDE_LAYOUT`) unless `layout` says otherwise.
 */
export const openTabBeside = (
  state: TabsState,
  to: string,
  options: Omit<OpenOptions, "background"> = {},
): TabsState => {
  const opened = openTab(state, to, {
    ...options,
    layout: options.layout ?? BESIDE_LAYOUT,
    background: true,
  });
  if (opened === state) return state;
  const fresh = opened.tabs[opened.tabs.length - 1];
  const activeId = opened.activeId === opened.viewId ? opened.viewId : fresh.id;
  return { ...opened, tabs: withBeside(opened.tabs, opened.viewId, fresh.id), activeId };
};

/** Take tab `id`'s partner away (the view's by default). The partner stays open, just not beside it. */
export const unsplit = (state: TabsState, id: string = state.viewId): TabsState => {
  const tab = tabOf(state, id);
  if (!tab?.beside) return state;
  const activeId = id === state.viewId && state.activeId === tab.beside ? id : state.activeId;
  return { ...state, tabs: withBeside(state.tabs, id, undefined), activeId };
};

/**
 * Exchange the panes of tab `id`'s pair (the view's by default): its partner
 * becomes the owner, with `id` beside it. Focus stays on the same tab.
 */
export const swapSplit = (state: TabsState, id: string = state.viewId): TabsState => {
  const tab = tabOf(state, id);
  const partner = tab?.beside;
  if (!tab || !partner || !tabOf(state, partner)) return state;
  const tabs = withBeside(withBeside(state.tabs, id, undefined), partner, id);
  return { ...state, tabs, viewId: state.viewId === id ? partner : state.viewId };
};

/**
 * What ⌘\ does. Split: end it. Not split: show the most recently used other
 * tab on the right — the one you were just in is the one you most likely
 * want beside this — or, with nothing else open, a fresh new-tab page there.
 */
export const toggleSplit = (state: TabsState, now: number = Date.now()): TabsState => {
  if (shownSplit(state)) return unsplit(state);
  const recent = [...state.tabs]
    .filter((t) => t.id !== state.viewId)
    .sort((a, b) => b.lastActiveAt - a.lastActiveAt)[0];
  if (recent) return splitTab(state, recent.id);
  return openTabBeside(state, NEW_TAB_PATH, { evict: true, now });
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
 * The ids that stay mounted: whatever is on screen — the view tab, and its
 * partner if it has one — then the most recent up to the cap.
 */
export const warmIds = (state: TabsState): Set<string> => {
  const split = shownSplit(state);
  const shown = split ? [split.left, split.right] : [state.viewId];
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
  beside: z.string().optional(),
  layout: z
    .object({ pageSidebar: z.boolean().optional(), sidebar: z.boolean().optional() })
    .optional(),
  history: z.object({
    entries: z.array(SerializedEntrySchema).min(1),
    index: z.number().int(),
  }),
});

export const TabsPersistedSchema = z.object({
  version: z.literal(1),
  activeId: z.string(),
  // Added later; a payload without it has the active tab as the view.
  viewId: z.string().optional(),
  tabs: z.array(PersistedTabSchema),
});

export type TabsPersisted = z.infer<typeof TabsPersistedSchema>;

export const tabsStorageKey = (profileId: string): string => `orkestrator:tabs:v1:${profileId}`;

export const serializeTabs = (state: TabsState): TabsPersisted => ({
  version: 1,
  activeId: state.activeId,
  viewId: state.viewId,
  tabs: state.tabs.map((t) => ({
    id: t.id,
    label: t.label,
    ...(t.pinned ? { pinned: true } : {}),
    ...(t.beside ? { beside: t.beside } : {}),
    ...(t.layout ? { layout: t.layout } : {}),
    lastActiveAt: t.lastActiveAt,
    history: t.history.serialize() as SerializedHistory,
  })),
});

const reviveTab = (row: z.infer<typeof PersistedTabSchema>): TabRecord => ({
  id: row.id,
  history: createTabHistory(row.history),
  label: row.label,
  ...(row.pinned ? { pinned: true } : {}),
  ...(row.beside ? { beside: row.beside } : {}),
  ...(row.layout ? { layout: row.layout } : {}),
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
      viewId: z.string().optional(),
      tabs: z.array(z.unknown()),
    })
    .safeParse(parsed);
  if (!outer.success) return null;

  const revived = outer.data.tabs.flatMap((candidate) => {
    const row = PersistedTabSchema.safeParse(candidate);
    return row.success ? [reviveTab(row.data)] : [];
  });
  if (revived.length === 0) return null;

  // A partner that is gone, or is the tab itself, is simply not a partner.
  const has = (id: string) => revived.some((t) => t.id === id);
  const tabs = revived.map((t) =>
    t.beside && t.beside !== t.id && has(t.beside) ? t : withBeside([t], t.id, undefined)[0],
  );

  const activeId = has(outer.data.activeId) ? outer.data.activeId : tabs[tabs.length - 1].id;
  // The view is what was saved if it still holds — the focus in it or beside
  // it — else the focused tab itself, alone or with its own partner.
  const saved = outer.data.viewId;
  const viewId =
    saved !== undefined &&
    has(saved) &&
    (saved === activeId || tabs.find((t) => t.id === saved)?.beside === activeId)
      ? saved
      : activeId;

  return { tabs, activeId, viewId };
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
    return { tabs: [tab], activeId: tab.id, viewId: tab.id };
  }

  if (bootPath && bootPath !== locationPathOf(activeTab(restored))) {
    // A deep link must land somewhere even at the cap.
    return openTab(restored, bootPath, { evict: true, now });
  }

  return restored;
};
