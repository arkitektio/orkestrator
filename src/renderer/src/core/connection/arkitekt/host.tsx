import type { ApolloClient } from "@apollo/client";
import { useMemo, type ComponentType } from "react";

import { coordinationBase } from "./coordination";
import { arkitektHooks, buildGuard, type ServiceGuardProps } from "./index";
import { useArkitektStore } from "./provider";

/**
 * The connection, as core and modules use it — independent of which modules
 * the app composes. Everything here reads the store the app's
 * `Arkitekt.Provider` mounts, so nothing here needs the app's service map.
 *
 * A module binds its own service: `export const MikroGuard =
 * serviceGuard("mikro")`, `export const useMikro = () =>
 * useServiceClient("mikro")` (see `<module>/api`). The host never names
 * module services.
 */
export const Arkitekt = arkitektHooks;

const guards = new Map<string, ComponentType<ServiceGuardProps>>();

/**
 * Renders its children only while `serviceKey` (a fakts requirement key) is
 * ready — CLAUDE.md §1. One component per key, so identity is stable.
 */
export const serviceGuard = (serviceKey: string): ComponentType<ServiceGuardProps> => {
  let guard = guards.get(serviceKey);
  if (!guard) {
    guard = buildGuard(serviceKey);
    (guard as { displayName?: string }).displayName = `ServiceGuard(${serviceKey})`;
    guards.set(serviceKey, guard);
  }
  return guard;
};

/** The ready client of `serviceKey`; throws (like `useService`) when absent. */
export const useServiceClient = <C = ApolloClient<any>>(serviceKey: string): C =>
  Arkitekt.useService(serviceKey).client as C;

/** The session's own (lok) client. */
export const useSelfClient = <C = ApolloClient<any>>(): C | undefined =>
  Arkitekt.useSelfService()?.client as C | undefined;

/** Guards for the host's own services: the session and the shared stores. */
export const Guard = {
  /** Signed in: the session (lok) is up. */
  Lok: Arkitekt.Guard,
  Datalayer: serviceGuard("datalayer"),
  Livekit: serviceGuard("livekit"),
};

/**
 * Where lok's media lives: the coordination server's base path, not the
 * `datalayer` service from fakts (that one is the modules' store).
 */
export const useCoordinationEndpoint = (): string | undefined => {
  const baseUrl = useArkitektStore((state) => state.connection?.endpoint?.base_url);
  return useMemo(() => (baseUrl ? coordinationBase(baseUrl) : undefined), [baseUrl]);
};

export const useDatalayerEndpoint = (): string | undefined =>
  (Arkitekt.usePotentialService("datalayer")?.client as { url?: string } | undefined)?.url;

export const useLivekit = () => Arkitekt.useService("livekit").client as { url: string };

/**
 * The services an action (or anything handed the service map) reads, by
 * key: `Action<ModuleServices<"mikro">>` types `services.mikro.client`.
 */
export type ModuleServices<K extends string> = Record<K, { client: ApolloClient<any>; alias?: unknown }>;
