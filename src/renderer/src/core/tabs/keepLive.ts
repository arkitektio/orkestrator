import { useContext, useEffect, useRef } from "react";
import { UNSAFE_LocationContext } from "react-router-dom";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import { useTabId } from "./TabContext";

/**
 * Which tabs must stay LIVE while hidden: tab id → the path that asked.
 *
 * A hidden warm tab is frozen (`TabOutlet` renders it in a hidden
 * `<Activity>`): its effects are torn down, so its queries stop watching,
 * its pollers stop and its subscriptions close, until it is shown again. A
 * page that cannot survive that — a GPU canvas whose context and uploads would
 * be thrown away — asks to be kept live instead with `useKeepTabLive()`, and
 * its tab is only hidden with CSS, as before.
 *
 * Keyed by path, not cleared on cleanup: the cleanup is exactly what freezing
 * runs, so a cleared entry would unfreeze nothing. Navigating the tab away
 * from the page is what ends it.
 */
const keepLiveStore = createStore<Record<string, string>>(() => ({}));

/** Keep this tab live while hidden, for as long as it shows this path. */
export const useKeepTabLive = () => {
  const tabId = useTabId();
  // Read, not `useLocation()`: a canvas may also render where there is no
  // router (an offscreen root), and outside a tab there is nothing to keep.
  const pathname = useContext(UNSAFE_LocationContext)?.location?.pathname;
  useEffect(() => {
    if (!tabId || pathname === undefined || keepLiveStore.getState()[tabId] === pathname) return;
    keepLiveStore.setState({ [tabId]: pathname });
  }, [tabId, pathname]);
};

/** Whether the tab asked to stay live at the path it is showing. */
export const useTabKeptLive = (tabId: string, pathname: string): boolean =>
  useStore(keepLiveStore, (state) => state[tabId] === pathname);

/** Hidden for less than this is a glance at another tab: nothing went stale. */
const MIN_HIDDEN_MS = 5_000;

/**
 * Refetch when a frozen tab is shown again after a while.
 *
 * While frozen, a page's subscriptions are closed and their events lost, and a
 * route query is `cache-first`, so on its own it would come back showing what
 * it showed when it was hidden. A list (`cache-and-network`) needs none of
 * this: Apollo refetches it when it is watched again.
 *
 * Effects run again when an `<Activity>` is revealed and their cleanup ran
 * when it was hidden; refs survive both. So: the cleanup stamps when the page
 * went away, the next run (not the first one) refetches if that was long ago.
 */
export const useRefetchOnReveal = (refetch: (() => unknown) | undefined, skip = false) => {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    const since = hiddenAt.current;
    if (!skip && since !== null && Date.now() - since >= MIN_HIDDEN_MS) {
      void Promise.resolve(refetchRef.current?.()).catch(() => {});
    }
    return () => {
      hiddenAt.current = Date.now();
    };
  }, [skip]);
};
