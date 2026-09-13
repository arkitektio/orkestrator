import { useContext, useMemo } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { ArkitektContext } from "./context";
import {
  AppContext,
  AppFunctions,
  ArkitektContextType,
  ModuleRuntimeState,
  Service,
  ServiceRuntimeState,
} from "./types";

const useArkitektContext = () => {
  const context = useContext(ArkitektContext);

  if (!context) {
    throw new Error("Arkitekt provider missing");
  }

  return context;
};

export const useArkitektStore = <T,>(selector: (state: AppContext) => T) => {
  const { store } = useArkitektContext();

  return useStore(store, selector);
};

export const useArkitektActions = (): AppFunctions => useArkitektContext().actions;

/** The raw store, for imperative reads and subscriptions outside React. */
export const useArkitektStoreApi = () => useArkitektContext().store;

/**
 * The connection status fields a guard needs, shallow-compared so token
 * refreshes and service health ticks do not rerender the guarded tree.
 */
export const useConnectionStatus = () =>
  useArkitektStore(
    useShallow((state) => ({
      hasSelfService: !!state.connection?.selfService,
      connecting: state.connecting,
      hasStoredSession: !!state.storedSession,
      hasBootstrapped: state.hasBootstrapped,
    })),
  );

/**
 * Merged store state + actions. Subscribes to the WHOLE store: every store
 * write rerenders the caller. Prefer a narrow hook (`useConnection`,
 * `useArkitektActions`, `useConnectionStatus`, …) in anything mounted often.
 */
export const useArkitekt = () => {
  const state = useArkitektStore((currentState) => currentState) as AppContext;
  const actions = useArkitektActions();

  return useMemo(
    () => ({
      ...state,
      ...actions,
    }),
    [actions, state],
  ) as ArkitektContextType;
};

export const useService = (key: string): Service => {
  const service = useArkitektStore((state) => state.connection?.serviceMap[key]);

  if (!service) {
    throw new Error(`Service ${key} not found`);
  }

  return service as Service;
};

export const useSelfService = (): Service => {
  const service = useArkitektStore((state) => {
    const selfService = state.connection?.selfService;
    return selfService;
  });

  if (!service) {
    throw new Error(`Self service not found`);
  }

  return service;
};

export const useAvailableServices = (): ServiceRuntimeState[] =>
  useArkitektStore(
    useShallow((state) => Object.values(state.serviceStates).filter((entry) => entry.configured)),
  );

export const useAvailableModules = (): ModuleRuntimeState[] =>
  useArkitektStore(
    useShallow((state) => Object.values(state.moduleStates).filter((entry) => entry.status !== "hidden")),
  );

export const useServiceState = (key: string): ServiceRuntimeState | undefined =>
  useArkitektStore((state) => state.serviceStates[key]);

export const usePotentialService = (key: string): Service | undefined =>
  useArkitektStore((state) => state.connection?.serviceMap?.[key] as Service | undefined );






export const useToken = () => {
  const token = useArkitektStore((state) => state.connection?.token ?? state.storedSession?.token ?? null);
  return token?.access_token || null;
};

export const useConnection = () => useArkitektStore((state) => state.connection);

export const useManifest = () => useArkitektStore((state) => state.manifest);

export const useConfigurationIssues = (): string[] =>
  useArkitektStore((state) => state.configurationIssues);
