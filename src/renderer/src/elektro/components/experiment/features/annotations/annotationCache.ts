import type { ApolloCache, Reference } from "@apollo/client";
import {
  ExpDefaultAnnotationCollectionFragmentDoc,
  type CreateAnnotationInput,
  type CreateExperimentAnnotationMutation,
  type ExpDefaultAnnotationCollectionFragment,
} from "@/elektro/api/graphql";

/**
 * Annotation writes, reflected straight into the Apollo cache.
 *
 * The scene query normalizes `AnnotationCollection:<id>` with its
 * `annotations`, and `Experiment:<id>` with its `layers`. So a new annotation
 * is one reference appended to its collection, a deleted one is an eviction,
 * and a minted layer is one reference appended to the experiment. The query
 * re-emits and the provider folds that in as it does any other result — the
 * `AnnotationMarksIndexer` re-indexes only the collection that changed.
 * Nothing refetches the whole scene. The exception is the experiment's FIRST
 * mark, which mints its collection and layer server-side, out of the client's
 * sight.
 *
 * Optimistic: the create shows up at once under a temporary id, and Apollo
 * swaps it for the server's result, or rolls it back if the write fails.
 */

type CreatedAnnotation = CreateExperimentAnnotationMutation["createAnnotation"];

let optimisticSeq = 0;

/** What the server will return, as far as the client can know it. */
export const optimisticAnnotation = (
  input: CreateAnnotationInput,
  collectionId: string,
): CreateExperimentAnnotationMutation => ({
  __typename: "Mutation",
  createAnnotation: {
    __typename: "Annotation",
    id: `optimistic-annotation-${++optimisticSeq}`,
    name: input.name ?? "",
    description: input.description ?? null,
    kind: input.kind,
    vectors: input.vectors as number[][],
    coordinates: (input.coordinates ?? []).map((c) => ({
      __typename: "Coordinate" as const,
      name: c.name,
      value: c.value,
    })),
    strokeColor: (input.strokeColor as number[] | null | undefined) ?? null,
    fillColor: (input.fillColor as number[] | null | undefined) ?? null,
    strokeWidth: input.strokeWidth ?? 1,
    filled: input.filled ?? false,
    createdWithTransforms: 0,
    collection: { __typename: "AnnotationCollection", id: collectionId },
  } as CreatedAnnotation,
});

const hasRef = (list: readonly Reference[], ref: Reference) =>
  list.some((item) => item.__ref === ref.__ref);

/**
 * Append a created annotation to its collection's cached `annotations`. Runs
 * for the optimistic result and again for the real one; idempotent. Returns
 * whether the cache changed — false for a collection the cache does not hold
 * (nothing on screen could show it) or an annotation already listed.
 */
export const appendAnnotation = (
  cache: ApolloCache<unknown>,
  created: CreatedAnnotation | null | undefined,
): boolean => {
  if (!created) return false;
  const collectionId = cache.identify({ __typename: "AnnotationCollection", id: created.collection.id });
  const annotationId = cache.identify({ __typename: "Annotation", id: created.id });
  if (!collectionId || !annotationId) return false;
  return cache.modify({
    id: collectionId,
    fields: {
      annotations(existing) {
        const list = (existing ?? []) as readonly Reference[];
        const ref: Reference = { __ref: annotationId };
        return hasRef(list, ref) ? list : [...list, ref];
      },
    },
  });
};

/**
 * Drop a deleted annotation from the cache. A list holding a dangling reference
 * reads without it, so every collection that listed it updates.
 */
export const evictAnnotation = (cache: ApolloCache<unknown>, id: string): void => {
  cache.evict({ id: cache.identify({ __typename: "Annotation", id }) });
  cache.gc();
};

/** Append a newly created layer to the experiment's cached `layers`. */
export const appendLayer = (
  cache: ApolloCache<unknown>,
  experimentId: string,
  layer: { __typename?: string; id: string } | null | undefined,
): boolean => {
  if (!layer?.__typename) return false;
  const layerRef = cache.identify({ __typename: layer.__typename, id: layer.id });
  const experimentRef = cache.identify({ __typename: "Experiment", id: experimentId });
  if (!layerRef || !experimentRef) return false;
  return cache.modify({
    id: experimentRef,
    fields: {
      layers(existing) {
        const list = (existing ?? []) as readonly Reference[];
        const ref: Reference = { __ref: layerRef };
        return hasRef(list, ref) ? list : [...list, ref];
      },
    },
  });
};

/**
 * The experiment's default collection, from the cache. Null before the first
 * draw has minted it.
 */
export const defaultCollectionId = (
  cache: ApolloCache<unknown>,
  experimentId: string,
): string | null =>
  cache.readFragment<ExpDefaultAnnotationCollectionFragment>({
    id: cache.identify({ __typename: "Experiment", id: experimentId }),
    fragment: ExpDefaultAnnotationCollectionFragmentDoc,
  })?.annotationCollection?.id ?? null;
