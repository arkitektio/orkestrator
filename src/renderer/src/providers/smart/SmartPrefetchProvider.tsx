import { Arkitekt } from "@/app/Arkitekt";
import { useSettings } from "@/providers/settings/SettingsContext";
import React from "react";
import { createSmartPrefetcher, type PrefetchClient } from "./extensions/prefetch";
import { SmartPrefetchContext } from "./extensions/prefetchContext";

/**
 * One prefetcher for the app, handed to `SmartSurface` (hover, selection) and
 * to every `ObjectButton` (pointer enter). It reads the rekuest client off the
 * Arkitekt store at call time, so it works from document listeners and copes
 * with the service coming up later.
 *
 * An experiment (Settings → General): with `experimentMenuPrefetch` off there
 * is no prefetcher at all — the context stays null, which every consumer
 * already handles, so the menu simply queries when it opens.
 */
export const SmartPrefetchProvider = ({ children }: { children: React.ReactNode }) => {
  const store = Arkitekt.useStoreApi();
  const { settings } = useSettings();
  const enabled = settings.experimentMenuPrefetch !== false;
  const prefetcher = React.useMemo(
    () =>
      enabled
        ? createSmartPrefetcher({
            getClients: () => {
              const state = store.getState();
              const ready = state.serviceStates.rekuest?.status === "ready";
              const client = ready
                ? (state.connection?.serviceMap.rekuest?.client as PrefetchClient | undefined)
                : undefined;
              return { rekuest: client };
            },
          })
        : null,
    [store, enabled],
  );
  return (
    <SmartPrefetchContext.Provider value={prefetcher}>{children}</SmartPrefetchContext.Provider>
  );
};
