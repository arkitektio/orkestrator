import type { ApolloClient } from "@apollo/client";

import type { JSONObject, JSONValue } from "@/core/types";

/**
 * A named request on a module's own service, callable from other modules'
 * UI (module spec: a `request` perform, by operation name). Data in, data
 * out: `alpaka.startRoom` creates a room and its first message and returns
 * their ids, so rekuest can start a replyer on it without importing alpaka.
 */
export type OperationHandler = {
  /** The service key whose client runs it; "lok" is the session's own service. */
  service: string;
  run: (client: ApolloClient<any>, args: JSONObject) => Promise<JSONValue>;
};

/** A ready client for `service`, read from the Arkitekt store's state. */
export const resolveServiceClient = (state: unknown, service: string): ApolloClient<any> | undefined => {
  const typed = state as {
    serviceStates: Record<string, { status?: string } | undefined>;
    connection?: {
      selfService?: { client?: unknown };
      serviceMap?: Record<string, { client?: unknown } | undefined>;
    };
  };
  const client =
    service === "lok"
      ? typed.connection?.selfService?.client
      : typed.serviceStates[service]?.status === "ready"
        ? typed.connection?.serviceMap?.[service]?.client
        : undefined;
  return client as ApolloClient<any> | undefined;
};
