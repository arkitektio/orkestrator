import { useEffect, useRef } from "react";
import type { ApolloClient } from "@apollo/client";
import { useConnection } from "@/lib/arkitekt/provider";

/** Paired `focus` + `visibilitychange` events fire for one reactivation, and a
 *  user alt-tabbing back and forth should not trigger a sweep each time.
 *  Collapse anything within this window into a single refetch sweep. */
const COOLDOWN_MS = 10_000;

/** A blur/hide shorter than this is a glance at another window, not an absence
 *  during which the data went stale — skip the sweep entirely. */
const MIN_AWAY_MS = 2_000;

/**
 * Queries whose cache is authoritative and must NOT be refetched from the
 * network on reactivation. `MyTasks` is seeded once and then kept live by the
 * WatchMyTasks subscription plus local cache writes; a network refetch would
 * overwrite it with the server's list, which no longer contains just-finished
 * tasks (see `rekuest/hooks/useTasks.tsx`).
 */
const EXCLUDED_QUERY_NAMES = new Set(["MyTasks"]);

/**
 * Re-run every currently-active GraphQL query when the app is reactivated —
 * i.e. when the window regains focus or the tab becomes visible again after the
 * user switched to another app (or the machine slept).
 *
 * Iterates the live `serviceMap` and calls `refetchQueries({ include: "active" })`
 * on each ready Apollo client, so whatever is on screen refreshes transparently.
 * Subscriptions are untouched — only active queries re-run.
 */
export const useRefetchOnReactivate = () => {
  const connection = useConnection();

  // Keep the latest connection in a ref so the listeners are bound once and
  // don't churn every time the service map changes.
  const connectionRef = useRef(connection);
  connectionRef.current = connection;

  const lastRunRef = useRef(0);
  // When the window was last hidden / blurred; `undefined` while it is active.
  const hiddenSinceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onDeactivate = () => {
      if (hiddenSinceRef.current === undefined) {
        hiddenSinceRef.current = Date.now();
      }
    };

    const onReactivate = () => {
      const now = Date.now();
      const hiddenSince = hiddenSinceRef.current;
      hiddenSinceRef.current = undefined;

      // Not away long enough for anything to have gone stale.
      if (hiddenSince !== undefined && now - hiddenSince < MIN_AWAY_MS) return;
      if (now - lastRunRef.current < COOLDOWN_MS) return;
      lastRunRef.current = now;

      const serviceMap = connectionRef.current?.serviceMap;
      if (!serviceMap) return;

      for (const service of Object.values(serviceMap)) {
        if (service?.type !== "apollo") continue;
        try {
          const client = service.client as ApolloClient<unknown>;
          void client.refetchQueries({
            include: "active",
            onQueryUpdated: (observable) =>
              !EXCLUDED_QUERY_NAMES.has(observable.queryName ?? ""),
          });
        } catch (e) {
          console.warn("[refetch-on-reactivate] refetch failed for service:", e);
        }
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") onReactivate();
      else onDeactivate();
    };

    window.addEventListener("focus", onReactivate);
    window.addEventListener("blur", onDeactivate);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onReactivate);
      window.removeEventListener("blur", onDeactivate);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
};

/** Mount once inside `Arkitekt.Provider` to enable refetch-on-reactivate. */
export const RefetchOnReactivate = () => {
  useRefetchOnReactivate();
  return null;
};
