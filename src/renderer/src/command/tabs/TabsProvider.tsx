import { Arkitekt } from "@/app/Arkitekt";
import { baseName } from "@/constants";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { shallow } from "zustand/shallow";
import { useStoreWithEqualityFn } from "zustand/traditional";

import { hashFor, normalizeDeepLinkPath, readBootPath } from "./hashMirror";
import type { Action, Location } from "@remix-run/router";

import type { TabHistory } from "./tabHistory";
import {
  activeTab as activeTabOf,
  bootTabs,
  closeOtherTabs,
  closeTab,
  focusTab,
  moveTab,
  openTab,
  saveTabs,
  setTabLabel,
  setTabPinned,
  warmIds as warmIdsOf,
  type LabelSource,
  NEW_TAB_PATH,
  type OpenOptions,
  type TabRecord,
  type TabsState,
} from "./tabs";
import { linkClickIntent } from "./linkClicks";

/**
 * The open tabs, as a store the rest of the app subscribes to.
 *
 * Held outside React state on purpose. A tab's location changes whenever its
 * own history moves, and those histories are plain objects the routers own —
 * so the provider subscribes to every tab's `listen` and republishes a fresh
 * snapshot, and `useSyncExternalStore` does the rest. That is what lets
 * `ActiveTabRouter` re-render on navigation and lets Back/Forward grey
 * themselves without any component polling a history object.
 *
 * Every read goes through a SELECTOR (`useTabsSelector`), and that is
 * load-bearing rather than a nicety. A republished snapshot is a new object
 * even when only one background tab moved, so an unfiltered subscriber would
 * re-render on every navigation anywhere in the app — including
 * `ActiveTabRouter`, which wraps the whole tree and would hand every
 * `useLocation` consumer in every warm tab a fresh router context. Selectors
 * make a subscriber wake only for the part of the state it named.
 *
 * Sits above `ProfileScope`: tabs are per membership, and re-booting them on a
 * profile change is exactly what the (now deleted) `ProfileSwitchEffects` was
 * trying to do from inside the subtree it needed to outlive.
 */

/**
 * The published state: the reducers' `TabsState` plus the derived warm set.
 *
 * `warmIds` is derived rather than reduced — `tabs.ts` stays pure over
 * `{ tabs, activeId }` — but it is derived ONCE, here, on the transitions that
 * can change it. A navigation tick republishes the snapshot by spreading it,
 * so the warm set (and its identity) rides along untouched.
 */
export type TabsSnapshot = TabsState & {
  /** The ids that stay mounted; the rest are cold. */
  warmIds: ReadonlySet<string>;
};

export type TabActions = {
  open: (to: string, options?: OpenOptions) => void;
  focus: (id: string) => void;
  close: (id: string) => void;
  closeOthers: (id: string) => void;
  move: (id: string, toIndex: number) => void;
  setLabel: (id: string, label: string, origin?: LabelSource) => void;
  /** Pin or unpin a tab — see `setTabPinned`. */
  setPinned: (id: string, pinned: boolean) => void;
};

/**
 * Shaped as a zustand `ReadonlyStoreApi` so `useStoreWithEqualityFn` can drive
 * it. That is the same `useSyncExternalStoreWithSelector` every other store in
 * this app is read through (`lib/arkitekt/hooks.tsx`), rather than a second,
 * hand-rolled selector path that would have to get the tearing rules right on
 * its own.
 */
type Listener = (state: TabsSnapshot, previous: TabsSnapshot) => void;

type Store = {
  getState: () => TabsSnapshot;
  getInitialState: () => TabsSnapshot;
  set: (next: TabsState | ((current: TabsState) => TabsState)) => void;
  subscribe: (listener: Listener) => () => void;
};

const StoreContext = createContext<Store | null>(null);

const readBoot = () =>
  typeof window === "undefined" ? null : readBootPath(window.location.hash, baseName);

const withWarmIds = (state: TabsState): TabsSnapshot => ({
  ...state,
  warmIds: warmIdsOf(state),
});

const createStore = (initial: TabsState): Store => {
  const initialState = withWarmIds(initial);
  let state = initialState;
  const listeners = new Set<Listener>();
  const historySubscriptions = new Map<string, () => void>();

  // Listeners take (state, previous) so this is a genuine zustand
  // `ReadonlyStoreApi` and can be read with the same
  // `useSyncExternalStoreWithSelector` every other store in the app uses.
  const emit = (previous: TabsSnapshot) => listeners.forEach((l) => l(state, previous));

  // Keep exactly one subscription per live tab history, so a tab navigating
  // republishes a snapshot; tabs that are closed are unsubscribed.
  const syncHistorySubscriptions = () => {
    const live = new Set(state.tabs.map((t) => t.id));
    for (const [id, unsubscribe] of historySubscriptions) {
      if (!live.has(id)) {
        unsubscribe();
        historySubscriptions.delete(id);
      }
    }
    for (const tab of state.tabs) {
      if (historySubscriptions.has(tab.id)) continue;
      historySubscriptions.set(
        tab.id,
        tab.history.listen(() => {
          // Same tabs, new identity: `useSyncExternalStore` compares snapshots
          // by reference, and a navigation changed something worth
          // re-rendering for (location, canGoBack) without changing the list.
          // Selectors are what keep that from waking everyone: `tabs`,
          // `activeId` and `warmIds` all ride across unchanged.
          const previous = state;
          state = { ...state };
          emit(previous);
        }),
      );
    }
  };

  syncHistorySubscriptions();

  return {
    getState: () => state,
    getInitialState: () => initialState,
    set: (next) => {
      const resolved = typeof next === "function" ? next(state) : next;
      if (resolved === state) return;
      // The one place the warm set is derived. `set` is only ever called from a
      // real transition (open, close, focus, move, pin, label) — never from a
      // navigation tick — so this sorts once per user action, not per keystroke.
      const previous = state;
      state = withWarmIds(resolved);
      syncHistorySubscriptions();
      emit(previous);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
export const TabsProvider = ({ children }: { children: React.ReactNode }) => {
  const profileId = Arkitekt.useActiveProfileId();

  // Created once via the lazy initializer; re-booted (not re-created) when the
  // membership changes, so subscribers keep their subscription across a
  // profile switch.
  const [store] = useState<Store>(() => createStore(bootTabs(profileId, readBoot())));

  // Re-boot on membership change. `bootedFor` guards the first render, whose
  // boot already happened above. The boot path is deliberately `null` here:
  // the hash at this moment still mirrors the PREVIOUS membership's active
  // tab, and reading it as intent would open the old organization's page
  // inside the new one. A switch lands on that membership's own restored tabs.
  const bootedFor = useRef(profileId);
  useEffect(() => {
    if (bootedFor.current === profileId) return;
    bootedFor.current = profileId;
    store.set(bootTabs(profileId, null));
  }, [profileId, store]);

  // Persist, debounced: a burst of navigations in one tab should be one write.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = store.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        saveTabs(profileId, store.getState());
      }, 200);
    });
    return () => {
      unsubscribe();
      if (timer) {
        clearTimeout(timer);
        saveTabs(profileId, store.getState());
      }
    };
  }, [profileId, store]);

  // Mirror the active tab's location into the URL hash, so a reload and the
  // existing deep-link path still land somewhere. `replaceState`, never
  // `location.hash =`: the real browser history must not grow, and we must
  // not fire the `hashchange` we listen to below.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let last = "";
    const mirror = () => {
      const next = hashFor(activeTabOf(store.getState()).history.location, baseName);
      if (next === last) return;
      last = next;
      if (window.location.hash !== next) {
        window.history.replaceState(window.history.state, "", next);
      }
    };
    mirror();
    const unsubscribe = store.subscribe(mirror);

    // A hash the USER edited (the web build's URL bar) navigates the active tab.
    const onHashChange = () => {
      const path = readBootPath(window.location.hash, baseName);
      if (!path) return;
      const tab = activeTabOf(store.getState());
      const current = `${tab.history.location.pathname}${tab.history.location.search}${tab.history.location.hash}`;
      if (path !== current) tab.history.push(path);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => {
      unsubscribe();
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [store]);

  // Actions. All stable: they close over the store, never over state.
  const open = useCallback<TabActions["open"]>(
    (to, options) => store.set((s) => openTab(s, to, options)),
    [store],
  );
  const focus = useCallback((id: string) => store.set((s) => focusTab(s, id)), [store]);
  const close = useCallback((id: string) => store.set((s) => closeTab(s, id)), [store]);
  const closeOthers = useCallback(
    (id: string) => store.set((s) => closeOtherTabs(s, id)),
    [store],
  );
  const move = useCallback(
    (id: string, toIndex: number) => store.set((s) => moveTab(s, id, toIndex)),
    [store],
  );
  const setLabel = useCallback<TabActions["setLabel"]>(
    (id, label, origin) => store.set((s) => setTabLabel(s, id, label, origin)),
    [store],
  );
  const setPinned = useCallback<TabActions["setPinned"]>(
    (id, pinned) => store.set((s) => setTabPinned(s, id, pinned)),
    [store],
  );

  // Deep links. Main sends `tabs:open` instead of spawning a window; the web
  // build has no bridge, hence the guards. `evict` because a link the user
  // clicked must land even when the strip is full.
  useEffect(() => {
    const dispose = window.api?.tabs?.onOpen?.(({ path }) =>
      open(normalizeDeepLinkPath(path), { evict: true }),
    );
    return dispose;
  }, [open]);

  // Hotkeys. Capture phase on `window`, like the palette's, so they win over
  // whatever has focus.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("[data-command-hotkey='off']")) return;

      const meta = e.metaKey || e.ctrlKey;

      if (meta && !e.shiftKey && e.key === "w") {
        e.preventDefault();
        close(store.getState().activeId);
        return;
      }

      // ⌘T makes the tab NOW, on the new-tab page, and the search is that
      // page — as a browser does — rather than a palette that would only make
      // a tab once something was chosen in it.
      if (meta && !e.shiftKey && e.key === "t") {
        e.preventDefault();
        open(NEW_TAB_PATH);
        return;
      }

      // Ctrl+Tab / Ctrl+Shift+Tab cycle, as every browser does.
      if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        const s = store.getState();
        const i = s.tabs.findIndex((t) => t.id === s.activeId);
        const n = s.tabs.length;
        const next = s.tabs[(i + (e.shiftKey ? -1 : 1) + n) % n];
        if (next) focus(next.id);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [store, close, focus, open]);

  // Links, the browser's way: ⌘/Ctrl-click and middle-click open an in-app
  // link in a background tab (`linkClicks.ts`). Capture phase on `window`, so
  // the claim lands before the link's own handler — react-router's `Link`
  // skips a prevented click, and the propagation stop keeps a card's click
  // handler from also acting on it. `evict`, as for deep links: a link the
  // user clicked must land even when the strip is full.
  useEffect(() => {
    const claim = (e: MouseEvent) => {
      const anchor = (e.target as Element | null)?.closest?.("a[href]");
      if (!anchor) return null;
      return linkClickIntent(e, anchor);
    };
    const onClick = (e: MouseEvent) => {
      const intent = claim(e);
      if (!intent) return;
      e.preventDefault();
      e.stopPropagation();
      open(intent.to, { background: intent.background, evict: true });
    };
    // Middle-button mousedown starts autoscroll on Windows/Linux; not on a link.
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 1 && claim(e)) e.preventDefault();
    };
    window.addEventListener("click", onClick, true);
    window.addEventListener("auxclick", onClick, true);
    window.addEventListener("mousedown", onMouseDown, true);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("auxclick", onClick, true);
      window.removeEventListener("mousedown", onMouseDown, true);
    };
  }, [open]);

  // Not an optimization: the identity of this object is a CONTRACT.
  // `useTabActions` promises callers — every page in the app through
  // `useTabTitle`, every row of the strip — that reading the actions never
  // re-renders them. If this value changed identity, all of them would
  // re-render on every provider render and the selector work above would be
  // undone in one line. `TabsProvider.isolation.test.tsx` holds us to it.
  const actions = useMemo(
    () => ({ open, focus, close, closeOthers, move, setLabel, setPinned }),
    [open, focus, close, closeOthers, move, setLabel, setPinned],
  );

  return (
    <StoreContext.Provider value={store}>
      <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
    </StoreContext.Provider>
  );
};

const noop = () => {};
const ActionsContext = createContext<TabActions>({
  open: noop,
  focus: noop,
  close: noop,
  closeOthers: noop,
  move: noop,
  setLabel: noop,
  setPinned: noop,
});

const useStore = (): Store => {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("useTabs must be used within a TabsProvider");
  }
  return store;
};

/**
 * The one way to read the tab store.
 *
 * Select the NARROWEST thing the caller needs. The store republishes on every
 * navigation in every tab (see the note on `createStore`), so a selector that
 * returns the whole state — or a fresh object literal — re-renders its caller
 * at navigation rate, which for `useTabTitle` means every page in the app.
 * `tabs`, `activeId` and `warmIds` all keep their identity across a navigation,
 * so naming one of them is enough to sleep through it.
 */
const useTabsSelector = <T,>(
  select: (state: TabsSnapshot) => T,
  isEqual?: (a: T, b: T) => boolean,
): T => useStoreWithEqualityFn(useStore(), select, isEqual);

const noSubscribe = () => () => {};
const noTab = () => null;

/**
 * The active tab's id, or `null` when there is no tab store above.
 *
 * For chrome that must also work without tabs (the palette provider is
 * rendered bare in tests, and the welcome screen has no tabs at all). Only
 * re-renders when the ACTIVE id changes, not on every navigation.
 */
export const useActiveTabIdOrNull = (): string | null => {
  const store = useContext(StoreContext);
  return useSyncExternalStore(
    store ? store.subscribe : noSubscribe,
    store ? () => store.getState().activeId : noTab,
    store ? () => store.getState().activeId : noTab,
  );
};

/**
 * The tab actions alone: stable, so reading them never re-renders, and inert
 * (not throwing) with no tab store above. This is what a caller that only ever
 * DOES something to the tabs should use — opening one from a local action row,
 * reporting a page's title — and it is the common case. Anything that also
 * reads state should take the narrowest selector hook below, never both.
 */
export const useTabActions = (): TabActions => useContext(ActionsContext);

/** Every open tab. New identity only on a real transition, never on navigation. */
export const useTabList = (): TabRecord[] => useTabsSelector((s) => s.tabs);

/** The active tab's id. */
export const useActiveTabId = (): string => useTabsSelector((s) => s.activeId);

/** The active tab itself — for callers that need its label or pinned flag. */
export const useActiveTab = (): TabRecord => useTabsSelector(activeTabOf);

/**
 * Where the active tab is, and whether it can go back or forward.
 *
 * The history OBJECT is stable per tab, so selecting it alone would never wake
 * a subscriber on a navigation — which is the whole thing `ActiveTabRouter` and
 * the rail's Back/Forward buttons exist to react to. So the live getters are
 * read off it here, into a fresh object that is then shallow-compared: the
 * active tab moving changes `location`, and a BACKGROUND tab moving changes
 * none of these five fields, so it does not re-render anyone.
 *
 * This is the one selector allowed to build an object, and the equality
 * function is what makes that safe.
 */
export type ActiveTabView = {
  history: TabHistory;
  location: Location;
  action: Action;
  canGoBack: boolean;
  canGoForward: boolean;
};

export const useActiveTabView = (): ActiveTabView =>
  useTabsSelector((s) => {
    const { history } = activeTabOf(s);
    return {
      history,
      location: history.location,
      action: history.action,
      canGoBack: history.canGoBack,
      canGoForward: history.canGoForward,
    };
  }, shallow);

/**
 * The tabs that are mounted: the active one plus the most recent, capped by
 * `MAX_WARM`. Cold tabs keep their history in the store but have no DOM.
 */
export const useWarmTabs = (): TabRecord[] =>
  useTabsSelector(
    (s) => s.tabs.filter((tab) => s.warmIds.has(tab.id)),
    // The filter allocates a new array on every tick; this is what stops that
    // array from re-rendering `TabOutlet` when its contents did not change.
    shallow,
  );

export default TabsProvider;
