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
} from "./fakts/sessionStorageSchema";
import {
  adoptPersistedBook,
  emptyProfileBook,
  createProfileFromSession,
  getActiveProfile,
  loadStoredProfileBook,
  markProfileOk,
  markProfileStale,
  reidentifyProfile,
  removeProfile as removeProfileFromBook,
  setActiveProfile,
  setLastEndpoint,
  updateProfileLabel,
  updateProfileSession,
  upsertProfile,
  writeStoredProfileBook,
  deriveProfileId,
  PROFILE_BOOK_STORAGE_KEY,
  type StoredProfileBook,
} from "./fakts/profileStorageSchema";
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
  useModuleState,
  usePotentialService,
  useReadyModuleKeys,
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
  RefreshTokenError,
  shouldRefreshToken,
} from "./runtime/auth";
import { disposeConnection, instantiateConnection, type ServiceMap } from "./runtime/connection";
import {
  describeRefreshFailure,
  refreshSession,
} from "./runtime/profileAuth";
import { rotateProfileSession } from "./runtime/sharedRefresh";
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
      profileBook: emptyProfileBook(),
      switchingProfileId: null,
    });
  });

  /**
   * The single writer of the profile book.
   *
   * Takes an updater rather than a value so concurrent writers compose off the
   * latest book instead of clobbering each other — a token refresh and a
   * `validateService` alias update routinely land within milliseconds. Note it
   * deliberately does NOT touch `storedSession`: that stays owned by
   * `hydrateConnection` (and the rotation), so the session and the live
   * connection are only ever swapped together.
   */
  const persistBook = useCallback(
    async (
      update: (book: StoredProfileBook) => StoredProfileBook,
    ): Promise<StoredProfileBook> => {
      const storage = await storageProviderRef.current();
      // Compose off what is PERSISTED, not off this window's copy. Popouts
      // share the book, and another window may have rotated a token for a
      // profile that is parked here; writing our stale copy over it would
      // hand that profile a spent refresh token on its next launch. Which
      // profile is active stays a per-window notion.
      const base = adoptPersistedBook(loadStoredProfileBook(storage), store.getState().profileBook);
      const next = update(base);
      store.setState({ profileBook: next });
      writeStoredProfileBook(next, storage);
      return next;
    },
    [store],
  );

  /** The session for a profile as it is persisted right now. */
  const readPersistedSession = useCallback(
    async (profileId: string): Promise<StoredArkitektSession | null> => {
      const storage = await storageProviderRef.current();
      return loadStoredProfileBook(storage).profiles[profileId]?.session ?? null;
    },
    [],
  );

  /**
   * Put a rotated session under the live connection — but only if that
   * profile is still the live one; otherwise it belongs to a parked profile
   * now and has already been written to that profile's slot.
   */
  const adoptLiveSession = useCallback(
    (profileId: string, nextSession: StoredArkitektSession) => {
      if (store.getState().profileBook.activeProfileId !== profileId) return;
      const connection = store.getState().connection;
      store.setState({
        storedSession: nextSession,
        connection: connection
          ? {
              ...connection,
              token: nextSession.token,
              fakts: nextSession.fakts,
              serviceInstanceMap: nextSession.fakts.instances,
            }
          : connection,
      });
    },
    [store],
  );

  // Wire up the locked refreshToken now that store exists
  if (!refreshInitialized.current) {
    refreshInitialized.current = true;
    dlog("[ArkitektProvider] Initializing refreshToken function");

    // The coalescing + forced-vs-raced rule lives in TokenRotation
    // (runtime/tokenRotation.ts); this callback is just the round-trip.
    const rotation = new TokenRotation(async () => {
      const { storedSession: session, activeProfileId } = (() => {
        const state = store.getState();
        return {
          storedSession: state.storedSession,
          // Captured HERE, not read back after the round-trip: a switchProfile
          // can land while this refresh is in flight, and the rotated token
          // belongs to the profile it was minted for, not to whichever profile
          // happens to be active when the response arrives.
          activeProfileId: state.profileBook.activeProfileId,
        };
      })();

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
        // Under the cross-window lock: another window may have rotated this
        // very token, in which case its rotation is adopted instead of ours
        // being replayed (which would revoke the whole chain server-side).
        const held = { ...session, token: currentToken };
        const lockId = activeProfileId ?? session.endpoint.base_url;
        const { session: nextSession, refreshed } = await rotateProfileSession({
          profileId: lockId,
          held,
          readPersisted: () =>
            activeProfileId ? readPersistedSession(activeProfileId) : Promise.resolve(null),
          refresh: (s) => refreshSession(s, controllerRef.current || undefined),
          persist: async (s) => {
            if (!activeProfileId) return;
            // `updateProfileSession` drops the write if the profile is gone —
            // the user can remove a profile while its refresh is in flight.
            await persistBook((book) => updateProfileSession(book, activeProfileId, s));
          },
        });

        dlog(
          refreshed
            ? "[ArkitektProvider] Token refresh succeeded"
            : "[ArkitektProvider] Adopted a token rotated by another window",
        );

        if (activeProfileId) {
          adoptLiveSession(activeProfileId, nextSession);
        } else {
          store.setState({ storedSession: nextSession });
        }

        return nextSession.token;
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
      /**
       * Drop the previous run's per-service health instead of carrying it
       * forward. `buildServiceStates` inherits `status`, `errors` and
       * `lastCheckedAt` from the states it is handed, which is right for a
       * re-check of the SAME session and wrong across a profile switch: a
       * perfectly healthy organization would otherwise inherit the previous
       * one's "invalid" badges and its stale error strings.
       */
      resetServiceStates?: boolean;
    } = {},
    ) => {
      const session = overrides.storedSession !== undefined ? overrides.storedSession : current.storedSession;
      const connection = overrides.connection !== undefined ? overrides.connection : current.connection;

      const serviceStates = buildServiceStates(
        serviceBuilderMap,
        session,
        connection?.serviceMap as ServiceMap | undefined,
        overrides.resetServiceStates ? undefined : current.serviceStates,
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
      resetServiceStates?: boolean;
    } = {}) => deriveRuntimeState(store.getState(), overrides),
    [store, deriveRuntimeState],
  );

  const hydrateConnection = useCallback(
    (
      session: StoredSession,
      manifestOverride?: EnhancedManifest,
      extras: Partial<AppContext<T, S>> = {},
      { resetServiceStates = false }: { resetServiceStates?: boolean } = {},
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
        ...recompute({ storedSession: session, connection, resetServiceStates }),
        ...extras,
      });
    },
    [store, serviceBuilderMap, selfServiceBuilder, recompute],
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
      // `profileBook` is deliberately untouched: failing to bring ONE profile up
      // is not a reason to forget the user's other logins, and the switcher
      // renders from the book alone, so they stay one click away.
      store.setState({
        storedSession: null,
        connection: undefined,
        connecting: false,
        hasBootstrapped: true,
        switchingProfileId: null,
        autoLoginError: message,
        ...recompute({ storedSession: null, connection: undefined, resetServiceStates: true }),
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

  const validateService = useCallback(
    async (serviceKey: string) => {
      dlog("[ArkitektProvider] validateService started:", serviceKey);
      const runId = (validationRunIdsRef.current[serviceKey] || 0) + 1;
      validationRunIdsRef.current[serviceKey] = runId;

      const state = store.getState();
      const session = state.storedSession;
      // Captured up front, like the token rotation: a switchProfile can land
      // mid-validation, and a resolved alias belongs to the profile whose
      // instance it was probed against.
      const profileId = state.profileBook.activeProfileId;
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
          if (current.profileBook.activeProfileId !== profileId) {
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

        if (profileId) {
          // Patch the alias map onto whatever is PERSISTED rather than writing
          // our in-memory session over it: only the rotation paths may write a
          // token, or an alias fix landing after another window's refresh
          // would put the spent token back.
          await persistBook((book) => {
            const persisted = book.profiles[profileId]?.session;
            if (!persisted) return book;
            return updateProfileSession(book, profileId, {
              ...persisted,
              aliasMap: nextPersistedSession.aliasMap,
            });
          });
        }

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
          if (current.profileBook.activeProfileId !== profileId) {
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
    [store, serviceBuilderMap, selfServiceBuilder, deriveRuntimeState, persistBook],
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
        dlog("[ArkitektProvider] connect: manifest enhanced, node_id:", enhancedManifest.node_id);
        // Recorded before the grant so a half-finished connect still leaves
        // `reconnect()` somewhere to point.
        await persistBook((book) => setLastEndpoint(book, endpoint));

        // One grant, one response: tokens and the rendered instances together.
        const { fakts, token: grantToken } = await flow({
          endpoint,
          controller,
          manifest: enhancedManifest,
        });
        dlog("[ArkitektProvider] connect: fakts resolved, services:", Object.keys(fakts.instances || {}));

        const token = normalizeToken(grantToken);
        const { aliasReports, aliasMap } = await buildAliases({
          fakts,
          manifest: enhancedManifest,
          controller,
          serviceBuilderMap,
        });
        dlog("[ArkitektProvider] connect: aliases built, keys:", Object.keys(aliasMap));

        await report(endpoint.base_url, token.access_token, {
          alias_reports: aliasReports,
          functional: Object.values(aliasReports).every((r) => r.valid),
        });

        const nextSession = { endpoint, fakts, token, aliasMap: { aliasMap } };

        // The grant cannot know which user or organization it just produced —
        // that comes from lok's `mycontext` — so the profile starts on a
        // provisional id and `setProfileIdentity` re-keys it (collapsing any
        // duplicate) once lok answers.
        const profile = createProfileFromSession(nextSession);
        await persistBook((book) =>
          setActiveProfile(upsertProfile(book, profile), profile.id),
        );

        dlog("[ArkitektProvider] connect: session stored, hydrating connection...");
        hydrateConnection(
          nextSession,
          enhancedManifest,
          {
            connecting: false,
            hasBootstrapped: true,
            switchingProfileId: null,
            autoLoginError: undefined,
          },
          // A fresh grant is a different login: nothing the previous one learned
          // about service health applies to it.
          { resetServiceStates: true },
        );

        dlog("[ArkitektProvider] connect: starting background health checks");
        // Background health checks
        void Promise.all(Object.keys(serviceBuilderMap).map((k) => validateService(k)));
      } catch (error) {
        console.error("[ArkitektProvider] connect failed:", error);
        // Nothing to clean up: the grant only writes a profile once it has
        // succeeded, and every other profile is none of this failure's business.
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
    [store, serviceBuilderMap, hydrateConnection, validateService, recompute, resolveEnhancedManifest, persistBook],
  );

  /**
   * Sign out of the CURRENT profile, keeping it in the book.
   *
   * This used to wipe the credentials outright. Now that the app can hold
   * several logins, "sign out" means "stop acting as this one" — the profile
   * stays one click away in the switcher, and `forgetAllProfiles` is the
   * destructive door, worded as such.
   */
  const disconnect = useCallback<AppFunctions["disconnect"]>(async () => {
    dlog("[ArkitektProvider] disconnect called (parking active profile)");
    controllerRef.current = null;
    await persistBook((book) => setActiveProfile(book, null));
    hydrateConnection(
      null,
      store.getState().manifest,
      {
        connecting: false,
        hasBootstrapped: true,
        switchingProfileId: null,
        autoLoginError: undefined,
      },
      { resetServiceStates: true },
    );
  }, [store, hydrateConnection, persistBook]);

  const reconnect = useCallback<AppFunctions["reconnect"]>(async () => {
    dlog("[ArkitektProvider] reconnect called");
    const state = store.getState();
    const endpoint = state.storedSession?.endpoint || state.profileBook.lastEndpoint;
    if (!endpoint) {
      console.error("[ArkitektProvider] reconnect failed: no endpoint found");
      throw new Error("No endpoint found in local storage");
    }
    await connect({ endpoint, controller: new AbortController() });
  }, [store, connect]);

  /**
   * Make an already-approved profile the live one.
   *
   * The ordering here is load-bearing, in two places:
   *
   *  1. The parked credential is PROVEN before anything is torn down. A parked
   *     refresh token can have expired, been revoked, or already been rotated
   *     away, and the deployment can simply be unreachable — tearing the live
   *     connection down first would leave the user with a dead app and a browser
   *     round-trip to get back. So the current profile keeps running (only the
   *     switcher row spins) until the new token is in hand.
   *  2. The rotated refresh token is PERSISTED before the connection is swapped.
   *     Refresh tokens rotate on every use, so if the hydrate threw after a
   *     successful refresh and we had not written, the parked profile would have
   *     just lost its only refresh token and be permanently dead.
   */
  const switchProfile = useCallback<AppFunctions["switchProfile"]>(
    async (profileId) => {
      const state = store.getState();

      if (state.switchingProfileId) {
        dlog("[ArkitektProvider] switchProfile ignored, a switch is already running");
        return;
      }
      if (state.profileBook.activeProfileId === profileId && state.connection) {
        return;
      }

      const profile = state.profileBook.profiles[profileId];
      if (!profile) {
        throw new Error(`Unknown profile ${profileId}`);
      }

      dlog("[ArkitektProvider] switchProfile:", profileId);
      store.setState({ switchingProfileId: profileId, autoLoginError: undefined });

      try {
        const manifest = await resolveEnhancedManifest();
        // (2) — the rotation is persisted (inside `rotateProfileSession`,
        // under the cross-window lock) before the swap can throw.
        const { session: nextSession } = await rotateProfileSession({
          profileId,
          held: profile.session,
          readPersisted: () => readPersistedSession(profileId),
          refresh: (s) => refreshSession(s),
          persist: async (s) => {
            await persistBook((book) =>
              setActiveProfile(
                updateProfileSession(markProfileOk(book, profileId), profileId, s),
                profileId,
              ),
            );
          },
        });

        // The profile may have been removed while its refresh was in flight.
        if (!store.getState().profileBook.profiles[profileId]) {
          store.setState({ switchingProfileId: null });
          return;
        }

        hydrateConnection(
          nextSession,
          manifest,
          {
            connecting: false,
            hasBootstrapped: true,
            switchingProfileId: null,
            autoLoginError: undefined,
          },
          { resetServiceStates: true },
        );

        void Promise.all(Object.keys(serviceBuilderMap).map((k) => validateService(k)));
      } catch (error) {
        const { kind, message } = describeRefreshFailure(error, profile);
        console.error("[ArkitektProvider] switchProfile failed:", kind, error);

        // Only an answer from the token endpoint marks a profile stale. A
        // network blip says nothing about the credential, and marking on one
        // would greet a user coming back from a tunnel with a list of
        // organizations all claiming to be signed out.
        if (kind === "expired") {
          await persistBook((book) => markProfileStale(book, profileId, message));
        }

        store.setState({ switchingProfileId: null, autoLoginError: message });
        throw error;
      }
    },
    [
      store,
      persistBook,
      hydrateConnection,
      validateService,
      serviceBuilderMap,
      resolveEnhancedManifest,
    ],
  );

  const removeProfile = useCallback<AppFunctions["removeProfile"]>(
    async (profileId) => {
      dlog("[ArkitektProvider] removeProfile:", profileId);
      const wasActive = store.getState().profileBook.activeProfileId === profileId;

      // Local only: the fakts discovery document has no `revocation_endpoint`,
      // so the refresh token stays valid server-side until it expires.
      const book = await persistBook((current) => removeProfileFromBook(current, profileId));

      if (wasActive) {
        hydrateConnection(
          null,
          store.getState().manifest,
          {
            connecting: false,
            hasBootstrapped: true,
            switchingProfileId: null,
            autoLoginError: undefined,
          },
          { resetServiceStates: true },
        );
      }

      return void book;
    },
    [store, persistBook, hydrateConnection],
  );

  const forgetAllProfiles = useCallback<AppFunctions["forgetAllProfiles"]>(async () => {
    dlog("[ArkitektProvider] forgetAllProfiles called");
    controllerRef.current = null;
    const storage = await storageProviderRef.current();
    // Keep the last endpoint: forgetting the logins should not also forget
    // which deployment this machine talks to.
    const lastEndpoint = store.getState().profileBook.lastEndpoint;
    await persistBook(() => setLastEndpoint(emptyProfileBook(), lastEndpoint));
    clearStoredArkitektStorage(undefined, storage);
    hydrateConnection(
      null,
      store.getState().manifest,
      {
        connecting: false,
        hasBootstrapped: true,
        switchingProfileId: null,
        autoLoginError: undefined,
      },
      { resetServiceStates: true },
    );
  }, [store, persistBook, hydrateConnection]);

  /**
   * Attach lok's answer to a profile.
   *
   * Generic on purpose: `lib/arkitekt` is a deployment-agnostic fakts client and
   * must not import lok's generated GraphQL, so the caller
   * (`ProfileIdentitySync`) lives in the app layer and hands the identity down.
   * When the derived id differs from the current one — the normal case, since a
   * grant starts provisional — the entry is re-keyed, which is also what
   * collapses a re-approved organization onto the row it already had.
   */
  const setProfileIdentity = useCallback<AppFunctions["setProfileIdentity"]>(
    (profileId, patch) => {
      void persistBook((book) => {
        const profile = book.profiles[profileId];
        if (!profile) {
          return book;
        }

        const identity = patch.identity ?? profile.identity;
        const nextId = deriveProfileId(identity);

        if (nextId !== profileId) {
          return reidentifyProfile(book, profileId, identity, patch.label);
        }

        return patch.label ? updateProfileLabel(book, profileId, patch.label) : book;
      });
    },
    [persistBook],
  );

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
      switchProfile,
      removeProfile,
      forgetAllProfiles,
      setProfileIdentity,
    }),
    [connect, disconnect, reconnect, cancelConnection, retryService, retryModule, clearServiceCache, clearAllServiceCaches, reportStatus, switchProfile, removeProfile, forgetAllProfiles, setProfileIdentity],
  );

  // ── ONE useEffect: load the profile book, activate the live one, health-check ──
  useEffect(() => {
    const run = async () => {
      try {
        const storage = await storageProviderRef.current();
        // Handles the migration off the four flat keys, and validates profiles
        // one at a time so a single corrupt entry cannot sign the user out of
        // the rest. Never throws.
        const book = loadStoredProfileBook(storage);
        store.setState({ profileBook: book });

        const enhancedManifest = await resolveEnhancedManifest();
        const active = getActiveProfile(book);

        dlog("[ArkitektProvider]: Bootstrapping with profile:", active?.id ?? "none");

        if (!active) {
          dlog("[ArkitektProvider] Bootstrap: nothing active, marking bootstrapped");
          setBootstrapped({ manifest: enhancedManifest });
          return;
        }

        // The same path a switch takes — prove the credential, persist the
        // rotation, then hydrate — so there is one implementation of "bring a
        // profile up" rather than two that drift. A popout starting next to
        // the main window adopts the main window's rotation here rather than
        // spending the same refresh token a second time.
        const { session: nextSession } = await rotateProfileSession({
          profileId: active.id,
          held: active.session,
          readPersisted: () => readPersistedSession(active.id),
          refresh: (s) => refreshSession(s),
          persist: async (s) => {
            await persistBook((current) =>
              updateProfileSession(markProfileOk(current, active.id), active.id, s),
            );
          },
        });

        hydrateConnection(
          nextSession,
          enhancedManifest,
          {
            connecting: false,
            hasBootstrapped: true,
            switchingProfileId: null,
            autoLoginError: undefined,
          },
          { resetServiceStates: true },
        );
        dlog("[ArkitektProvider] Hydrated connection from stored profile");

        dlog("[ArkitektProvider] Bootstrap: starting background health checks");
        void Promise.all(Object.keys(serviceBuilderMap).map((k) => validateService(k)));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Auto-login failed";

        console.error(
          "[ArkitektProvider] Bootstrap error:",
          error,
          // The OAuth2 `error` member is what tells a dead refresh chain
          // (`invalid_grant`) apart from a misconfigured client.
          error instanceof RefreshTokenError ? { status: error.status, code: error.code } : "",
        );

        // Mark the profile stale only if the server actually refused its
        // credential, so an offline start does not present every login as
        // signed out. `setBootstrapError` leaves the book itself alone.
        const activeId = store.getState().profileBook.activeProfileId;
        const activeProfile = activeId
          ? store.getState().profileBook.profiles[activeId]
          : null;
        if (activeProfile) {
          const { kind, message: described } = describeRefreshFailure(error, activeProfile);
          if (kind === "expired") {
            await persistBook((book) => markProfileStale(book, activeProfile.id, described));
          }
        }

        setBootstrapError(message);
      }
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // runs once on mount

  // ── Follow the book as OTHER windows write it ──
  // `storage` fires only in windows that did not do the write. When a popout
  // rotates the token of the profile live here, our in-memory copy becomes a
  // spent credential; adopt theirs so nothing here ever replays it.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== PROFILE_BOOK_STORAGE_KEY) return;
      void (async () => {
        const storage = await storageProviderRef.current();
        const persisted = loadStoredProfileBook(storage);
        const merged = adoptPersistedBook(persisted, store.getState().profileBook);
        store.setState({ profileBook: merged });

        const activeId = merged.activeProfileId;
        const live = store.getState().storedSession;
        const theirs = activeId ? merged.profiles[activeId]?.session : undefined;
        if (
          activeId &&
          live &&
          theirs &&
          theirs.token.refresh_token &&
          theirs.token.refresh_token !== live.token.refresh_token
        ) {
          dlog("[ArkitektProvider] Adopting a session rotated by another window");
          adoptLiveSession(activeId, { ...live, token: theirs.token, fakts: theirs.fakts });
        }
      })();
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [store, adoptLiveSession]);

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
