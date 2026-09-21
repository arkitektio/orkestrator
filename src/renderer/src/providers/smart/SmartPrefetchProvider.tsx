import { Arkitekt } from "@/app/Arkitekt";
import React from "react";
import { createSmartPrefetcher, type PrefetchClient } from "./extensions/prefetch";
import { SmartPrefetchContext } from "./extensions/prefetchContext";

/**
 * One prefetcher for the app, handed to `SmartSurface` (hover, selection) and
 * to every `ObjectButton` (pointer enter). It reads the rekuest client off the
 * Arkitekt store at call time, so it works from document listeners and copes
 * with the service coming up later.
 */
export const SmartPrefetchProvider = ({ children }: { children: React.ReactNode }) => {
  const store = Arkitekt.useStoreApi();
  const prefetcher = React.useMemo(
    () =>
      createSmartPrefetcher({
        getClients: () => {
          const state = store.getState();
          const ready = state.serviceStates.rekuest?.status === "ready";
          const client = ready
            ? (state.connection?.serviceMap.rekuest?.client as PrefetchClient | undefined)
            : undefined;
          return { rekuest: client };
        },
      }),
    [store],
  );
  return (
    <SmartPrefetchContext.Provider value={prefetcher}>{children}</SmartPrefetchContext.Provider>
  );
};
