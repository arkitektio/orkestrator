import { ApolloClient, NormalizedCacheObject, gql } from "@apollo/client";
import type { Ward } from "@/lib/ports/types";

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
