import type { ApolloClient } from "@apollo/client";
import type { Structure } from "@/core/types";
import { ReturnedSceneAnnotationsDocument } from "@/mikro/api/graphql";
import { upsertSceneAnnotation } from "@/mikro/lib/annotations/annotationCache";

const ANNOTATION = "@mikro/annotation";

/** The annotations among a run's results, by id, once each. */
export const returnedAnnotationIds = (results: readonly Structure[]): string[] => [
  ...new Set(results.filter((result) => result.identifier === ANNOTATION).map((result) => result.id)),
];

/**
 * Show the shapes a run handed back: fetch exactly those, and put each into
 * its collection's cached list (`upsertSceneAnnotation`), where the layer that
 * draws the collection reads it. A collection nothing draws yet is left alone;
 * its first fetch carries the shape.
 */
export const showReturnedAnnotations = async (client: ApolloClient<unknown>, ids: readonly string[]): Promise<void> => {
  if (ids.length === 0) return;
  const { data } = await client.query({
    query: ReturnedSceneAnnotationsDocument,
    variables: { ids: [...ids] },
    fetchPolicy: "network-only",
  });
  for (const annotation of data.annotations) {
    upsertSceneAnnotation(client.cache, annotation.collection.id, annotation);
  }
};
