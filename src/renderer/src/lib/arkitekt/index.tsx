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
  useProfiles,
  useSelfService,
  useSwitchingProfileId,
} from "./hooks";
// When using the Tauri API npm package:

export const buildGuard =
  (key: string) =>
    (props: { children: React.ReactNode; unavailable?: React.ReactNode; unconfigured?: React.ReactNode; configuring?: React.ReactNode; challenging?: React.ReactNode }) => {
      const serviceState = useServiceState(key);

      if (!serviceState) {
        return props.unavailable ?? null;
      }

      switch (serviceState.status) {
        case "unconfigured":
        case "invalid":
          return props.unconfigured ?? null;
        case "configured":
          return props.configuring ?? null;
        case "checking":
          return props.challenging ?? null;
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
    useSwitchingProfileId,
    useSwitchProfile: () => useArkitektActions().switchProfile,
    useRemoveProfile: () => useArkitektActions().removeProfile,
    useForgetAllProfiles: () => useArkitektActions().forgetAllProfiles,
    useSetProfileIdentity: () => useArkitektActions().setProfileIdentity,
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
  };
};
