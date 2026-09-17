import { useMemo, useRef } from "react";
import * as THREE from "three";

import { resolveCollectionMatrix } from "../model/collectionPlacement";
import { sceneZExtent } from "../coords/worldTransform";
import type { LayerState } from "../stores/sceneStore";

/**
 * The VALUE-stable placement matrix, and its cached inverse.
 *
 * Value-stable is the whole point: the memo's inputs churn identity on
 * unrelated store writes, so a recompute landing on the same placement must
 * return the SAME `Matrix4`. Downstream keys on it, and a fresh-but-equal
 * instance used to rebuild the whole manager and refetch every cell.
 *
 * The layer's PLACEMENT (`asAffine`, and the `pathToWorld` it was composed
 * from) is all `resolveCollectionMatrix` reads from the layer
 * (`collectionPlacement.ts`). Depending on the whole `layer` re-composed the
 * transform chain on every `patchSceneLayer` tick — an opacity drag included.
 *
 * The inverse is maintained unconditionally: one 4×4 invert per REAL placement
 * change, which is what keeps the mesh pick path off a per-event invert.
 * (The network layer has no picking and simply ignores it.)
 */
export function useCollectionPlacement(
  layer: { pathToWorld?: unknown; asAffine?: unknown },
  collection: Parameters<typeof resolveCollectionMatrix>[1],
  transformContext: Parameters<typeof resolveCollectionMatrix>[2],
): { matrix: THREE.Matrix4; inverse: THREE.Matrix4 } {
  const matrixRef = useRef<THREE.Matrix4 | null>(null);
  const inverseRef = useRef<THREE.Matrix4>(new THREE.Matrix4());

  const matrix = useMemo(() => {
    const next = resolveCollectionMatrix(
      layer as Parameters<typeof resolveCollectionMatrix>[0],
      collection,
      transformContext,
    );
    if (matrixRef.current?.equals(next)) return matrixRef.current;
    matrixRef.current = next;
    inverseRef.current.copy(next).invert();
    return next;
    // `asAffine` is what the resolver actually READS; `pathToWorld` only
    // identifies the path it was composed from. They move together for a
    // server re-placement, but a placement PREVIEW (COORDINATE_SYSTEMS.md §1
    // R1a) rewrites `asAffine` alone — keyed on the path, the mesh would sit
    // still while every other layer kind followed the preview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer.pathToWorld, layer.asAffine, collection, transformContext]);

  return { matrix, inverse: inverseRef.current };
}

/**
 * How thick the 2D slab is, in world units.
 *
 * The finest image layer's z-step, so a collection clips to the same slice the
 * picture shows. A scene with no image falls back to one collection voxel —
 * the placement matrix's z basis length — which is the only intrinsic length a
 * collection has.
 *
 * `layers` must be read with a PRIMITIVE selector by the caller: the array
 * churns identity on every brick-layer LOD write, while the step it yields is
 * a number.
 */
export const collectionSlabThickness = (
  slabStep: number | undefined,
  matrix: THREE.Matrix4,
  slabScale: number | null | undefined,
): number => {
  const base =
    slabStep && Number.isFinite(slabStep)
      ? slabStep
      : Math.max(new THREE.Vector3().setFromMatrixColumn(matrix, 2).length(), 1e-3);
  return base * (slabScale ?? 1);
};

/** The primitive selector the caller passes to its scene store. */
export const selectSlabStep = (state: { layers: LayerState[] }): number | undefined =>
  sceneZExtent(state.layers)?.step;
