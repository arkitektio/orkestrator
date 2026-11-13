import React, { ReactNode, useEffect, useMemo, useState } from "react";

import { ArkitektContext } from "./context";
import { createConnectionController } from "./controller/controller";
import { Manifest } from "./fakts/manifestSchema";
import { PROFILE_BOOK_STORAGE_KEY } from "./fakts/profileStorageSchema";
import {
  useArkitekt,
  useArkitektActions,
  useArkitektStore,
  useArkitektStoreApi,
  useAvailableModuleKeys,
  useAvailableModules,
  useAvailableServices,
  useConfigurationIssues,
  useConnection,
  useConnectionStatus,
  useModuleState,
  usePotentialService,
  useReadyModuleKeys,
  useService,
  useServiceState,
} from "./hooks";
import { AppContext, ModuleRegistry, ServiceBuilder, ServiceBuilderMap } from "./types";
import { buildConnectionWards } from "./ward";

type StorageProvider = () => Promise<Storage>;

export type ArkitektProviderProps<
  T extends ServiceBuilderMap = ServiceBuilderMap,
  S extends ServiceBuilder = ServiceBuilder,
> = {
  children: ReactNode;
  manifest: Manifest;
  serviceBuilderMap: T;
  selfServiceBuilder: S;
  moduleRegistry?: ModuleRegistry;
  storageProvider?: StorageProvider;
};

/**
 * Puts the connection in the tree. Everything the connection DOES lives in
 * the controller (`controller/controller.ts`), which needs no React; this
 * creates one for the life of the provider, runs its three effects (mount,
 * launch, following the book other windows write) and hands its store and
 * actions down.
 */
export const ArkitektProvider = <T extends ServiceBuilderMap, S extends ServiceBuilder>({
  children,
  manifest,
  serviceBuilderMap,
  selfServiceBuilder,
  moduleRegistry,
  storageProvider,
}: ArkitektProviderProps<T, S>) => {
  // The manifest and the service map are fixed for this provider, as they
  // always were: the store is seeded from them once.
  const [controller] = useState(() =>
    createConnectionController<T, S>({ manifest, serviceBuilderMap, selfServiceBuilder, moduleRegistry, storageProvider }),
  );
  controller.setStorageProvider(storageProvider);
  const { store, actions } = controller;

  useEffect(() => controller.mount(), [controller]);

  // ── load the profile book, activate the live one, health-check ──
  useEffect(() => {
    void controller.boot();
  }, [controller]); // runs once on mount

  // ── Follow the book as OTHER windows write it ──
  // `storage` fires only in windows that did not do the write.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== PROFILE_BOOK_STORAGE_KEY) return;
      void controller.followBook();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [controller]);

  // Ctrl/Cmd+X to clear caches
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (e.key === "x" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        await actions.clearAllServiceCaches();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [actions]);

  // The service map is fixed for this provider, and each ward reads the store when called.
  const [wards] = useState(() => buildConnectionWards(serviceBuilderMap, store.getState as () => AppContext));

  const contextValue = useMemo(() => ({ store, actions, wards }), [store, actions, wards]);

  return <ArkitektContext.Provider value={contextValue}>{children}</ArkitektContext.Provider>;
};

// ── Guards ──

export type ConnectedGuardProps = {
  notConnectedFallback?: React.ReactNode;
  connectingFallback?: React.ReactNode;
  /**
   * Shown while a STORED profile is being auto-logged in — the launch path,
   * which is neither "signed out" nor "the user is waiting on a browser
   * grant". Defaults to `connectingFallback`, so every existing caller keeps
   * the behaviour it had.
   */
  bootingFallback?: React.ReactNode;
};

export const ConnectedGuard = ({
  notConnectedFallback = "Not Connected",
  connectingFallback = "Loading...",
  bootingFallback,
  children,
}: ConnectedGuardProps & { children: ReactNode }) => {
  // Narrow, shallow-compared selection: this guard wraps every module route,
  // so subscribing to the whole store rerendered them on every store tick.
  const { hasSelfService, connecting, hasStoredSession, hasBootstrapped, hasActiveProfile } =
    useConnectionStatus();

  if (hasSelfService) return <>{children}</>;

  // Booting is tested BEFORE `hasStoredSession`, which is what it turns on:
  // the session only exists once the parked token has been refreshed, so until
  // then the old ordering could only call an auto-login "signed out" and paint
  // the welcome screen over a launch that was about to succeed.
  if (!hasBootstrapped && hasActiveProfile) {
    return <>{bootingFallback ?? connectingFallback}</>;
  }

  if (!hasStoredSession) return <>{notConnectedFallback}</>;

  if (connecting || !hasBootstrapped) return <>{connectingFallback}</>;

  return <>{notConnectedFallback}</>;
}

// ── Builder helper ──

export type ArkitektBuilderOptions<T extends ServiceBuilderMap, S extends ServiceBuilder> = {
  manifest: Manifest;
  serviceBuilderMap: T;
  selfServiceBuilder: S;
  moduleRegistry?: ModuleRegistry;
  storageProvider?: StorageProvider;
};

export const buildArkitektProvider =
  <T extends ServiceBuilderMap, S extends ServiceBuilder>(options: ArkitektBuilderOptions<T, S>) =>
  ({ children }: { children: ReactNode }) => (
    <ArkitektProvider
      manifest={options.manifest}
      serviceBuilderMap={options.serviceBuilderMap}
      selfServiceBuilder={options.selfServiceBuilder}
      moduleRegistry={options.moduleRegistry}
      storageProvider={options.storageProvider}
    >
      {children}
    </ArkitektProvider>
  );

// ── Re-exports ──

export {
  useArkitekt,
  useArkitektActions,
  useArkitektStore,
  useArkitektStoreApi,
  useAvailableModuleKeys,
  useAvailableModules,
  useAvailableServices,
  useConfigurationIssues,
  useConnection,
  useModuleState,
  usePotentialService,
  useReadyModuleKeys,
  useService,
  useServiceState,
};

export type { AliasMap, ServiceMap } from "./runtime/connection";

export type {
  AppContext,
  ArkitektContextType,
  ModuleDefinition,
  ModuleRegistry,
  ModuleRuntimeState,
  Service,
  ServiceBuilder,
  ServiceBuilderMap,
  ServiceDefinition,
  ServiceRuntimeState,
} from "./types";
