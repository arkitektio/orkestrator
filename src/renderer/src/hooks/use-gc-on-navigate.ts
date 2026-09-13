import { useEffect, useRef } from "react";
import type { ApolloClient } from "@apollo/client";
import { useLocation } from "react-router-dom";
import { useConnection } from "@/lib/arkitekt/provider";

/** At most one sweep per this window, however often the route changes. */
const THROTTLE_MS = 60_000;

/**
 * Run `cache.gc()` on every ready Apollo client when the route changes,
 * throttled to once per minute.
 *
 * `gc()` only frees normalized objects that nothing references any more —
 * rows that a refetch / list-page merge dropped, evicted entities' children,
 * detail objects of pages the user left. Nothing in the app ever called it, so
 * those accumulated for the lifetime of the window. A route change is the
 * natural moment: the leaving page's queries are gone and their orphans are
 * collectable, and the sweep is cheap enough to run a few times a session.
 */
export const useGcOnNavigate = () => {
  const { pathname } = useLocation();
  const connection = useConnection();

  // Keep the latest connection in a ref so the effect only re-runs on
  // navigation, not on every service map change.
  const connectionRef = useRef(connection);
  connectionRef.current = connection;

  const lastRunRef = useRef(0);

  useEffect(() => {
    const now = Date.now();
    if (now - lastRunRef.current < THROTTLE_MS) return;
    lastRunRef.current = now;

    const serviceMap = connectionRef.current?.serviceMap;
    if (!serviceMap) return;

    for (const service of Object.values(serviceMap)) {
      if (service?.type !== "apollo") continue;
      try {
        (service.client as ApolloClient<unknown>).cache.gc();
      } catch (e) {
        console.warn("[gc-on-navigate] cache.gc failed for service:", e);
      }
    }
  }, [pathname]);
};

/** Mount once inside `Arkitekt.Provider` (and the router) to enable it. */
export const GcOnNavigate = () => {
  useGcOnNavigate();
  return null;
};
