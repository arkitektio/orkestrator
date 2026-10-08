import { isReference, type ApolloCache } from "@apollo/client";
import {
  GetSceneAnnotationsDocument,
  type GetSceneAnnotationsQuery,
  type GetSceneAnnotationsQueryVariables,
  type SceneAnnotationFragment,
} from "@/mikro/api/graphql";

/**
 * The scene's annotation list is fetched ONCE per collection and never
 * polled. Everything that changes it afterwards is written into that one
 * cache entry here:
 *
 *  - our own draw / delete, from the mutation's answer
 *    (`useCreateSceneAnnotation`, `useDeleteSelectedRois`), and
 *  - everybody else's, from the collection's subscription while its layer is
 *    set to "live" (`useLiveSceneAnnotations`).
 *
 * Both paths can report the same change (a live layer hears its own draw
 * back), so every write is idempotent.
 */

/**
 * THE variables of a collection's list. The renderer, the layer card and the
 * annotations panel must all go through this: a differing key (a pagination,
 * an extra filter) would be a second cache entry the writes below never reach.
 */
export const sceneAnnotationsVariables = (
  collectionId: string,
): GetSceneAnnotationsQueryVariables => ({ filters: { collection: collectionId } });

/** Add a shape to its collection's list, or replace it when already there. */
export function upsertSceneAnnotation(
  cache: ApolloCache<unknown>,
  collectionId: string,
  annotation: SceneAnnotationFragment,
): void {
  cache.updateQuery<GetSceneAnnotationsQuery, GetSceneAnnotationsQueryVariables>(
    { query: GetSceneAnnotationsDocument, variables: sceneAnnotationsVariables(collectionId) },
    (data) => {
      // Never loaded: nothing draws it yet, and its first fetch carries the shape.
      if (!data) return undefined;
      const index = data.annotations.findIndex((entry) => entry.id === annotation.id);
      const annotations =
        index === -1
          ? [...data.annotations, annotation]
          : data.annotations.map((entry, at) => (at === index ? annotation : entry));
      return { ...data, annotations };
    },
  );
}

/**
 * Drop a deleted shape from every `annotations` list that holds it (whatever
 * its variables — the browse list too) and from the cache itself.
 */
export function removeSceneAnnotation(cache: ApolloCache<unknown>, annotationId: string): void {
  const cacheId = cache.identify({ __typename: "Annotation", id: annotationId });
  if (!cacheId) return;
  cache.modify({
    fields: {
      annotations: (existing) =>
        Array.isArray(existing)
          ? existing.filter((entry) => !(isReference(entry) && entry.__ref === cacheId))
          : existing,
    },
  });
  cache.evict({ id: cacheId });
}
