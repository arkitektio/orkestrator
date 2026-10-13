import { useMemo } from "react";
import {
  useGetSceneAnnotationsQuery,
  type SceneAnnotationFragment,
} from "@/mikro/api/graphql";
import { sceneAnnotationsVariables } from "../../../../lib/annotations/annotationCache";

/**
 * The one place a vertex changes component order.
 *
 * The server stores a vertex over its collection's axes IN AXIS ORDER, and
 * mikro writes spatial axes with x last — `(z, y, x)`, `(y, x)`. So a stored
 * vertex is `[z, y, x]` (or `[y, x]` on a plane), and that is what every other
 * client and the server's own box maths read: a crop cut to an annotation takes
 * component 0 as the first spanned axis.
 *
 * The scene works in `[x, y, z]` everywhere — three.js, the collection matrix
 * (`resolveCollectionMatrix`), the selection store. So the scene never reads
 * `annotation.vectors` off the cache directly and never sends its own triples:
 * lists come in through `useSceneAnnotations` / `inSceneOrder`, vertices go
 * out through `toStoredVector`. The Apollo cache keeps the stored order, which
 * the chart reads as it is.
 */

/** A stored vertex (`[z, y, x]`, `[y, x]`) as the scene's `[x, y, z]`; a missing z stays missing. */
export const toSceneVector = (stored: readonly number[]): number[] => [...stored].reverse();

/**
 * A scene `[x, y, z]` vertex as the collection stores it: one component per
 * spatial axis of the drawing space (`spaceRank`, 1..3), back to front.
 */
export const toStoredVector = (
  scene: readonly [number, number, number],
  spaceRank: number,
): number[] => scene.slice(0, Math.min(Math.max(spaceRank, 1), 3)).reverse();

const IN_SCENE_ORDER = new WeakMap<object, unknown>();

/**
 * An annotation with its vertices in scene order. One answer per cache object,
 * so everything keyed by annotation identity downstream (`placeAnnotations`)
 * still skips what did not change.
 */
export function inSceneOrder<A extends { vectors?: readonly (readonly number[])[] | null }>(
  annotation: A,
): A {
  const known = IN_SCENE_ORDER.get(annotation) as A | undefined;
  if (known) return known;
  const ordered = { ...annotation, vectors: (annotation.vectors ?? []).map(toSceneVector) };
  IN_SCENE_ORDER.set(annotation, ordered);
  // Its own answer, so handing an ordered annotation back in cannot flip it twice.
  IN_SCENE_ORDER.set(ordered, ordered);
  return ordered;
}

/**
 * A collection's annotations for the scene: THE cache entry every draw, delete
 * and live event is written into (`annotationCache.ts`), read in scene order.
 * Undefined until loaded, or while `collectionId` is.
 */
export const useSceneAnnotations = (
  collectionId: string | null | undefined,
): readonly SceneAnnotationFragment[] | undefined => {
  const { data } = useGetSceneAnnotationsQuery({
    variables: sceneAnnotationsVariables(collectionId ?? ""),
    skip: !collectionId,
  });
  const stored = data?.annotations;
  return useMemo(() => stored?.map(inSceneOrder), [stored]);
};
