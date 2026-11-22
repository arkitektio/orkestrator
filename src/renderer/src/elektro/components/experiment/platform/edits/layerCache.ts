import type { ApolloCache } from "@apollo/client";
import possibleTypes from "@/elektro/api/fragments";

/**
 * Drop a deleted layer from the cache. Its concrete type is not known where it
 * is deleted, so every layer type's entry of that id goes; the experiment's
 * `layers` list then reads without the dangling reference, and nothing else of
 * the scene is asked again.
 */
export const evictLayer = (cache: ApolloCache<unknown>, id: string): void => {
  for (const typename of possibleTypes.possibleTypes.ExperimentLayer ?? []) {
    cache.evict({ id: cache.identify({ __typename: typename, id }) });
  }
  cache.gc();
};
