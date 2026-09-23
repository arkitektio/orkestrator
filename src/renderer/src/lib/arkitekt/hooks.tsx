import { hasBootstrapped, isGranting, switchingProfileId } from "./session/state";
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
import {
  getActiveProfile,
  listProfiles,
  type StoredProfile,
} from "./fakts/profileStorageSchema";

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
      connecting: isGranting(state.activity),
      hasStoredSession: !!state.storedSession,
      hasBootstrapped: hasBootstrapped(state.activity),
      /**
       * A login this window is expected to come up in — seeded from the profile
       * book before the first paint, so it is knowable a full network round-trip
       * before `storedSession` exists.
       */
      hasActiveProfile: !!state.profileBook.activeProfileId,
    })),
  );

/** This window belongs to an account, whether or not its token is back yet. */
export const useHasActiveProfile = (): boolean =>
  useArkitektStore((state) => !!state.profileBook.activeProfileId);

/** A stored profile is being brought up right now (launch, not a browser grant). */
export const useIsAutoLoggingIn = (): boolean =>
  useArkitektStore(
    (state) => !hasBootstrapped(state.activity) && !!state.profileBook.activeProfileId,
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

/**
 * One module's state. Prefer this over picking an entry out of
 * `useAvailableModules()`: that list's `useShallow` compares the ENTRIES, and a
 * health tick replaces the entry it touched (`lastCheckedAt`), so the whole
 * list — and every component rendering from it — changes identity because one
 * service was polled. Selecting a single key means a tick in one module wakes
 * only that module's UI.
 */
export const useModuleState = (key: string): ModuleRuntimeState | undefined =>
  useArkitektStore((state) => state.moduleStates[key]);

/**
 * The keys of every module worth showing, and nothing else about them.
 *
 * Strings, so the shallow compare actually holds across a health tick — which
 * is the point: the rail's tile grid should redraw when a module APPEARS, not
 * when one is polled.
 */
export const useAvailableModuleKeys = (): string[] =>
  useArkitektStore(
    useShallow((state) =>
      Object.values(state.moduleStates)
        .filter((entry) => entry.status !== "hidden")
        .map((entry) => entry.key),
    ),
  );

/** The keys of the modules that are ready, for callers that preload on ready. */
export const useReadyModuleKeys = (): string[] =>
  useArkitektStore(
    useShallow((state) =>
      Object.values(state.moduleStates)
        .filter((entry) => entry.status === "ready")
        .map((entry) => entry.key),
    ),
  );

export const usePotentialService = (key: string): Service | undefined =>
  useArkitektStore((state) => state.connection?.serviceMap?.[key] as Service | undefined );






/**
 * The live access token. The session record is where a token lives — the
 * rotation writes it there first; `connection.token` is only a mirror kept
 * for consumers that hold the connection object (the agent).
 */
export const useToken = (): string | null =>
  useArkitektStore((state) => state.storedSession?.token?.access_token ?? null);

export const useConnection = () => useArkitektStore((state) => state.connection);

/**
 * Every login this app is holding, most recently used first.
 *
 * Reads the profile book and nothing else — no lok query, no live connection —
 * so the switcher renders identically whether the user is signed in, signed out,
 * or offline. Cached labels are what make that possible.
 */
export const useProfiles = (): StoredProfile[] =>
  useArkitektStore(useShallow((state) => listProfiles(state.profileBook)));

export const useActiveProfileId = (): string | null =>
  useArkitektStore((state) => state.profileBook.activeProfileId);

export const useActiveProfile = (): StoredProfile | null =>
  useArkitektStore((state) => getActiveProfile(state.profileBook));

/** The profile a switch is currently proving, if any. */
export const useSwitchingProfileId = (): string | null =>
  useArkitektStore((state) => switchingProfileId(state.activity));

export const useManifest = () => useArkitektStore((state) => state.manifest);

export const useConfigurationIssues = (): string[] =>
  useArkitektStore((state) => state.configurationIssues);
