import { Arkitekt } from "@/app/Arkitekt";
import { useSettings } from "@/providers/settings/SettingsContext";
import React from "react";
import { createSmartPrefetcher, type PrefetchClient } from "./extensions/prefetch";
import { SmartPrefetchContext } from "./extensions/prefetchContext";
import { smartSections } from "./hostRegistries";

/**
 * One prefetcher for the app, handed to `SmartSurface` (hover, selection) and
 * to every `ObjectButton` (pointer enter). It warms what the registered
 * sections ask for, reading each service's client off the Arkitekt store at
 * call time, so it works from document listeners and copes with a service
 * coming up later.
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
            getSections: () => smartSections().sections,
            getClient: (service) => {
              const state = store.getState();
              if (state.serviceStates[service]?.status !== "ready") return undefined;
              const services = state.connection?.serviceMap as
                | Record<string, { client?: unknown } | undefined>
                | undefined;
              return services?.[service]?.client as PrefetchClient | undefined;
            },
          })
        : null,
    [store, enabled],
  );
  return (
    <SmartPrefetchContext.Provider value={prefetcher}>{children}</SmartPrefetchContext.Provider>
  );
};
