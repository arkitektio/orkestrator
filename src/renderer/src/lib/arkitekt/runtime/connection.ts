import { ActiveFakts, Alias } from "../fakts/faktsSchema";
import { StoredArkitektSession } from "../session/record";
import {
  ConnectedContext,
  EnhancedManifest,
  GetToken,
  Service,
  ServiceBuilder,
  ServiceBuilderMap,
  ServiceDefinition,
} from "../types";
import { normalizeToken } from "./auth";

export type AliasMap = Record<string, Alias>;
export type ServiceMap = Record<string, Service>;

export const buildServiceMap = ({
  map,
  manifest,
  aliasMap,
  fakts,
  getToken,
}: {
  map: ServiceBuilderMap;
  manifest: EnhancedManifest;
  aliasMap: AliasMap;
  fakts: ActiveFakts;
  getToken: GetToken;
}): ServiceMap => {
  const services: ServiceMap = {};

  Object.keys(map).forEach((key) => {
    const definition: ServiceDefinition = map[key];
    const alias = aliasMap[key];

    if (!alias) {
      return;
    }

    services[key] = definition.builder({
      manifest,
      alias,
      fakts,
      getToken,
    });
  });

  return services;
};

/**
 * Tear down every client/socket held by a connection that is being replaced or
 * dropped. Without this, the Apollo clients and their graphql-ws sockets created
 * by the builders are orphaned (the socket stays open / retry loops keep running,
 * and the whole cache+link graph is retained) when the connection is overwritten.
 */
export const disposeConnection = (
  connection:
    | { serviceMap: Record<string, Service | undefined>; selfService?: unknown }
    | undefined
    | null,
): void => {
  if (!connection) {
    return;
  }
  Object.values(connection.serviceMap).forEach((service) => {
    try {
      (service as Service | undefined)?.dispose?.();
    } catch (e) {
      console.warn("[arkitekt] failed to dispose service during teardown:", e);
    }
  });
  try {
    (connection.selfService as Service | undefined)?.dispose?.();
  } catch (e) {
    console.warn("[arkitekt] failed to dispose selfService during teardown:", e);
  }
};

export const instantiateConnection = <
  T extends ServiceBuilderMap,
  S extends ServiceBuilder,
>(
  storedSession: StoredArkitektSession,
  manifest: EnhancedManifest,
  serviceBuilderMap: T,
  selfServiceBuilder: S,
  getToken: GetToken,
): ConnectedContext<T, S> => {
  const token = normalizeToken(storedSession.token);
  const serviceMap = buildServiceMap({
    map: serviceBuilderMap,
    manifest,
    aliasMap: storedSession.aliasMap.aliasMap,
    fakts: storedSession.fakts,
    getToken,
  }) as ConnectedContext<T, S>["serviceMap"];

  const selfService = selfServiceBuilder({
    manifest,
    alias: storedSession.fakts.self.alias,
    fakts: storedSession.fakts,
    getToken,
  });

  return {
    endpoint: storedSession.endpoint,
    fakts: storedSession.fakts,
    manifest,
    serviceMap,
    aliasMap: storedSession.aliasMap.aliasMap as ConnectedContext<T, S>["aliasMap"],
    serviceInstanceMap: storedSession.fakts.instances,
    serviceBuilderMap,
    selfService: selfService as ReturnType<S>,
    token,
  };
};
