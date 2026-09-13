import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { checkAliasHealth, resolveWorkingAlias } from "./alias/resolve";
import { buildAliases } from "./builder";
import { ArkitektContext } from "./context";
import { useConnectionStatus } from "./hooks";
import { flow } from "./fakts/flow";
import { Manifest } from "./fakts/manifestSchema";
import {
  clearStoredArkitektStorage,
  StoredArkitektSession,
  StoredArkitektSessionSchema,
  loadStoredArkitektSession,
  loadStoredEndpoint,
  writeStoredAliasMap,
  writeStoredArkitektSession,
  writeStoredEndpoint,
  writeStoredFakts,
  writeStoredToken,
} from "./fakts/sessionStorageSchema";
import {
  useArkitekt,
  useArkitektActions,
  useArkitektStore,
  useAvailableModules,
  useAvailableServices,
  useConfigurationIssues,
  useConnection,
  usePotentialService,
  useService,
  useServiceState,
} from "./hooks";
import {
  AppContext,
  AppFunctions,
  ConnectedContext,
  EnhancedManifest,
  GetToken,
  ModuleRegistry,
  Service,
  ServiceBuilder,
  ServiceBuilderMap,
  ServiceRuntimeState,
} from "./types";
import { enhanceManifest, report } from "./utils";
import {
  isAbortLikeError,
  normalizeToken,
  refreshAccessToken,
  shouldRefreshToken,
} from "./runtime/auth";
import { disposeConnection, instantiateConnection, type ServiceMap } from "./runtime/connection";
import {
  buildConfigurationIssues,
  buildModuleStates,
  buildServiceStates,
  createModuleRegistryFromServices,
} from "./runtime/state";
import { createArkitektStateStore } from "./store";
import { TokenRotation } from "./runtime/tokenRotation";

// Bootstrap/token tracing is noisy and some of it sits on hot paths (e.g. the
// token check runs on every GraphQL request via the Apollo auth link). Keep the
// tracing available for debugging but silent by default so it never floods the
// console or pays serialization cost during normal use.
const DEBUG = false;
const dlog = (...args: unknown[]) => {
  if (DEBUG) console.log(...args);
};

type StoredSession = StoredArkitektSession | null;
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

export const ArkitektProvider = <T extends ServiceBuilderMap, S extends ServiceBuilder>({
  children,
  manifest,
  serviceBuilderMap,
  selfServiceBuilder,
  moduleRegistry,
  storageProvider = async () => localStorage,
}: ArkitektProviderProps<T, S>) => {
  const resolvedModuleRegistry = useMemo(
    () => moduleRegistry || createModuleRegistryFromServices(serviceBuilderMap),
    [moduleRegistry, serviceBuilderMap],
  );
  const storageProviderRef = useRef<StorageProvider>(storageProvider);
  storageProviderRef.current = storageProvider;

  const controllerRef = useRef<AbortController | null>(null);
  const validationRunIdsRef = useRef<Record<string, number>>({});

  const refreshInitialized = useRef(false);

  // The single refreshToken function passed to all service builders.
  // Behind an async lock so concurrent callers wait for the same refresh.
  const refreshTokenRef = useRef<GetToken>(
    () => { throw new Error("Provider not initialized"); },
  );

  const [store] = useState(() => {
    const initialManifest: EnhancedManifest = { ...manifest, node_id: undefined };

    return createArkitektStateStore<T, S>({
      manifest: initialManifest,
      connection: undefined,
      autoLoginError: undefined,
      connecting: false,
      hasBootstrapped: false,
      configurationIssues: buildConfigurationIssues(serviceBuilderMap, resolvedModuleRegistry, null),
      serviceStates: buildServiceStates(serviceBuilderMap, null),
      moduleStates: buildModuleStates(
        resolvedModuleRegistry,
        buildServiceStates(serviceBuilderMap, null),
      ),
      storedSession: null,
    });
  });

  // Wire up the locked refreshToken now that store exists
  if (!refreshInitialized.current) {
    refreshInitialized.current = true;
    dlog("[ArkitektProvider] Initializing refreshToken function");

    // The coalescing + forced-vs-raced rule lives in TokenRotation
    // (runtime/tokenRotation.ts); this callback is just the round-trip.
    const rotation = new TokenRotation(async () => {
      const session = store.getState().storedSession;
      if (!session) {
        console.error("[ArkitektProvider] No stored session available to refresh");
        throw new Error("No stored session available");
      }

      const currentToken = normalizeToken(session.token);
      if (!currentToken.refresh_token) {
        console.error("[ArkitektProvider] Token expired but no refresh_token available");
        throw new Error("No refresh token available – cannot refresh");
      }

      try {
        // Every refresh response re-renders the fakts envelope, so this is
        // also how instance/alias changes reach us without re-approval.
        const { token: nextToken, fakts: refreshedFakts } = await refreshAccessToken(
          session.endpoint.token_endpoint,
          currentToken,
          controllerRef.current || undefined,
        );
        // No envelope on the response means the server could not re-render it,
        // not that our config went away.
        const nextFakts = refreshedFakts ?? session.fakts;
        const storage = await storageProviderRef.current();

        dlog("[ArkitektProvider] Token refresh succeeded");
        const nextSession = { ...session, token: nextToken, fakts: nextFakts };
        writeStoredToken(nextToken, storage);
        writeStoredArkitektSession(nextSession, storage);

        const connection = store.getState().connection;
        store.setState({
          storedSession: nextSession,
          connection: connection
            ? {
                ...connection,
                token: nextToken,
                fakts: nextFakts,
                serviceInstanceMap: nextFakts.instances,
              }
            : connection,
        });

        return nextToken;
      } catch (refreshError) {
        console.error("[ArkitektProvider] Token refresh failed:", refreshError);
        throw refreshError;
      }
    });

    refreshTokenRef.current = async (options = {}) => {
      const forceRefresh = Boolean(options.forceRefresh);

      const session = store.getState().storedSession;
      if (!session) {
        console.error("[ArkitektProvider] getToken called but no stored session available");
        throw new Error("No stored session available");
      }

      // `forceRefresh` deliberately skips this: the caller is here because the
      // server rejected the token, so how fresh the clock says it is tells us
      // nothing. `isForcedInFlight` extends that to everyone else — while some
      // other client is replacing a rejected token, a "still fresh" cached
      // token is the rejected one, so join the rotation instead of handing it
      // out. Twelve Apollo clients share this token; they fail together.
      const currentToken = normalizeToken(session.token);
      if (!forceRefresh && !rotation.isForcedInFlight() && !shouldRefreshToken(currentToken)) {
        dlog("[ArkitektProvider] Token still valid, returning current token");
        return currentToken;
      }

      dlog("[ArkitektProvider] Refreshing token (forced:", forceRefresh, ")");
      return rotation.rotate({ forceRefresh });
    };
  }


  // ── helpers ──

  const deriveRuntimeState = useCallback(
    (
      current: AppContext<T, S>,
      overrides: {
      storedSession?: StoredSession;
      connection?: ConnectedContext<T, S>;
      serviceStateOverrides?: Record<string, Partial<ServiceRuntimeState>>;
    } = {},
    ) => {
      const session = overrides.storedSession !== undefined ? overrides.storedSession : current.storedSession;
      const connection = overrides.connection !== undefined ? overrides.connection : current.connection;

      const serviceStates = buildServiceStates(
        serviceBuilderMap,
        session,
        connection?.serviceMap as ServiceMap | undefined,
        current.serviceStates,
        overrides.serviceStateOverrides,
      );

      return {
        configurationIssues: buildConfigurationIssues(serviceBuilderMap, resolvedModuleRegistry, session),
        serviceStates,
        moduleStates: buildModuleStates(resolvedModuleRegistry, serviceStates),
      };
    },
    [serviceBuilderMap, resolvedModuleRegistry],
  );

  const recompute = useCallback(
    (overrides: {
      storedSession?: StoredSession;
      connection?: ConnectedContext<T, S>;
      serviceStateOverrides?: Record<string, Partial<ServiceRuntimeState>>;
    } = {}) => deriveRuntimeState(store.getState(), overrides),
    [store, deriveRuntimeState],
  );

  const hydrateConnection = useCallback(
    (
      session: StoredSession,
      manifestOverride?: EnhancedManifest,
      extras: Partial<AppContext<T, S>> = {},
    ) => {
      dlog("[ArkitektProvider] hydrateConnection called, session:", session ? "present" : "null");
      const activeManifest = manifestOverride ?? store.getState().manifest;
      // The previous connection is fully superseded here (connect / reconnect /
      // disconnect-with-null), so tear down its clients/sockets instead of orphaning them.
      const previousConnection = store.getState().connection;
      const connection = session
        ? instantiateConnection(session, activeManifest, serviceBuilderMap, selfServiceBuilder, () => refreshTokenRef.current())
        : undefined;
      dlog("[ArkitektProvider] hydrateConnection result, services:", connection ? Object.keys(connection.serviceMap) : "none");

      if (previousConnection) {
        disposeConnection(previousConnection);
      }

      store.setState({
        storedSession: session,
        connection,
        manifest: activeManifest,
        ...recompute({ storedSession: session, connection }),
        ...extras,
      });
    },
    [store, serviceBuilderMap, selfServiceBuilder, recompute],
  );

  const stageStoredSession = useCallback(
    (
      session: StoredSession,
      extras: Partial<AppContext<T, S>> = {},
    ) => {
      store.setState({
        storedSession: session,
        connection: undefined,
        ...recompute({ storedSession: session, connection: undefined }),
        ...extras,
      });
    },
    [store, recompute],
  );

  const setBootstrapped = useCallback(
    (extras: Partial<AppContext<T, S>> = {}) => {
      store.setState({
        connecting: false,
        hasBootstrapped: true,
        ...extras,
      });
    },
    [store],
  );

  const setBootstrapError = useCallback(
    (message: string) => {
      store.setState({
        storedSession: null,
        connection: undefined,
        connecting: false,
        hasBootstrapped: true,
        autoLoginError: message,
        ...recompute({ storedSession: null, connection: undefined }),
      });
    },
    [store, recompute],
  );

  const resolveEnhancedManifest = useCallback(async (): Promise<EnhancedManifest> => {
    const currentManifest = store.getState().manifest;
    if (currentManifest.node_id) {
      return currentManifest;
    }

    const enhancedManifest = await enhanceManifest(manifest);
    store.setState((state) => ({
      manifest: enhancedManifest,
      connection: state.connection
        ? { ...state.connection, manifest: enhancedManifest }
        : state.connection,
    }));

    return enhancedManifest;
  }, [store, manifest]);

  const loadValidatedStoredSession = useCallback(async (): Promise<StoredSession> => {
    const storage = await storageProviderRef.current();
    const loadedSession = loadStoredArkitektSession(storage);

    if (!loadedSession) {
      return null;
    }

    const parsedSession = StoredArkitektSessionSchema.safeParse(loadedSession);
    if (parsedSession.success) {
      return parsedSession.data;
    }

    // A session we can no longer read is a session we no longer have. Chiefly
    // this is the fakts protocol-2 migration: sessions written by the old
    // start/challenge/claim flow carry an `auth` block and no `client_id`, and
    // nothing can be salvaged from them. Throwing here would strand the user on
    // an error screen that survives reload, because the unreadable entries
    // would stay in storage — so drop them and fall back to a fresh connect.
    console.warn(
      "[ArkitektProvider] Discarding unreadable stored session:",
      parsedSession.error.issues,
    );
    clearStoredArkitektStorage(undefined, storage);
    return null;
  }, []);

  const validateService = useCallback(
    async (serviceKey: string) => {
      dlog("[ArkitektProvider] validateService started:", serviceKey);
      const runId = (validationRunIdsRef.current[serviceKey] || 0) + 1;
      validationRunIdsRef.current[serviceKey] = runId;

      const state = store.getState();
      const session = state.storedSession;
      const serviceState = state.serviceStates[serviceKey];
      const instance = session?.fakts.instances[serviceKey];

      if (!session || !serviceState || !instance) {
        dlog("[ArkitektProvider] validateService skipped (missing data):", serviceKey, { session: !!session, serviceState: !!serviceState, instance: !!instance });
        return;
      }

      // Mark as checking
      store.setState((current) => ({
        ...deriveRuntimeState(current, {
          serviceStateOverrides: { [serviceKey]: { status: "checking", errors: [] } },
        }),
      }));

      try {
        let alias = session.aliasMap.aliasMap[serviceKey];
        const hc = new AbortController();
        const serviceTimeout = serviceBuilderMap[serviceKey]?.timeout ?? 5000;

        if (!alias || !(await checkAliasHealth(alias, serviceTimeout, hc))) {
          dlog("[ArkitektProvider] validateService: cached alias unhealthy, re-resolving:", serviceKey);
          alias = await resolveWorkingAlias({ instance, timeout: serviceTimeout, controller: hc });
        }

        const validationResult: {
          persistedSession?: StoredArkitektSession;
          supersededService?: Service;
        } = {};

        store.setState((current) => {
          if (validationRunIdsRef.current[serviceKey] !== runId) {
            return current;
          }

          const currentSession = current.storedSession;
          const currentInstance = currentSession?.fakts.instances[serviceKey];
          if (!currentSession || !currentInstance || currentInstance !== instance) {
            return current;
          }

          const nextSession: StoredArkitektSession = {
            ...currentSession,
            aliasMap: {
              aliasMap: {
                ...currentSession.aliasMap.aliasMap,
                [serviceKey]: alias,
              },
            },
          };

          // Rebuild only the service that was validated, keeping every other
          // service (and selfService) intact. Rebuilding the whole map here meant
          // each of the N parallel validations recreated all N clients — discarding
          // (and orphaning) N-1 full sets of Apollo clients/graphql-ws sockets per
          // login. The superseded service is disposed after the state commit below.
          let nextConnection: ConnectedContext<T, S>;
          if (current.connection) {
            const newService = serviceBuilderMap[serviceKey].builder({
              manifest: current.manifest,
              alias,
              fakts: nextSession.fakts,
              getToken: (options) => refreshTokenRef.current(options),
            });
            validationResult.supersededService =
              current.connection.serviceMap[serviceKey] as Service | undefined;
            nextConnection = {
              ...current.connection,
              serviceMap: {
                ...current.connection.serviceMap,
                [serviceKey]: newService,
              } as ConnectedContext<T, S>["serviceMap"],
              aliasMap: {
                ...current.connection.aliasMap,
                [serviceKey]: alias,
              } as ConnectedContext<T, S>["aliasMap"],
            };
          } else {
            nextConnection = instantiateConnection(
              nextSession,
              current.manifest,
              serviceBuilderMap,
              selfServiceBuilder,
              () => refreshTokenRef.current(),
            );
          }

          validationResult.persistedSession = nextSession;

          return {
            storedSession: nextSession,
            connection: nextConnection,
            ...deriveRuntimeState(current, {
              storedSession: nextSession,
              connection: nextConnection,
              serviceStateOverrides: {
                [serviceKey]: {
                  alias,
                  service: nextConnection.serviceMap[serviceKey] as Service | undefined,
                  status: "ready",
                  errors: [],
                  lastCheckedAt: Date.now(),
                },
              },
            }),
          };
        });

        // Tear down the client/socket of the service we just replaced.
        validationResult.supersededService?.dispose?.();

        const nextPersistedSession = validationResult.persistedSession;
        if (!nextPersistedSession) {
          return;
        }

        const storage = await storageProviderRef.current();
        writeStoredAliasMap(nextPersistedSession.aliasMap, storage);
        writeStoredArkitektSession(nextPersistedSession, storage);

        dlog("[ArkitektProvider] validateService succeeded:", serviceKey, "alias:", alias);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to validate service";
        console.error("[ArkitektProvider] validateService failed:", serviceKey, message, error);

        let removedService: Service | undefined;

        store.setState((current) => {
          if (validationRunIdsRef.current[serviceKey] !== runId) {
            return current;
          }

          const currentInstance = current.storedSession?.fakts.instances[serviceKey];
          if (!currentInstance || currentInstance !== instance) {
            return current;
          }

          removedService = current.connection?.serviceMap[serviceKey] as Service | undefined;

          const patchedConn = current.connection
            ? {
                ...current.connection,
                serviceMap: Object.fromEntries(
                  Object.entries(current.connection.serviceMap).filter(([key]) => key !== serviceKey),
                ) as ConnectedContext<T, S>["serviceMap"],
              }
            : undefined;

          return {
            connection: patchedConn,
            ...deriveRuntimeState(current, {
              connection: patchedConn,
              serviceStateOverrides: {
                [serviceKey]: {
                  service: undefined,
                  status: "invalid",
                  errors: [message],
                  lastCheckedAt: Date.now(),
                },
              },
            }),
          };
        });

        // Tear down the client/socket of the service we dropped from the map.
        removedService?.dispose?.();
      }
    },
    [store, serviceBuilderMap, selfServiceBuilder, deriveRuntimeState],
  );

  // ── actions ──

  const connect = useCallback<AppFunctions["connect"]>(
    async ({ endpoint, controller }) => {
      dlog("[ArkitektProvider] connect called, endpoint:", endpoint);
      const prev = store.getState();
      controllerRef.current = controller;
      store.setState({ connecting: true, autoLoginError: undefined });

      try {
        const enhancedManifest = await resolveEnhancedManifest();
        const storage = await storageProviderRef.current();
        dlog("[ArkitektProvider] connect: manifest enhanced, node_id:", enhancedManifest.node_id);
        writeStoredEndpoint(endpoint, storage);

        // One grant, one response: tokens and the rendered instances together.
        const { fakts, token: grantToken } = await flow({
          endpoint,
          controller,
          manifest: enhancedManifest,
        });
        dlog("[ArkitektProvider] connect: fakts resolved, services:", Object.keys(fakts.instances || {}));
        writeStoredFakts(fakts, storage);

        const token = normalizeToken(grantToken);
        const { aliasReports, aliasMap } = await buildAliases({
          fakts,
          manifest: enhancedManifest,
          controller,
          serviceBuilderMap,
        });
        dlog("[ArkitektProvider] connect: aliases built, keys:", Object.keys(aliasMap));

        writeStoredAliasMap({ aliasMap }, storage);
        await report(endpoint.base_url, token.access_token, {
          alias_reports: aliasReports,
          functional: Object.values(aliasReports).every((r) => r.valid),
        });

        const nextSession = { endpoint, fakts, token, aliasMap: { aliasMap } };
        writeStoredToken(token, storage);
        writeStoredArkitektSession(nextSession, storage);

        dlog("[ArkitektProvider] connect: session stored, hydrating connection...");
        hydrateConnection(nextSession, enhancedManifest, {
          connecting: false,
          hasBootstrapped: true,
          autoLoginError: undefined,
        });

        dlog("[ArkitektProvider] connect: starting background health checks");
        // Background health checks
        void Promise.all(Object.keys(serviceBuilderMap).map((k) => validateService(k)));
      } catch (error) {
        console.error("[ArkitektProvider] connect failed:", error);
        if (!prev.storedSession) {
          const storage = await storageProviderRef.current();
          clearStoredArkitektStorage(undefined, storage);
        }

        store.setState({
          storedSession: prev.storedSession,
          connection: prev.connection,
          manifest: prev.manifest,
          connecting: false,
          hasBootstrapped: true,
          autoLoginError: isAbortLikeError(error)
            ? "Connection cancelled by user"
            : error instanceof Error
              ? error.message
              : "Connection failed",
          ...recompute({ storedSession: prev.storedSession, connection: prev.connection }),
        });
      } finally {
        controllerRef.current = null;
      }
    },
    [store, serviceBuilderMap, hydrateConnection, validateService, recompute, resolveEnhancedManifest],
  );

  const disconnect = useCallback<AppFunctions["disconnect"]>(async () => {
    dlog("[ArkitektProvider] disconnect called");
    controllerRef.current = null;
    const storage = await storageProviderRef.current();
    clearStoredArkitektStorage(undefined, storage);
    hydrateConnection(null, store.getState().manifest, {
      connecting: false,
      hasBootstrapped: true,
      autoLoginError: undefined,
    });
  }, [store, hydrateConnection]);

  const reconnect = useCallback<AppFunctions["reconnect"]>(async () => {
    dlog("[ArkitektProvider] reconnect called");
    const storage = await storageProviderRef.current();
    const endpoint = store.getState().storedSession?.endpoint || loadStoredEndpoint(storage);
    if (!endpoint) {
      console.error("[ArkitektProvider] reconnect failed: no endpoint found");
      throw new Error("No endpoint found in local storage");
    }
    await connect({ endpoint, controller: new AbortController() });
  }, [store, connect]);

  const cancelConnection = useCallback<AppFunctions["cancelConnection"]>(() => {
    dlog("[ArkitektProvider] cancelConnection called");
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    store.setState({ connecting: false, autoLoginError: "Connection cancelled by user" });
  }, [store]);

  const retryService = useCallback<AppFunctions["retryService"]>(
    async (serviceKey) => {
      await validateService(serviceKey);
    },
    [validateService],
  );

  const retryModule = useCallback<AppFunctions["retryModule"]>(
    async (moduleKey) => {
      const def = resolvedModuleRegistry[moduleKey];
      if (!def) return;
      // Single requirement per module
      const primaryKey = def.requirement.serviceKey;
      if (primaryKey) await validateService(primaryKey);
    },
    [resolvedModuleRegistry, validateService],
  );

  const clearServiceCache = useCallback<AppFunctions["clearServiceCache"]>(
    async (serviceKey) => {
      const svc = store.getState().connection?.serviceMap[serviceKey] as Service | undefined;
      if (svc?.clearCache) await svc.clearCache();
    },
    [store],
  );

  const clearAllServiceCaches = useCallback<AppFunctions["clearAllServiceCaches"]>(async () => {
    const services = Object.values(store.getState().connection?.serviceMap || {}) as Service[];
    for (const svc of services) {
      if (svc.clearCache) await svc.clearCache();
    }
  }, [store]);

  // Re-probe the currently-connected services and report the resulting
  // fakts-status back to the coordination server (same path as connect()).
  const reportStatus = useCallback<AppFunctions["reportStatus"]>(async () => {
    const conn = store.getState().connection;
    if (!conn) return null;

    const { aliasReports } = await buildAliases({
      fakts: conn.fakts,
      manifest: conn.manifest,
      controller: new AbortController(),
      serviceBuilderMap,
    });

    const functional = Object.values(aliasReports).every((r) => r.valid);
    // Report with a live token: this runs long after connect, so the one on
    // the connection may already have aged out.
    const { access_token } = await refreshTokenRef.current();
    const ok = await report(conn.endpoint.base_url, access_token, {
      alias_reports: aliasReports,
      functional,
    });

    return { ok, functional, alias_reports: aliasReports };
  }, [store, serviceBuilderMap]);

  const actions = useMemo<AppFunctions>(
    () => ({
      connect,
      disconnect,
      reconnect,
      cancelConnection,
      retryService,
      retryModule,
      clearServiceCache,
      clearAllServiceCaches,
      reportStatus,
    }),
    [connect, disconnect, reconnect, cancelConnection, retryService, retryModule, clearServiceCache, clearAllServiceCaches, reportStatus],
  );

  // ── ONE useEffect: detect cached fakts, hydrate, then run health checks ──
  useEffect(() => {
    const run = async () => {
      try {
        const [enhancedManifest, session] = await Promise.all([
          resolveEnhancedManifest(),
          loadValidatedStoredSession(),
        ]);

        dlog("[ArkitektProvider]: Bootstrapping ArkitektProvider with session:", session);

        if (!session) {
          dlog("[ArkitektProvider] Bootstrap: no cached session, marking bootstrapped");
          setBootstrapped();
          return;
        }

        stageStoredSession(session, {
          manifest: enhancedManifest,
          autoLoginError: undefined,
        });

        dlog("[ArkitektProvider] Bootstrap: refreshing token...");
        await refreshTokenRef.current();
        dlog("[ArkitektProvider] Bootstrap: token refresh complete");

        const refreshedSession = store.getState().storedSession;
        if (!refreshedSession) {
          throw new Error("Stored session missing after refresh");
        }

        hydrateConnection(refreshedSession, enhancedManifest, {
          connecting: false,
          hasBootstrapped: true,
          autoLoginError: undefined,
        });
        dlog("[ArkitektProvider] Hydrated connection from stored session:", store.getState().connection);

        dlog("[ArkitektProvider] Bootstrap: starting background health checks");
        void Promise.all(Object.keys(serviceBuilderMap).map((k) => validateService(k)));
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : "Auto-login failed";

        console.error("[ArkitektProvider] Bootstrap error:", error);
        setBootstrapError(message);
      }
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // runs once on mount

  // Ctrl/Cmd+X to clear caches
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (e.key === "x" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        await clearAllServiceCaches();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [clearAllServiceCaches]);

  const contextValue = useMemo(() => ({ store, actions }), [store, actions]);

  return <ArkitektContext.Provider value={contextValue}>{children}</ArkitektContext.Provider>;
};

// ── Guards ──

export type ConnectedGuardProps = {
  notConnectedFallback?: React.ReactNode;
  connectingFallback?: React.ReactNode;
};

export const ConnectedGuard = ({
  notConnectedFallback = "Not Connected",
  connectingFallback = "Loading...",
  children,
}: ConnectedGuardProps & { children: ReactNode }) => {
  // Narrow, shallow-compared selection: this guard wraps every module route,
  // so subscribing to the whole store rerendered them on every store tick.
  const { hasSelfService, connecting, hasStoredSession, hasBootstrapped } =
    useConnectionStatus();

  if (!hasStoredSession) return <>{notConnectedFallback}</>;

  if (!hasSelfService) {
    if (connecting || (!hasBootstrapped && hasStoredSession)) return <>{connectingFallback}</>;
    return <>{notConnectedFallback}</>;
  }

  return <>{children}</>;
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
  useAvailableModules,
  useAvailableServices,
  useConfigurationIssues,
  useConnection,
  usePotentialService,
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
