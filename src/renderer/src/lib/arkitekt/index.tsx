import { Manifest, Requirement } from "./fakts/manifestSchema";
import type {
  AppContext,
  ModuleRegistry,
  ServiceBuilder,
  ServiceBuilderMap,
} from "@/lib/arkitekt/provider";
import {
  buildArkitektProvider,
  ConnectedGuard,
  useAvailableModules,
  useAvailableModuleKeys,
  useModuleState,
  useReadyModuleKeys,
  useArkitekt,
  useArkitektActions,
  useArkitektStore,
  useArkitektStoreApi,
  useAvailableServices,
  useConfigurationIssues,
  useConnection,
  usePotentialService,
  useService,
  useServiceState,
} from "@/lib/arkitekt/provider";
import {
  useActiveProfile,
  useActiveProfileId,
  useHasActiveProfile,
  useIsAutoLoggingIn,
  useProfiles,
  useSelfService,
  useSwitchingProfileId,
} from "./hooks";
// When using the Tauri API npm package:

export type ServiceGuardProps = {
  children: React.ReactNode;
  /**
   * What to show for EVERY non-ready state a specific prop below does not
   * cover. A page-level fallback that reads the service's own state (why it
   * is down, a retry) belongs here; the per-state props are for callers that
   * want to render nothing, or something different, for one state.
   */
  fallback?: React.ReactNode;
  unavailable?: React.ReactNode;
  unconfigured?: React.ReactNode;
  configuring?: React.ReactNode;
  challenging?: React.ReactNode;
};

export const buildGuard =
  (key: string) =>
    (props: ServiceGuardProps) => {
      const serviceState = useServiceState(key);
      const fallback = props.fallback ?? null;

      if (!serviceState) {
        return props.unavailable ?? fallback;
      }

      switch (serviceState.status) {
        case "unconfigured":
        case "invalid":
          return props.unconfigured ?? fallback;
        case "configured":
          return props.configuring ?? fallback;
        case "checking":
          return props.challenging ?? fallback;
        case "ready":
          return props.children;
        default:
          return null;
      }
    };

export const buildWith =
  (key: string) =>
    <T extends (options: Record<string, unknown>) => unknown>(func: T): T => {
      const Wrapped = (options: Record<string, unknown>) => {
        const service = useService(key);

        return func({ ...options, client: service.client });
      };
      return Wrapped as unknown as T;
    };




export const buildArkitekt = <T extends ServiceBuilderMap, S extends ServiceBuilder>({
  manifest,
  serviceBuilderMap,
  selfServiceBuilder,
  moduleRegistry,
  storageProvider,
}: {
  manifest: Manifest;
  serviceBuilderMap: T;
  selfServiceBuilder: S;
  moduleRegistry?: ModuleRegistry;
  storageProvider?: () => Promise<Storage>;
}) => {

  const requirements: Requirement[] = serviceBuilderMap
    ? Object.values(serviceBuilderMap).map((s) => ({
      service: s.service,
      key: s.key,
      optional: s.optional,
    }))
    : [];

  const realManifest: Manifest = {
    ...manifest,
    requirements: requirements,
  };

  return {
    Provider: buildArkitektProvider({
      manifest: realManifest,
      serviceBuilderMap,
      selfServiceBuilder: selfServiceBuilder,
      moduleRegistry,
      storageProvider,
    }),
    buildServiceGuard: <K extends keyof T>(serviceKey: K) => buildGuard(serviceKey as string),
    Guard: ConnectedGuard,
    useConnect: () => useArkitektActions().connect,
    useDisconnect: () => useArkitektActions().disconnect,
    useReconnect: () => useArkitektActions().reconnect,
    // Profiles: several approved logins, parked side by side. Switching between
    // them is local — see `fakts/profileStorageSchema.ts`.
    useProfiles,
    useActiveProfile,
    useActiveProfileId,
    /** Whether this window belongs to an account — true before the token is back. */
    useHasActiveProfile,
    /** Whether a stored profile is being brought up right now. */
    useIsAutoLoggingIn,
    useSwitchingProfileId,
    useSwitchProfile: () => useArkitektActions().switchProfile,
    useSignOutProfile: () => useArkitektActions().signOutProfile,
    useRemoveProfile: () => useArkitektActions().removeProfile,
    useForgetAllProfiles: () => useArkitektActions().forgetAllProfiles,
    useSetProfileIdentity: () => useArkitektActions().setProfileIdentity,
    useSetProfileMesh: () => useArkitektActions().setProfileMesh,
    useReportStatus: () => useArkitektActions().reportStatus,
    useCancelConnection: () => useArkitektActions().cancelConnection,
    useManifest: () => realManifest,
    useConnectedManifest: () => useArkitektStore((s) => s.connection?.manifest),
    useConnection: (): AppContext<T>["connection"] => useConnection() as AppContext<T>["connection"],
    useActions: () => useArkitektActions(),
    useFakts: () => useArkitektStore((s) => s.connection?.fakts),
    useAlias: <K extends keyof T>(serviceKey: K) => {
      const service = useService(serviceKey as string);
      return service?.alias;
    },
    useSelfService: (): ReturnType<S> => useSelfService() as ReturnType<S>,
    useSelf: () => useArkitektStore((s) => s.connection?.fakts.self),
    useAutoLoginError: (): AppContext<T>["autoLoginError"] => useArkitektStore((s) => s.autoLoginError),
    useAvailableServices: useAvailableServices,
    useAvailableModules: useAvailableModules,
    useModuleState: useModuleState,
    useServiceState: useServiceState,
    useAvailableModuleKeys: useAvailableModuleKeys,
    useReadyModuleKeys: useReadyModuleKeys,
    useConfigurationIssues: useConfigurationIssues,
    useService: <K extends keyof T,>(service: K): ReturnType<T[K]["builder"]> => useService(service as string) as ReturnType<T[K]["builder"]>,
    usePotentialService: <K extends keyof T,>(service: K): ReturnType<T[K]["builder"]> | undefined => usePotentialService(service as string) as ReturnType<T[K]["builder"]> | undefined,
    useToken: () =>
      useArkitektStore(
        (s) =>
          s.connection?.token?.access_token ||
          s.storedSession?.token?.access_token ||
          null,
      ),
    useArkitekt: useArkitekt,
    /** The vanilla store, for reading services from outside a render (prefetch). */
    useStoreApi: useArkitektStoreApi,
  };
};
