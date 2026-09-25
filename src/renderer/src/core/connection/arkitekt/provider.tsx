import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { sameAlias } from "./alias/helpers";
import type { Alias } from "./fakts/faktsSchema";
import { resolveServiceAlias } from "./alias/serviceAlias";
import { isMeshRouted, NO_MESH_GATE, watchMesh, type MeshGate } from "@/core/connection/mesh/meshGate";
import { ArkitektContext } from "./context";
import { useConnectionStatus } from "./hooks";
import { claimProfileMesh, hintedProfileMesh, joinAndPark, meshForIdentity, meshFromGrant } from "@/core/connection/mesh/profileMesh";
import { meshNeeded } from "@/core/connection/mesh/meshNeed";
import { flow } from "./fakts/flow";
import { grantHintForProfile } from "./fakts/grantHint";
import { Manifest } from "./fakts/manifestSchema";
import type { StoredArkitektSession } from "./session/record";
import {
  admitGrantedProfile,
  adoptPersistedBook,
  emptyProfileBook,
  getActiveProfile,
  loadStoredProfileBook,
  markProfileOk,
  markProfileStale,
  findProfileIdByChain,
  reidentifyProfile,
  removeProfile as removeProfileFromBook,
  setActiveProfile,
  setLastEndpoint,
  updateProfileLabel,
  updateProfileMesh,
  updateProfileSession,
  writeStoredProfileBook,
  deriveProfileId,
  PROFILE_BOOK_STORAGE_KEY,
  type ProfileMesh,
  type StoredProfile,
  type StoredProfileBook,
} from "./fakts/profileStorageSchema";
import { BOOTING, GRANTING, SETTLED, switching } from "./session/state";
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
  aliasReportsFrom,
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

/**
 * The profile book, BEFORE the first paint.
 *
 * Everything else here is async — the storage seam, the manifest's IPC
 * round-trip, the token refresh — so without this the first render cannot know
 * whether this computer holds a login, and `AppShell` has no choice but to
 * paint the welcome screen (in its first-run variant, no less) for a frame on
 * every launch, including launches that auto-log straight in.
 *
 * `loadStoredProfileBook` is fully synchronous and never throws, so the only
 * question is WHICH storage. Only the default one can be read here:
 *
 * - A caller that supplied `storageProvider` may not be on `localStorage` at
 *   all, and reading it would bypass the seam its tests depend on.
 * - The load is not a pure read — it drops an unreadable book, which WRITES.
 *   Guessing wrong would mutate a store this provider was never handed.
 *
 * The seed is a snapshot, not the truth: the bootstrap effect composes it with
 * what is actually persisted a microtask later (`adoptPersistedBook`), which is
 * what corrects a profile another window removed in the meantime.
 */
const seedProfileBook = (storageProvider?: StorageProvider): StoredProfileBook => {
  if (storageProvider) return emptyProfileBook();
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return emptyProfileBook();
  }
  try {
    return loadStoredProfileBook(localStorage);
  } catch {
    // Blocked site data, a locked profile directory: signed out is the safe read.
    return emptyProfileBook();
  }
};

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
  storageProvider,
}: ArkitektProviderProps<T, S>) => {
  const resolvedModuleRegistry = useMemo(
    () => moduleRegistry || createModuleRegistryFromServices(serviceBuilderMap),
    [moduleRegistry, serviceBuilderMap],
  );
  // Kept undefined-able on the prop so `seedProfileBook` can tell "the caller
  // supplied a seam" from "we are on plain localStorage"; every async read goes
  // on using the resolved one exactly as before.
  const storageProviderRef = useRef<StorageProvider>(
    storageProvider ?? (async () => localStorage),
  );
  storageProviderRef.current = storageProvider ?? (async () => localStorage);

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
      activity: BOOTING,
      configurationIssues: buildConfigurationIssues(serviceBuilderMap, resolvedModuleRegistry, null),
      serviceStates: buildServiceStates(serviceBuilderMap, null),
      moduleStates: buildModuleStates(
        resolvedModuleRegistry,
        buildServiceStates(serviceBuilderMap, null),
      ),
      storedSession: null,
      // Synchronous, so the very first render already knows whether this window
      // is about to auto-log in — see `seedProfileBook`.
      profileBook: seedProfileBook(storageProvider),
      sessionOnlyProfileId: null,
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
      const persisted = loadStoredProfileBook(storage);
      const base = adoptPersistedBook(persisted, store.getState().profileBook);
      const next = update(base);
      // An update that changed nothing must not hand every book subscriber a
      // new object to re-render for.
      if (JSON.stringify(next) !== JSON.stringify(store.getState().profileBook)) {
        store.setState({ profileBook: next });
      }

      // "Stay signed in" unticked: the profile is live in memory but must not
      // be written back as the active one, or the next launch would auto-log
      // into it anyway. Everything else in the book — above all the rotated
      // refresh token — is written as usual, and whatever was persisted as
      // active (another window's choice, or nothing) is left alone.
      const { sessionOnlyProfileId } = store.getState();
      const toWrite =
        sessionOnlyProfileId && next.activeProfileId === sessionOnlyProfileId
          ? { ...next, activeProfileId: persisted.activeProfileId }
          : next;

      writeStoredProfileBook(toWrite, storage);
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
   * Put a rotated session under the live connection — but only if its chain
   * is still the live one; otherwise it belongs to a parked profile now and
   * has already been written to that profile's slot. Matched by chain
   * (`client_id`), not profile id, because a re-key can rename the live
   * profile while its refresh is in flight.
   */
  const adoptLiveSession = useCallback(
    (clientId: string | undefined, nextSession: StoredArkitektSession) => {
      const live = store.getState().storedSession;
      if (!live || live.token.client_id !== clientId) return;
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

      // The profile is found by its CHAIN at each step, inside the lock — not
      // captured up front. A switch can land while this refresh is in flight
      // (the rotated token belongs to the profile it was minted for, not to
      // whichever is active when it arrives), and a re-key can rename the
      // profile outright; the chain is the one thing neither changes.
      const chain = currentToken.client_id;
      const ownerId = (book: StoredProfileBook) =>
        findProfileIdByChain(book, chain) ??
        (chain ? undefined : book.activeProfileId ?? undefined);

      // Every refresh response re-renders the fakts envelope, so this is
      // also how instance/alias changes reach us without re-approval.
      // Under the cross-window lock: another window may have rotated this
      // very token, in which case its rotation is adopted instead of ours
      // being replayed (which would revoke the whole chain server-side).
      const held = { ...session, token: currentToken };
      const { session: nextSession, refreshed } = await rotateProfileSession({
        profileId: session.endpoint.base_url,
        held,
        readPersisted: async () => {
          const storage = await storageProviderRef.current();
          const book = loadStoredProfileBook(storage);
          const id = ownerId(book);
          return id ? (book.profiles[id]?.session ?? null) : null;
        },
        // Not the login's controller: cancelling a grant must not abort a
        // refresh of the session that is live meanwhile.
        refresh: (s) => refreshSession(s),
        persist: async (s) => {
          // `updateProfileSession` drops the write if the profile is gone —
          // the user can remove a profile while its refresh is in flight.
          await persistBook((book) => {
            const id = ownerId(book);
            return id ? updateProfileSession(book, id, s) : book;
          });
        },
      });

      dlog(
        refreshed
          ? "[ArkitektProvider] Token refresh succeeded"
          : "[ArkitektProvider] Adopted a token rotated by another window",
      );

      if (chain) adoptLiveSession(chain, nextSession);
      else store.setState({ storedSession: nextSession });

      return nextSession.token;
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
        ? instantiateConnection(session, activeManifest, serviceBuilderMap, selfServiceBuilder, (options) => refreshTokenRef.current(options))
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
        activity: SETTLED,
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
        activity: SETTLED,
        autoLoginError: message,
        ...recompute({ storedSession: null, connection: undefined, resetServiceStates: true }),
      });
    },
    [store, recompute],
  );

  /**
   * Bring-ups are numbered. A newer one (a switch, a grant, a launch) or a
   * cancel makes an older one's result stale, and a stale result is dropped
   * instead of hydrated — which is what makes a slow switch cancellable and
   * keeps two racing switches from both landing.
   */
  const bringUpGenerationRef = useRef(0);
  const nextBringUp = () => ++bringUpGenerationRef.current;
  const isCurrentBringUp = (generation: number) => bringUpGenerationRef.current === generation;

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

  /**
   * A stored profile's credential, proved and carried forward — the one way a
   * launch and a switch get a usable session. Under the cross-window lock; a
   * token that is still fresh is used as it is (nothing is sent), another
   * window's rotation is adopted rather than replayed, and the outcome is
   * persisted through `persist` BEFORE anything is swapped. The manifest's
   * IPC round trip runs alongside; nothing in the rotation needs it.
   */
  const reviveStoredProfile = useCallback(
    async (
      profile: StoredProfile,
      persist: (book: StoredProfileBook, session: StoredArkitektSession) => StoredProfileBook,
    ): Promise<{ manifest: EnhancedManifest; session: StoredArkitektSession }> => {
      const [manifest, { session }] = await Promise.all([
        resolveEnhancedManifest(),
        rotateProfileSession({
          profileId: profile.id,
          held: profile.session,
          readPersisted: () => readPersistedSession(profile.id),
          refresh: (s) => refreshSession(s),
          persist: async (s) => {
            await persistBook((book) => persist(book, s));
          },
          reuseFresh: true,
        }),
      ]);
      return { manifest, session };
    },
    [resolveEnhancedManifest, readPersistedSession, persistBook],
  );

  /**
   * The gate for the active profile's mesh — one per mesh, made on first use
   * so the very first check of a launch already waits on it, and replaced
   * when the profile (or its mesh switch) changes. When the node comes (back)
   * up, it caches the mesh's MagicDNS suffix on the profile and re-checks
   * every service that failed meanwhile.
   */
  const meshGateRef = useRef<MeshGate>(NO_MESH_GATE);
  const validateServicesRef = useRef<(keys: string[]) => Promise<void>>(async () => {});
  const meshGateFor = useCallback(
    (mesh: ProfileMesh | undefined): MeshGate => {
      const wanted = mesh?.enabled ? mesh : undefined;
      const current = meshGateRef.current;
      if (current.meshId === (wanted?.id ?? null)) return current;
      current.dispose();

      const gate = watchMesh(wanted);
      if (wanted) {
        gate.onRunning((status) => {
          const suffix = status.magicDnsSuffix;
          if (suffix && suffix !== wanted.magicDnsSuffix) {
            void persistBook((book) => {
              const owner = Object.values(book.profiles).find((profile) => profile.mesh?.id === wanted.id);
              return owner
                ? updateProfileMesh(book, owner.id, (m) => (m ? { ...m, magicDnsSuffix: suffix } : m))
                : book;
            });
          }
          const failed = Object.values(store.getState().serviceStates)
            .filter((service) => service.status === "invalid" && service.instance)
            .map((service) => service.key);
          if (failed.length > 0) void validateServicesRef.current(failed);
        });
      }
      meshGateRef.current = gate;
      return gate;
    },
    [store, persistBook],
  );
  useEffect(() => () => meshGateRef.current.dispose(), []);

  /**
   * Check one service's alias and bring its runtime state in line. Resolves
   * to the alias change the book still needs, if any — the caller persists
   * all of them at once (`validateServices`), so a login is one alias write,
   * not one per service.
   *
   * A service that is already `ready` stays ready while it is re-checked, and
   * keeps its client when the alias it answers on has not changed: flipping
   * it to `checking` unmounted every guarded subtree on each boot, and
   * rebuilding the client threw away its cache for nothing.
   */
  const checkService = useCallback(
    async (serviceKey: string): Promise<{ profileId: string; serviceKey: string; alias: Alias } | undefined> => {
      dlog("[ArkitektProvider] checkService started:", serviceKey);
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
        dlog("[ArkitektProvider] checkService skipped (missing data):", serviceKey);
        return undefined;
      }

      const wasReady = serviceState.status === "ready" && !!serviceState.service;
      store.setState((current) => ({
        ...deriveRuntimeState(current, {
          serviceStateOverrides: {
            [serviceKey]: wasReady ? { revalidating: true } : { status: "checking", errors: [] },
          },
        }),
      }));

      /** Our result, unless a newer check, profile or fakts has taken over. */
      const stillOurs = (current: AppContext<T, S>) =>
        validationRunIdsRef.current[serviceKey] === runId &&
        current.storedSession?.fakts.instances[serviceKey] === instance &&
        current.profileBook.activeProfileId === profileId;

      try {
        // Aliases behind the profile's mesh wait for its node; the rest are
        // checked at once (`resolveServiceAlias`).
        const mesh = profileId ? state.profileBook.profiles[profileId]?.mesh : undefined;
        // No address of this hub on the mesh: its node is parked, and nothing
        // should wait on it.
        const gate = meshGateFor(meshNeeded(session.fakts, mesh) ? mesh : undefined);
        const resolved = await resolveServiceAlias({
          instance,
          cached: session.aliasMap.aliasMap[serviceKey],
          timeout: serviceBuilderMap[serviceKey]?.timeout ?? 5000,
          controller: new AbortController(),
          routed: (alias) => isMeshRouted(alias.host, mesh),
          meshUp: () => (gate.isRunning() ? Promise.resolve() : gate.ready.then(() => undefined)),
        });

        let changed = false;
        let supersededService: Service | undefined;

        store.setState((current) => {
          if (!stillOurs(current) || !current.storedSession) return current;
          const currentSession = current.storedSession;
          const liveService = current.connection?.serviceMap[serviceKey] as Service | undefined;

          // Same place as before and a client already talking to it: nothing
          // to rebuild, nothing to write — just say it is healthy.
          if (liveService && sameAlias(currentSession.aliasMap.aliasMap[serviceKey], resolved)) {
            return deriveRuntimeState(current, {
              serviceStateOverrides: {
                [serviceKey]: { status: "ready", errors: [], revalidating: false, lastCheckedAt: Date.now() },
              },
            });
          }

          changed = true;
          const nextSession: StoredArkitektSession = {
            ...currentSession,
            aliasMap: { aliasMap: { ...currentSession.aliasMap.aliasMap, [serviceKey]: resolved } },
          };

          // Rebuild only this service, keeping every other one (and
          // selfService) intact; the superseded client is disposed after the
          // commit below.
          let nextConnection: ConnectedContext<T, S>;
          if (current.connection) {
            const newService = serviceBuilderMap[serviceKey].builder({
              manifest: current.manifest,
              alias: resolved,
              fakts: nextSession.fakts,
              getToken: (options) => refreshTokenRef.current(options),
            });
            supersededService = liveService;
            nextConnection = {
              ...current.connection,
              serviceMap: {
                ...current.connection.serviceMap,
                [serviceKey]: newService,
              } as ConnectedContext<T, S>["serviceMap"],
              aliasMap: {
                ...current.connection.aliasMap,
                [serviceKey]: resolved,
              } as ConnectedContext<T, S>["aliasMap"],
            };
          } else {
            nextConnection = instantiateConnection(
              nextSession,
              current.manifest,
              serviceBuilderMap,
              selfServiceBuilder,
              (options) => refreshTokenRef.current(options),
            );
          }

          return {
            storedSession: nextSession,
            connection: nextConnection,
            ...deriveRuntimeState(current, {
              storedSession: nextSession,
              connection: nextConnection,
              serviceStateOverrides: {
                [serviceKey]: {
                  alias: resolved,
                  service: nextConnection.serviceMap[serviceKey] as Service | undefined,
                  status: "ready",
                  errors: [],
                  revalidating: false,
                  lastCheckedAt: Date.now(),
                },
              },
            }),
          };
        });

        supersededService?.dispose?.();
        dlog("[ArkitektProvider] checkService succeeded:", serviceKey, "alias changed:", changed);
        return changed && profileId ? { profileId, serviceKey, alias: resolved } : undefined;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to validate service";
        console.error("[ArkitektProvider] checkService failed:", serviceKey, message, error);

        let removedService: Service | undefined;

        store.setState((current) => {
          if (!stillOurs(current)) return current;

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
                  revalidating: false,
                  lastCheckedAt: Date.now(),
                },
              },
            }),
          };
        });

        // Tear down the client/socket of the service we dropped from the map.
        removedService?.dispose?.();
        return undefined;
      }
    },
    [store, serviceBuilderMap, selfServiceBuilder, deriveRuntimeState, meshGateFor],
  );

  /**
   * Check services in parallel, then write every alias that moved in ONE
   * book write. The alias map is patched onto whatever is PERSISTED rather
   * than our in-memory session: only the rotation paths may write a token,
   * or an alias fix landing after another window's refresh would put the
   * spent token back.
   */
  const validateServices = useCallback(
    async (serviceKeys: string[]) => {
      const changes = (await Promise.all(serviceKeys.map((key) => checkService(key)))).filter(
        (change): change is NonNullable<typeof change> => !!change,
      );
      if (changes.length === 0) return;

      await persistBook((book) =>
        changes.reduce((next, { profileId, serviceKey, alias }) => {
          const persisted = next.profiles[profileId]?.session;
          if (!persisted) return next;
          return updateProfileSession(next, profileId, {
            ...persisted,
            aliasMap: { aliasMap: { ...persisted.aliasMap.aliasMap, [serviceKey]: alias } },
          });
        }, book),
      );
    },
    [checkService, persistBook],
  );

  validateServicesRef.current = validateServices;

  const validateService = useCallback(
    (serviceKey: string) => validateServices([serviceKey]),
    [validateServices],
  );

  /**
   * Make a session the live one: hydrate every client, settle, and start the
   * service checks — the tail every bring-up (launch, switch, grant) shares.
   * Resolves when the checks have run.
   */
  const goLive = useCallback(
    (session: StoredArkitektSession, manifest: EnhancedManifest): Promise<void> => {
      hydrateConnection(
        session,
        manifest,
        { activity: SETTLED, autoLoginError: undefined },
        // A different login than whatever was live: nothing the previous one
        // learned about service health applies to it.
        { resetServiceStates: true },
      );
      return validateServices(Object.keys(serviceBuilderMap));
    },
    [hydrateConnection, validateServices, serviceBuilderMap],
  );

  /** Nothing live: tear the connection down and settle. */
  const park = useCallback(() => {
    hydrateConnection(
      null,
      store.getState().manifest,
      { activity: SETTLED, autoLoginError: undefined },
      { resetServiceStates: true },
    );
  }, [store, hydrateConnection]);

  // ── actions ──

  /**
   * Tell the coordination server which aliases worked, from the checks that
   * just ran. Best-effort and never awaited by anything the user waits on.
   */
  const reportChecks = useCallback(
    async (baseUrl: string) => {
      const state = store.getState();
      const reports = aliasReportsFrom(state.manifest.requirements, state.serviceStates);
      const { access_token } = await refreshTokenRef.current();
      const ok = await report(baseUrl, access_token, reports);
      return { ok, ...reports };
    },
    [store],
  );

  /**
   * A fresh grant, start to finish. The order is the point:
   *
   *  1. the grant — tokens, fakts, the mesh key and (from `self`) who it is for;
   *  2. the mesh is claimed AT ONCE, so a node behind it is joining while the
   *     rest runs, instead of after every alias has already timed out on it;
   *  3. ONE book write admits the profile under its final id;
   *  4. hydrate — lok is usable from here, the services follow as their
   *     checks land;
   *  5. the checks, then `/report/` from their results — neither awaited.
   *
   * Nothing live is touched before (4), so a failure (or a cancel, after
   * minutes in the browser) leaves the current connection exactly as it is —
   * including any token rotated meanwhile — says why in `autoLoginError`,
   * and rejects, so the caller can show it where the user clicked.
   */
  const connect = useCallback<AppFunctions["connect"]>(
    async ({ endpoint, controller, hint, onVerificationUri }) => {
      dlog("[ArkitektProvider] connect called, endpoint:", endpoint);
      controllerRef.current = controller;
      // A fresh grant is always remembered: the user just approved this app in
      // a browser, so the profile it produces is the one to come back to.
      const generation = nextBringUp();
      store.setState({
        activity: GRANTING,
        autoLoginError: undefined,
        sessionOnlyProfileId: null,
      });

      try {
        const enhancedManifest = await resolveEnhancedManifest();
        // Recorded before the grant so a half-finished connect still leaves
        // `reconnect()` somewhere to point.
        await persistBook((book) => setLastEndpoint(book, endpoint));

        // Whether to ask for a mesh key at all: not for a profile whose mesh
        // the user switched off.
        const hintedMesh = hintedProfileMesh(store.getState().profileBook, endpoint, hint);

        const { fakts, token: grantToken, mesh: grantedMesh, identity } = await flow({
          endpoint,
          controller,
          manifest: enhancedManifest,
          hint,
          requestMeshKey: hintedMesh?.enabled !== false,
          onVerificationUri,
        });
        dlog("[ArkitektProvider] connect: granted, services:", Object.keys(fakts.instances || {}));

        // The profile the grant names exactly knows its mesh best: its node
        // id is the one to re-authenticate, its switch and pins the user's.
        const finalId = identity
          ? deriveProfileId({
              baseUrl: endpoint.base_url,
              userId: identity.userId,
              organizationId: identity.orgId,
              hubId: identity.hubId,
            })
          : undefined;
        const previousMesh = meshForIdentity(store.getState().profileBook, finalId) ?? hintedMesh;
        const mesh = meshFromGrant(endpoint, grantedMesh, previousMesh);
        // A hub with an address on the mesh gets its node now; one without
        // still joins once — the key is one-shot, and skipping the join would
        // cost a new sign-in the day the hub gains such an address — and is
        // then parked.
        if (mesh?.enabled && grantedMesh) {
          void (meshNeeded(fakts, mesh)
            ? claimProfileMesh(mesh, grantedMesh.authKey)
            : joinAndPark(mesh, grantedMesh.authKey));
        }

        // No aliases yet: the checks below resolve them, once, instead of a
        // probe here and a second one straight after hydrating.
        const nextSession: StoredArkitektSession = {
          endpoint,
          fakts,
          token: normalizeToken(grantToken),
          aliasMap: { aliasMap: {} },
        };
        await persistBook(
          (book) => admitGrantedProfile(book, nextSession, identity, mesh).book,
        );
        // The grant is admitted either way (the user approved it); only a
        // newer bring-up decides what is live.
        if (!isCurrentBringUp(generation)) return;

        goLive(nextSession, enhancedManifest)
          .then(() => reportChecks(endpoint.base_url))
          .catch((error) => console.warn("[ArkitektProvider] could not report alias checks:", error));
      } catch (error) {
        console.error("[ArkitektProvider] connect failed:", error);
        if (!isCurrentBringUp(generation)) return;
        store.setState({
          activity: SETTLED,
          // A cancel is the user's choice, not a failure: nothing to report
          // (and nothing for the welcome screen to open its help for).
          autoLoginError: isAbortLikeError(error)
            ? undefined
            : error instanceof Error
              ? error.message
              : "Connection failed",
        });
        // The caller started this grant and shows its own failure; the shared
        // `autoLoginError` is for the surfaces that did not.
        throw error;
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
      }
    },
    [store, goLive, reportChecks, resolveEnhancedManifest, persistBook],
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
    park();
  }, [park, persistBook]);

  const reconnect = useCallback<AppFunctions["reconnect"]>(async () => {
    dlog("[ArkitektProvider] reconnect called");
    const state = store.getState();
    const endpoint = state.storedSession?.endpoint || state.profileBook.lastEndpoint;
    if (!endpoint) {
      console.error("[ArkitektProvider] reconnect failed: no endpoint found");
      throw new Error("No endpoint found in local storage");
    }
    // Reconnecting is by definition a re-approval of the profile we are on, so
    // the configure page can be told which account and hub to preselect.
    const active = getActiveProfile(state.profileBook);
    await connect({
      endpoint,
      controller: new AbortController(),
      hint: active ? grantHintForProfile(active) : undefined,
    });
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
    async (profileId, options) => {
      const state = store.getState();
      const remember = options?.remember ?? true;

      if (state.activity.kind === "switching") {
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

      dlog("[ArkitektProvider] switchProfile:", profileId, { remember });
      // Set BEFORE the first persist: `persistBook` reads this to decide what
      // to leave out of the write, and the rotation below writes.
      const generation = nextBringUp();
      store.setState({
        activity: switching(profileId),
        autoLoginError: undefined,
        sessionOnlyProfileId: remember ? null : profileId,
      });

      try {
        // (2) — the rotation is persisted (inside `rotateProfileSession`,
        // under the cross-window lock) before the swap can throw.
        const { manifest, session: nextSession } = await reviveStoredProfile(profile, (book, s) =>
          updateProfileSession(markProfileOk(book, profileId), profileId, s),
        );

        // Cancelled or overtaken — or the profile was removed while its
        // refresh was in flight. The rotation is persisted regardless; only
        // a switch that is still wanted makes the profile the active one.
        if (!isCurrentBringUp(generation)) return;
        if (!store.getState().profileBook.profiles[profileId]) {
          store.setState({ activity: SETTLED, sessionOnlyProfileId: null });
          return;
        }
        await persistBook((book) => setActiveProfile(book, profileId));
        if (!isCurrentBringUp(generation)) {
          // Cancelled during that very write: put back what is still live.
          const previousId = state.profileBook.activeProfileId;
          await persistBook((book) =>
            book.activeProfileId === profileId ? setActiveProfile(book, previousId) : book,
          );
          return;
        }

        void goLive(nextSession, manifest);
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

        // The switch never happened, so nothing is signed in for this run only.
        if (isCurrentBringUp(generation)) {
          store.setState({
            activity: SETTLED,
            autoLoginError: message,
            sessionOnlyProfileId: null,
          });
        }
        throw error;
      }
    },
    [store, persistBook, reviveStoredProfile, goLive],
  );

  const signOutProfile = useCallback<AppFunctions["signOutProfile"]>(
    async (profileId) => {
      dlog("[ArkitektProvider] signOutProfile:", profileId);
      const wasActive = store.getState().profileBook.activeProfileId === profileId;

      // `stale` is exactly this state — "the credential here will not get you
      // in, ask for a grant" — so signing out reuses it rather than inventing
      // a second way for a row to mean the same thing.
      await persistBook((book) => {
        const marked = markProfileStale(book, profileId, "Signed out on this computer");
        return wasActive ? setActiveProfile(marked, null) : marked;
      });

      if (wasActive) park();
    },
    [store, persistBook, park],
  );

  const removeProfile = useCallback<AppFunctions["removeProfile"]>(
    async (profileId) => {
      dlog("[ArkitektProvider] removeProfile:", profileId);
      const wasActive = store.getState().profileBook.activeProfileId === profileId;

      // Local only: the fakts discovery document has no `revocation_endpoint`,
      // so the refresh token stays valid server-side until it expires.
      const book = await persistBook((current) => removeProfileFromBook(current, profileId));

      if (wasActive) park();

      return void book;
    },
    [store, persistBook, park],
  );

  const forgetAllProfiles = useCallback<AppFunctions["forgetAllProfiles"]>(async () => {
    dlog("[ArkitektProvider] forgetAllProfiles called");
    controllerRef.current = null;
    // Keep the last endpoint: forgetting the logins should not also forget
    // which deployment this machine talks to.
    const lastEndpoint = store.getState().profileBook.lastEndpoint;
    await persistBook(() => setLastEndpoint(emptyProfileBook(), lastEndpoint));
    park();
  }, [store, persistBook, park]);

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

        if (!patch.label) return book;
        // lok answers the same thing on every launch; only a real change is
        // worth a write (and a `storage` event in every other window). The
        // `refreshedAt` stamp alone is not one.
        const { refreshedAt: _stamp, ...incoming } = patch.label;
        const { refreshedAt: _held, ...held } = profile.label;
        const unchanged = Object.entries(incoming).every(
          ([key, value]) => (held as Record<string, unknown>)[key] === value,
        );
        return unchanged ? book : updateProfileLabel(book, profileId, patch.label);
      });
    },
    [persistBook],
  );

  const setProfileMesh = useCallback<AppFunctions["setProfileMesh"]>(
    async (profileId, update) => {
      await persistBook((book) => updateProfileMesh(book, profileId, update));
    },
    [persistBook],
  );

  const cancelConnection = useCallback<AppFunctions["cancelConnection"]>(() => {
    dlog("[ArkitektProvider] cancelConnection called");
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    // Whatever is in flight — a grant or a switch — is overtaken by this.
    nextBringUp();
    store.setState({ activity: SETTLED, autoLoginError: undefined });
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

  // Re-check the connected services (which also heals the live connection)
  // and report what they found — the same path a fresh grant takes.
  const reportStatus = useCallback<AppFunctions["reportStatus"]>(async () => {
    const conn = store.getState().connection;
    if (!conn) return null;
    await validateServices(Object.keys(serviceBuilderMap));
    return reportChecks(conn.endpoint.base_url);
  }, [store, serviceBuilderMap, validateServices, reportChecks]);

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
      signOutProfile,
      removeProfile,
      forgetAllProfiles,
      setProfileIdentity,
      setProfileMesh,
    }),
    [connect, disconnect, reconnect, cancelConnection, retryService, retryModule, clearServiceCache, clearAllServiceCaches, reportStatus, switchProfile, signOutProfile, removeProfile, forgetAllProfiles, setProfileIdentity, setProfileMesh],
  );

  // ── ONE useEffect: load the profile book, activate the live one, health-check ──
  useEffect(() => {
    const run = async () => {
      try {
        const storage = await storageProviderRef.current();
        // Validates profiles one at a time so a single corrupt entry cannot
        // sign the user out of the rest. Never throws.
        // COMPOSED with the seeded book, not written over it: the seed is this
        // window's snapshot from a microtask ago, and `adoptPersistedBook` keeps
        // its choice of active profile only while that profile still exists in
        // what is actually persisted. That is exactly the case where another
        // window removed the profile we optimistically opened into — we fall
        // through to "nothing active" and the welcome screen, rather than
        // resurrecting a login that is gone.
        const persisted = loadStoredProfileBook(storage);
        store.setState((state) => ({
          profileBook: adoptPersistedBook(persisted, state.profileBook),
        }));
        const book = store.getState().profileBook;

        const active = getActiveProfile(book);

        dlog("[ArkitektProvider]: Bootstrapping with profile:", active?.id ?? "none");

        if (!active) {
          dlog("[ArkitektProvider] Bootstrap: nothing active, marking bootstrapped");
          setBootstrapped({ manifest: await resolveEnhancedManifest() });
          return;
        }

        // The same path a switch takes — prove the credential, persist the
        // rotation, then hydrate — so there is one implementation of "bring a
        // profile up" rather than two that drift. A token that is still fresh
        // is used as it is (nothing is sent), and a popout starting next to
        // the main window adopts the main window's rotation rather than
        // spending the same refresh token a second time. The manifest's IPC
        // round trip runs alongside; nothing in the rotation needs it.
        const generation = nextBringUp();
        const { manifest: enhancedManifest, session: nextSession } = await reviveStoredProfile(
          active,
          (current, s) => updateProfileSession(markProfileOk(current, active.id), active.id, s),
        );
        // A grant or a switch the user started meanwhile wins.
        if (!isCurrentBringUp(generation)) return;

        void goLive(nextSession, enhancedManifest);
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
          adoptLiveSession(live.token.client_id, { ...live, token: theirs.token, fakts: theirs.fakts });
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
