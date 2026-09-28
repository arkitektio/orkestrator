import type { BrickSpec } from "./brickSpec";
import type { LayerLevelGeometry, LevelSource } from "../../../platform/coords/levelGeometry";

/**
 * Content address of a brick pool: everything that determines what a brick slot
 * HOLDS, and nothing that determines how it is DRAWN.
 *
 * Pools used to be keyed by layer id, which meant N layers over the same image
 * each allocated their own atlas and independently fetched, repacked and
 * uploaded the identical voxels. The common multi-channel setup — one layer per
 * channel, differing only in colormap and contrast — therefore paid 4× the VRAM
 * (atlas + its CPU mirror), 4× the network and 4× the GPU repack for one
 * dataset. Keying by content collapses that to one pool with N members.
 *
 * WHAT BELONGS IN THE KEY
 *
 * - `mode`, brick `spec`, and each level's `{shape, chunks, dtype, storeId}`:
 *   the data itself plus the slot geometry it is packed into.
 * - `slabs`: what each z-stacked slab in a slot holds. Two layers can agree on
 *   slab COUNT and disagree on content (a phasor node's harmonic, or which
 *   channel it counts), which would silently share bricks holding different
 *   values. `sliceSignature` happens to cover this today; keying it explicitly
 *   means a future slab source cannot quietly break the invariant.
 * - `sliceSignature`: axis mapping, lens slices and the scene-wide dim-slider
 *   selections — exactly the inputs of `computeFixedIndices`. This is why the
 *   pool's `fixedChunkCoords`/`fixedOffsets` need no key field of their own:
 *   same level chunking (already keyed) + same slice signature ⇒ same fixed
 *   indices. `BrickResidencyManager` asserts that in dev when a layer joins.
 * - `dataRange`: MANDATORY, and the subtlest entry. EMPTY (uniform) bricks are
 *   page-mapped with their value QUANTIZED against the pool's `[min,max]` —
 *   see `encodeEmptyValue`. Two layers with different ranges sharing one page
 *   table would decode each other's uniform bricks at the wrong intensity.
 * - `valueSemantics`: what a slot's contents MEAN — an intensity to normalize,
 *   or a discrete object id. It decides the EMPTY code width (8 bits for an
 *   intensity, 24 for an id — see `EmptyValueBits`), so two pools that differ on
 *   it would read each other's page entries with the wrong channel weights. It
 *   is a second, explicit guard rather than the only one: a label's `dataRange`
 *   is `[0, 2^24-1]` whatever its dtype, which already cannot collide with an
 *   image's dtype or histogram range. Keyed anyway, because "these bricks are
 *   ids" is the fact the shader branches on, and a fact the key states is a fact
 *   a future range change cannot quietly unstate.
 *
 * WHAT DOES NOT, AND WHY
 *
 * - Per-layer contrast (`climMin`/`climMax`), colormap, gamma, blend, opacity,
 *   projection, visibility, transform: all shader-side, applied from the
 *   layer's own uniforms against the shared atlas. This is precisely what lets
 *   one-layer-per-channel share a pool.
 * - `autoRange`: it is derived as `(dtype is float) && no server histogram`.
 *   `dtype` is keyed, and "no server histogram" is what makes the range fall
 *   back to the dtype's — which is keyed as `dataRange`. So layers that match
 *   on this key necessarily agree on `autoRange`, and when it is true the
 *   shared pool's running range converges on the union over the same bricks
 *   each member would have accumulated alone, only sooner. Splitting on it
 *   would be dead weight. (`poolKey.test.ts` pins this reasoning.)
 *
 * The same builder is called by `brickResidency` (to key pools) and
 * `nodePlanTracker` (to count distinct pools for the byte budget). They MUST
 * agree: if the planner divides the budget by a different number than the pool
 * allocator does, plans request more slots than the atlas holds.
 */
export type PoolKeyInput = {
  mode: "2D" | "3D";
  spec: BrickSpec;
  geometry: LayerLevelGeometry;
  levels: readonly LevelSource[];
  sliceSignature: string;
  /** `resolveLayerDataRange(layer, dtype)` — raw value space. */
  dataRange: readonly [number, number];
  /** What a slot's contents mean. See the note above. */
  valueSemantics: "intensity" | "labelIds";
};

/**
 * What a pool's brick contents MEAN, from the layer that wants them.
 *
 * Shared by the residency manager (which keys and allocates pools) and the node
 * planner (which counts them for the byte budget) — the two must agree on the
 * key or the planner divides the budget by a different number of pools than the
 * allocator makes, and plans request slots that do not exist.
 */
export const poolValueSemantics = (layer: {
  __typename?: string;
}): "intensity" | "labelIds" =>
  layer.__typename === "LabelLayer" ? "labelIds" : "intensity";

export function buildPoolKey(input: PoolKeyInput): string {
  const { mode, spec, geometry, levels, sliceSignature, dataRange, valueSemantics } = input;
  return JSON.stringify({
    mode,
    payload: spec.payload,
    border: spec.border,
    channels: spec.channelCount,
    slabs: geometry.slabs,
    levels: levels.map((level) => ({
      shape: level.shape,
      chunks: level.chunks,
      dtype: level.dtype,
      storeId: level.storeId,
    })),
    sliceSignature,
    dataRange: [dataRange[0], dataRange[1]],
    valueSemantics,
  });
}

/**
 * The structural half of the key — data identity and slot geometry, with no
 * per-view selection. `BrickResidencyManager` keeps this separately so it can
 * tell a pool that must be REBUILT (structure changed: different image, dtype
 * or brick spec) from one that can be FLUSHED in place (same structure, new
 * slice) — the latter reuses the atlas allocation instead of reallocating it.
 */
export function buildStructureSignature(
  input: Pick<PoolKeyInput, "mode" | "spec" | "geometry" | "levels">,
): string {
  const { mode, spec, geometry, levels } = input;
  return JSON.stringify({
    mode,
    payload: spec.payload,
    border: spec.border,
    channels: spec.channelCount,
    slabs: geometry.slabs,
    levels: levels.map((level) => ({
      shape: level.shape,
      chunks: level.chunks,
      dtype: level.dtype,
      storeId: level.storeId,
    })),
  });
}
