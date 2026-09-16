import type { ReactNode } from "react";

import { FaktsEndpoint } from "./fakts/endpointSchema";
import { ActiveFakts, Alias, Instance } from "./fakts/faktsSchema";
import { Manifest } from "./fakts/manifestSchema";
import { StoredArkitektSession } from "./fakts/sessionStorageSchema";
import {
  ProfileIdentity,
  ProfileLabel,
  StoredProfileBook,
} from "./fakts/profileStorageSchema";
import { TokenResponse } from "./fakts/tokenSchema";
import type { Ward } from "@/rekuest/widgets/types";

export type AvailableService = {
  key: string;
  service: string;
  resolved: Alias;
};

export type UnresolvedService = {
  key: string;
  service: string;
  aliases: Alias[] | undefined;
};

export type Service<T = unknown> = {
  alias?: Alias;
  client: T;
  clearCache?: () => Promise<void>;
  /**
   * Tear down the underlying client and any long-lived connections (Apollo
   * client + graphql-ws socket). Called when this service is superseded in the
   * service map or on disconnect, so discarded clients/sockets are not orphaned.
   */
  dispose?: () => void;
  type?: string;
  ward?: Ward;
};

/**
 * How every client obtains a usable access token.
 *
 * Normally this refreshes only when the token is near expiry. `forceRefresh`
 * is for the one case that cannot be decided from the clock: the server just
 * rejected the token we hold, so the cached one — however fresh it looks — is
 * exactly the one that must not be reused.
 */
export type GetToken = (options?: {
  forceRefresh?: boolean;
}) => Promise<TokenResponse>;

export type ServiceBuilder<T extends Service = Service> = (options: {
  manifest: Manifest;
  alias: Alias;
  fakts: ActiveFakts;
  getToken: GetToken;
}) => T;

export type ServiceDefinition<T extends Service = Service> = {
  builder: ServiceBuilder<T>;
  key: string;
  service: string;
  omitchallenge?: boolean;
  forceinsecure?: boolean;
  optional: boolean;
  timeout?: number;
  wardKey?: string;
  describe?: boolean;
  description?: string;
  name?: string;
  logo?: () => ReactNode;
};

export type ServiceBuilderMap<
  T extends Record<string, ServiceDefinition> = Record<string, ServiceDefinition>,
> = {
  [K in keyof T]: T[K];
};

export type InferedServiceMap<T extends ServiceBuilderMap> = {
  [K in keyof T]?: T[K] extends ServiceDefinition<infer R> ? R : never;
};

export type AliasReport = {
  valid: boolean;
  alias_id?: string;
  reason?: string;
};

export type ReportRequest = {
  alias_reports: { [key: string]: AliasReport };
  functional: boolean;
};

export type EnhancedManifest = Manifest & {
  node_id?: string;
};

export type ModuleRequirement = {
  serviceKey: string;
  optional?: boolean;
};

export type ModuleDefinition = {
  key: string;
  route: string;
  label?: string;
  description?: string;
  requirement: ModuleRequirement;
  hidden?: boolean;
};

export type ModuleRegistry = Record<string, ModuleDefinition>;

export type ServiceHealthStatus =
  | "unconfigured"
  | "configured"
  | "checking"
  | "ready"
  | "invalid";

export type ModuleHealthStatus =
  | "hidden"
  | "configured"
  | "checking"
  | "ready"
  | "invalid";

export type ServiceRuntimeState = {
  key: string;
  configured: boolean;
  definition: ServiceDefinition;
  instance?: Instance;
  alias?: Alias;
  service?: Service;
  status: ServiceHealthStatus;
  errors: string[];
  lastCheckedAt?: number;
};

export type ModuleRuntimeState = {
  key: string;
  definition: ModuleDefinition;
  configured: boolean;
  status: ModuleHealthStatus;
  route: string;
  errors: string[];
  unmetRequirements: string[];
};

export type ConnectedContext<
  T extends ServiceBuilderMap = ServiceBuilderMap,
  S extends ServiceBuilder = ServiceBuilder,
> = {
  fakts: ActiveFakts;
  manifest: EnhancedManifest;
  serviceMap: InferedServiceMap<T>;
  aliasMap: { [K in keyof T]?: Alias };
  serviceInstanceMap: { [key: string]: Instance };
  serviceBuilderMap: T;
  selfService: ReturnType<S>;
  token: TokenResponse;
  endpoint: FaktsEndpoint;
};

export type ConnectFunction = (options: {
  endpoint: FaktsEndpoint;
  controller: AbortController;
}) => Promise<void>;

export type DisconnectFunction = () => Promise<void>;

export type AppContext<
  T extends ServiceBuilderMap = ServiceBuilderMap,
  S extends ServiceBuilder = ServiceBuilder,
> = {
  manifest: EnhancedManifest;
  connection?: ConnectedContext<T, S>;
  autoLoginError?: string;
  connecting: boolean;
  hasBootstrapped: boolean;
  configurationIssues: string[];
  serviceStates: Record<string, ServiceRuntimeState>;
  moduleStates: Record<string, ModuleRuntimeState>;
  /**
   * The ACTIVE profile's session, always mirrored from
   * `profileBook.profiles[activeProfileId]`. Kept as its own field so every
   * existing consumer (`ConnectedGuard`, `validateService`, `useToken`, …) reads
   * exactly what it always did and is unaware profiles exist.
   */
  storedSession: StoredArkitektSession | null;
  /** Every login this app is holding, and which of them is live. */
  profileBook: StoredProfileBook;
  /**
   * The profile a switch is currently proving. Deliberately NOT `connecting`:
   * the whole point is that the app stays usable on the current profile while
   * the new one's credential is checked, so only the switcher row spins.
   */
  switchingProfileId: string | null;
};

export type AppFunctions = {
  connect: ConnectFunction;
  disconnect: DisconnectFunction;
  reconnect: () => Promise<void>;
  cancelConnection: () => void;
  retryService: (serviceKey: string) => Promise<void>;
  retryModule: (moduleKey: string) => Promise<void>;
  clearServiceCache: (serviceKey: string) => Promise<void>;
  clearAllServiceCaches: () => Promise<void>;
  reportStatus: () => Promise<ReportResult | null>;
  /**
   * Make an already-approved profile the live one: refresh its parked token,
   * then swap the connection. The current connection stays up until the new
   * token is in hand, so a failure costs nothing.
   */
  switchProfile: (profileId: string) => Promise<void>;
  /**
   * Forget one profile locally. There is no `revocation_endpoint` in the fakts
   * discovery document, so the token stays valid server-side until it expires.
   */
  removeProfile: (profileId: string) => Promise<void>;
  /** Forget every profile — the old, destructive meaning of `disconnect`. */
  forgetAllProfiles: () => Promise<void>;
  /**
   * Attach the server-side identity to a profile once lok has answered. This is
   * how a provisional id becomes `baseUrl::user::org`; the caller lives in the
   * app layer because `lib/arkitekt` must stay free of lok's GraphQL.
   */
  setProfileIdentity: (
    profileId: string,
    patch: { identity?: ProfileIdentity; label?: ProfileLabel },
  ) => void;
};

export type ReportResult = {
  ok: boolean;
  functional: boolean;
  alias_reports: { [key: string]: AliasReport };
};

export type ArkitektContextType<
  T extends ServiceBuilderMap = ServiceBuilderMap,
  S extends ServiceBuilder = ServiceBuilder,
> = AppContext<T, S> & AppFunctions;
