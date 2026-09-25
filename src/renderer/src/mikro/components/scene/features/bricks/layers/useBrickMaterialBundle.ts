/* eslint-disable react-hooks/immutability --
 * Driving TSL UNIFORM NODES is this module's whole job, and a uniform node is a
 * deliberately mutable handle into an already-compiled shader graph — writing
 * `.value` is how a frame's data reaches the GPU without rebuilding the
 * material. The rule reads that as mutating a hook argument; treating these as
 * React state instead would mean recompiling the shader on every change, which
 * is exactly what the uniform-push contract exists to avoid. */
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";

/**
 * The material bundle for a brick layer: built once per pool STRUCTURE, seeded
 * with the base shape, and disposed with the pool it was built for.
 *
 * All four brick layer components had this same block. The `uBaseShape` seeding
 * in particular is not optional and not obvious — the traversal reads it to map
 * a fragment to a base voxel, and a material built without it silently samples
 * a 1×1×1 volume — so it is done here rather than trusted to four call sites.
 *
 * `extraDispose` exists because the payload legitimately differs: the intensity
 * materials own a colormap atlas and two params textures that must be released
 * with them, while a label material owns nothing beyond its own LUT (which
 * `setLabelColorLut` already manages). Rather than force one shape, the caller
 * says what else is its’.
 *
 * `variantKey` is the second rebuild trigger, and it is not optional where it
 * applies. A material is specialised at BUILD time — on the kill switch and on
 * the layer's `renderKind` — and both can change while a pool lives: an edit
 * that adds a transfer curve demotes a layer from the fixed-shape path to the
 * general one, and the compiled shader cannot express the new shape. Keying the
 * memo on the variant is what makes that demotion a REBUILD rather than a
 * silently-wrong picture.
 */
export const useBrickMaterialBundle = <
  T extends {
    material: { dispose(): void };
    /** Every brick material exposes this; the traversal reads it to map a
     * fragment to a base voxel. */
    nodes: { uBaseShape: { value: { set(x: number, y: number, z: number): void } } };
  },
>(
  pool: { geometry: { levels: readonly { spatialShape: readonly number[] }[] }; structureSignature: string } | null,
  create: (pool: never) => T,
  extraDispose?: (bundle: T) => void,
  /** Anything the BUILD specialised on. Changing it rebuilds the material. */
  variantKey: string = "",
): T | null => {
  const bundle = useMemo(() => {
    if (!pool) return null;
    const created = create(pool as never);
    const shape = pool.geometry.levels[0].spatialShape;
    created.nodes.uBaseShape.value.set(shape[0], shape[1], shape[2]);
    return created;
    // Rebuilt only when the pool's STRUCTURE changes — the mesh remounts on that
    // same key, so the material and the geometry never disagree. Everything
    // dynamic flows through the uniform nodes instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, pool?.structureSignature, variantKey]);

  useEffect(() => {
    if (!bundle) return;
    return () => {
      bundle.material.dispose();
      extraDispose?.(bundle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle]);

  return bundle;
};

/**
 * The two traversal uniforms a 2D brick PLANE pushes, for either material.
 *
 * Thin on purpose — it is only `uDesiredLevel` and `uSlabBaseZ` — but those two
 * ARE the plane's contract with `emitResolveBrickResidency`, and the `slabZ`
 * rule they carry (see `slabBaseZOf`) is one the planner has to agree with. The
 * 3D pair is `useVolumeRayUniforms`; this is its sibling, and having both means
 * neither material hand-writes the contract.
 *
 * Material-SPECIFIC pushes (channel data, label data, the pool's value range)
 * stay with their components — those genuinely differ.
 */
export const usePlaneTraversalUniforms = (
  nodes: { uDesiredLevel: { value: number }; uSlabBaseZ: { value: number } } | undefined,
  { desiredLevel, slabBaseZ }: { desiredLevel: number | undefined; slabBaseZ: number },
): void => {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (!nodes || desiredLevel === undefined) return;
    nodes.uDesiredLevel.value = desiredLevel;
    nodes.uSlabBaseZ.value = slabBaseZ;
    // Demand frameloop: a plan-only change (new target level / slab with no
    // residency churn) must request its own frame — its 3D sibling
    // (useVolumeRayUniforms) has always done so.
    invalidate();
  }, [nodes, desiredLevel, slabBaseZ, invalidate]);
};
