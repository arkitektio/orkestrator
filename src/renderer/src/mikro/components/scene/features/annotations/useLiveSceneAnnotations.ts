import { useEffect } from "react";
import { useMikro } from "@/mikro/api/funcs";
import {
  GetSceneAnnotationsDocument,
  useWatchSceneAnnotationsSubscription,
} from "@/mikro/api/graphql";
import {
  removeSceneAnnotation,
  sceneAnnotationsVariables,
  upsertSceneAnnotation,
} from "./annotationCache";

/**
 * Follow one collection while its layer is set to "live": every shape drawn,
 * edited or deleted by anybody is written into the collection's list
 * (`annotationCache.ts`), which the canvas, the card and the panel all read.
 *
 * Mount it only for a live layer — mounting IS going live. A layer that was
 * not listening has missed whatever happened meanwhile, so going live fetches
 * the list once to catch up; after that the subscription is the only traffic.
 */
export const useLiveSceneAnnotations = (collectionId: string): void => {
  const client = useMikro();

  useWatchSceneAnnotationsSubscription({
    variables: { collection: collectionId },
    onData: ({ client: { cache }, data }) => {
      const event = data.data?.annotations;
      if (!event) return;
      if (event.create) upsertSceneAnnotation(cache, collectionId, event.create);
      if (event.update) upsertSceneAnnotation(cache, collectionId, event.update);
      if (event.delete) removeSceneAnnotation(cache, event.delete);
    },
    onError: (error) => {
      console.error(`Live annotations of collection ${collectionId} failed:`, error);
    },
  });

  useEffect(() => {
    client
      .query({
        query: GetSceneAnnotationsDocument,
        variables: sceneAnnotationsVariables(collectionId),
        fetchPolicy: "network-only",
      })
      .catch((error) => {
        console.error(`Catching up on collection ${collectionId} failed:`, error);
      });
  }, [client, collectionId]);
};
