import { ApolloClient, NormalizedCacheObject, gql } from "@apollo/client";
import type { Ward } from "@arkitektio/bsx/ports/engine/types";

import type { AppContext, Service, ServiceBuilderMap } from "./types";

const describeDocument = gql(`
  query Describe($identifier: String!, $id: ID!) {
    describe(identifier: $identifier, id: $id) {
      key
      value
    }
  }
`);

export const buildGraphQlWard = (
  client: ApolloClient<NormalizedCacheObject>,
  options?: { describe?: boolean },
): Ward => {
  const ward: Ward = {
    search: async ({ query, variables }) => {
      const document = gql(query);
      const result = await client.query({ query: document, variables });
      return result.data.options;
    },
  };

  if (options?.describe) {
    ward.describe = async ({ identifier, id }) => {
      const result = await client.query({
        query: describeDocument,
        variables: { identifier, id },
      });
      return result.data.describe as { key: string; value: string }[];
    };
  }

  return ward;
};

/**
 * One stable ward per service that declares a `wardKey`, for the port
 * widgets' searches. Each looks up the live service's ward in the store WHEN
 * CALLED: a search widget memoizes its ward, so a ward copied in once would
 * outlive a reconnect (its client disposed) or predate the connection.
 * `describe` exists only where the definition says the service can describe,
 * since callers branch on it.
 */
export const buildConnectionWards = (
  serviceBuilderMap: ServiceBuilderMap,
  getState: () => AppContext,
): Record<string, Ward> => {
  const wards: Record<string, Ward> = {};
  for (const definition of Object.values(serviceBuilderMap)) {
    const { wardKey } = definition;
    if (!wardKey) continue;
    const live = (): Ward => {
      const service = getState().connection?.serviceMap[definition.key] as Service | undefined;
      if (!service?.ward) throw new Error(`${definition.name ?? definition.key} is not connected`);
      return service.ward;
    };
    const ward: Ward = { search: async (options) => live().search(options) };
    if (definition.describe) {
      ward.describe = async (options) => {
        const describe = live().describe;
        if (!describe) throw new Error(`${definition.name ?? definition.key} cannot describe objects`);
        return describe(options);
      };
    }
    wards[wardKey] = ward;
  }
  return wards;
};
