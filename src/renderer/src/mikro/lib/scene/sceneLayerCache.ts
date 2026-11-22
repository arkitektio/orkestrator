import { isReference, type ApolloCache, type Reference } from "@apollo/client";
import { type SceneLayerFragment } from "@/mikro/api/graphql";

/**
 * A scene's layers are fetched once, with the scene (`GetScene`), and never
 * refetched for a layer coming or going. Every change is written into the
 * cached scene here instead:
 *
 *  - our own creates and deletes, from the mutation's answer (`intoScene`,
 *    `outOfScene`), and
 *  - everybody's, ours included, from the scene's layer subscription
 *    (`useLiveScene`), which carries the whole layer.
 *
 * An edit needs nothing: the layer is normalized, so the answer of an
 * `Update*Layer` (or the subscription's `update`) replaces it in place. The
 * scene view reconciles its stores whenever the cached scene changes, so a
 * layer written here appears exactly as one a refetch would have brought.
 *
 * Both paths can report the same change (the subscription hears our own
 * create back), so every write is idempotent.
 */

const sceneRef = (cache: ApolloCache<unknown>, sceneId: string): string | undefined =>
  cache.identify({ __typename: "Scene", id: sceneId });

/**
 * Add a layer to its scene's cached layers, once. The layer itself is already
 * in the cache — Apollo writes a mutation's or a subscription's answer before
 * anything reads it — so this only links it into the scene. (Writing `layer`
 * again would put back whatever an edit since its create changed.)
 */
export function addSceneLayer(
  cache: ApolloCache<unknown>,
  sceneId: string,
  layer: Pick<SceneLayerFragment, "__typename" | "id">,
): void {
  const id = cache.identify(layer);
  if (!id) return;
  const ref: Reference = { __ref: id };
  cache.modify({
    id: sceneRef(cache, sceneId),
    fields: {
      layers: (existing) =>
        Array.isArray(existing) && !existing.some((entry) => isReference(entry) && entry.__ref === id)
          ? [...existing, ref]
          : existing,
    },
  });
}

/** Drop a layer from its scene's cached layers, and the layer itself. */
export function removeSceneLayer(cache: ApolloCache<unknown>, sceneId: string, layerId: string): void {
  let removed: string | undefined;
  cache.modify({
    id: sceneRef(cache, sceneId),
    fields: {
      layers: (existing, { readField }) => {
        if (!Array.isArray(existing)) return existing;
        const entry = existing.find((candidate) => isReference(candidate) && readField("id", candidate) === layerId);
        if (!isReference(entry)) return existing;
        removed = entry.__ref;
        return existing.filter((candidate) => candidate !== entry);
      },
    },
  });
  if (removed) {
    cache.evict({ id: removed });
    cache.gc();
  }
}

/** The one layer a `Create*Layer` mutation answers with, under whatever its field is called. */
export const createdLayer = (data: unknown): SceneLayerFragment | null => {
  if (!data || typeof data !== "object") return null;
  const [answered] = Object.values(data);
  if (!answered || typeof answered !== "object" || !("id" in answered) || !("__typename" in answered)) return null;
  return answered as SceneLayerFragment;
};

/**
 * Mutation options for a layer create: the answered layer goes into the
 * scene's cached layers, so the scene shows it without refetching itself.
 */
export const intoScene = (sceneId: string) => ({
  update: (cache: ApolloCache<unknown>, { data }: { data?: unknown }) => {
    const layer = createdLayer(data);
    if (layer) addSceneLayer(cache, sceneId, layer);
  },
});

/** Mutation options for `DeleteLayer`: the layer leaves the scene's cached layers. */
export const outOfScene = (sceneId: string, layerId: string) => ({
  update: (cache: ApolloCache<unknown>) => removeSceneLayer(cache, sceneId, layerId),
});
