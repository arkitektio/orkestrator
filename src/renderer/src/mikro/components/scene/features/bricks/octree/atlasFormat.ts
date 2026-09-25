import { hasPhasorSlabs, type LayerLevelGeometry } from "../../../platform/coords/levelGeometry";
import type { BrickSpec } from "./brickSpec";

/**
 * Atlas storage format for a layer's dtype — pure planning knowledge, shared
 * by pool viability math (core) and the GPU atlas itself (render). Lives in
 * core so planning never imports GPU code.
 */

/**
 * `rgba8`: FOUR channel slabs per texel (`.rgba`) instead of z-stacked — the
 * atlas for 3/4-channel uint8 pools (an RGB image), so an rgb layer samples
 * ONE texel per step instead of three (see `atlasChannelsPerTexel`).
 */
export type AtlasKind = "r8" | "r16f" | "r32f" | "rgba8";

/** R16F atlases store `raw / R16F_DATA_SCALE`; the shader multiplies back
 * through `uAtlasScale` (= this), exactly like the R8 path's 255. */
export const R16F_DATA_SCALE = 65535;

/**
 * R16F atlases for unsigned-16-bit INTENSITY data (roadmap R3): stored as
 * `raw / 65535` half floats with `dataScale = 65535`, halving those pools'
 * atlas bytes (and doubling their slot budgets). See halfFloat.ts for the
 * precision analysis. A module flag rather than a localStorage read at every
 * call site: `atlasKindForGeometry` runs inside the PURE planner
 * (nodePlanning), which must not touch browser globals — the render side
 * initializes the flag once from `orkestrator.r16Atlas` (default ON).
 */

/**
 * RGBA8 atlases for 3/4-channel unsigned-8-bit intensity pools (an RGB
 * image): channels interleaved in one texel instead of z-stacked slabs, so
 * a sample is ONE tap. Same module-flag pattern as R16F (planner-pure).
 * Was a kill switch; settled ON (OCTREE_RENDERER.md §6.9); pool-creation time.
 */

/**
 * raw16 chunks (roadmap C3): uint16 chunks stay `Uint16Array` end-to-end —
 * decode cache, repack input, GPU-repack upload — instead of being widened to
 * Float32Array in the codec worker, halving those bytes. An ARRAY-level
 * decision (dtype alone), NOT per pool: the decoded-chunk cache and the
 * in-flight fetch keys carry no representation component, so every consumer
 * of one array must agree on the chunk representation. Consumers are audited
 * for Uint16Array reads: CPU repack (generic element loops), the GPU repack's
 * u16 kernel (r32f/f32 GPU kernels reject u16 chunks and fall back to the CPU
 * repack), and the chunk-cache probes (generic reads, raw values per P11).
 * Was `orkestrator.raw16`, shipped dark; settled ON (OCTREE_RENDERER.md §6.9).
 * Note what settling it changed beyond bytes: `decodedBytesPerVoxel` charges
 * uint16 at 2 B/voxel rather than the widened 4, which deliberately moves
 * `budgetMinLevel` FINER on uint16 pyramids — the same cache now holds twice
 * the working set.
 */

/** True when this dtype's chunks arrive as `Uint16Array` rather than widened. */
export const isRaw16Dtype = (dtype: string): boolean => {
  const d = dtype.toLowerCase();
  return d === "uint16" || d.includes("u2");
};

/**
 * The fidelity the scene requests from `getChunkWorker` for an array of this
 * dtype — 'raw16' for uint16 when the flag is on, 'default' otherwise. ONE
 * call site rule: every scene fetch of pixel chunks must go through this, or
 * the shared chunk cache holds mixed representations for one array.
 */
export const chunkFidelityForDtype = (dtype: string): "default" | "raw16" =>
  isRaw16Dtype(dtype) ? "raw16" : "default";

/**
 * DECODE-cache bytes per voxel for a dtype — the planner's budget currency
 * (chunk-aligned decoded bytes, P5/P24), which must track the codec worker's
 * actual output representation: uint8 stays 1 B, uint16 is 2 B under raw16
 * and 4 B (widened) otherwise, everything else 4 B. Moving uint16 from 4 → 2
 * deliberately moves `budgetMinLevel` finer on uint16 pyramids: the same
 * cache holds twice the working set.
 */
export const decodedBytesPerVoxel = (dtype: string): number => {
  const d = dtype.toLowerCase();
  if (d.includes("u1") || d.includes("i1") || d.includes("8")) return 1;
  if (isRaw16Dtype(d)) return 2;
  return 4;
};

/**
 * This MUST mirror the codec worker's DEFAULT-fidelity promotion
 * (`lib/zarr/runner/codec-worker.ts` `promoteChunkForTexture`): only
 * **unsigned 8-bit** stays a `Uint8Array` and uses an `R8` atlas; **every
 * other dtype is promoted to `Float32Array`** and uses `R32F` — except
 * unsigned 16-bit with `allowHalf`, which the REPACK re-encodes to half
 * floats for an `R16F` atlas (the promoted float32 chunks are unchanged; the
 * conversion happens brick-side, so the worker lockstep is preserved). In
 * particular `int8`/`int16`/`uint32` all stay float32 — an earlier
 * `dtype.includes("8")` test wrongly routed `int8` (a signed,
 * possibly-negative Float32Array) into a Uint8 R8 atlas, wrapping/
 * truncating its values; signed 16-bit similarly cannot ride the
 * multiply-only `uAtlasScale` rescale and stays R32F.
 *
 * The scene requests fidelity through `chunkFidelityForDtype` only: 'default'
 * promotion, or 'raw16' (uint16 stays Uint16Array, RAW values) under the
 * `orkestrator.raw16` flag — which changes the CHUNK representation but not
 * the atlas kind (the repack widens/encodes brick-side either way). The
 * per-chunk-normalized 'low'/'high' fidelities would break this decision AND
 * multi-chunk normalization; `getChunkWorker` refuses them — keep the
 * promotion table and this function in lockstep.
 */
export const atlasKindForDtype = (dtype: string, allowHalf = false): AtlasKind => {
  const d = dtype.toLowerCase();
  // Canonical "uint8" contains no "u1"; numpy-style unsigned 8-bit is "|u1".
  const isUnsigned8 = d === "uint8" || d === "uint8clamped" || d.includes("u1");
  if (isUnsigned8) return "r8";
  const isUnsigned16 = d === "uint16" || d.includes("u2");
  if (isUnsigned16 && allowHalf) return "r16f";
  return "r32f";
};

/**
 * Atlas kind for a whole layer geometry: a phasor layer's slabs are derived
 * (g, s ∈ [-1, 1] and a mean photon count), so its atlas is float regardless
 * of the source dtype; a layer with EXACT-value semantics (label ids —
 * `geometry.exactValues`) never uses R16F, whose 11-bit significand would
 * corrupt ids above 2048; everything else keys off the base level's dtype
 * with R16F allowed for unsigned 16-bit intensities.
 *
 * This is the SINGLE source of truth for slot sizing — the planner's byte
 * accounting (`planLayerNodes`) and the pool's atlas allocation
 * (`ensurePool`) must both use it. When they disagreed (planner sized a
 * uint8 phasor layer at 1 B/voxel, pool allocated r32f), the plan requested
 * ~4× the slots that existed — guaranteed acquire failures at full
 * refinement.
 */
export const atlasKindForGeometry = (geometry: LayerLevelGeometry): AtlasKind => {
  if (hasPhasorSlabs(geometry)) return "r32f";
  const kind = atlasKindForDtype(
    geometry.levels[0].dtype,
    !geometry.exactValues,
  );
  // CONTENT-based, not renderKind-based: an intensity layer over the same
  // 3-channel array shares the pool (the tap selects the component), so the
  // pool key needs no new field — the kind is a function of already-keyed
  // fields plus the creation-time flag, exactly like r16f.
  if (
    kind === "r8" &&
    !geometry.exactValues &&
    (geometry.channelSlabCount === 3 || geometry.channelSlabCount === 4) &&
    geometry.channelCount === geometry.channelSlabCount
  ) {
    return "rgba8";
  }
  return kind;
};

/** Channel slabs packed into ONE texel: 4 for rgba8, 1 otherwise. */
export const atlasChannelsPerTexel = (kind: AtlasKind): number => (kind === "rgba8" ? 4 : 1);

/** Bytes per stored TEXEL for an atlas kind (an rgba8 texel is four slabs). */
export const atlasBytesPerVoxel = (kind: AtlasKind): number =>
  kind === "r8" ? 1 : kind === "r16f" ? 2 : 4;

/** Depth of one atlas slot in texels: the channel slabs stacked along z,
 * `channelsPerTexel` of them sharing each texel. */
export const atlasSlotDepth = (spec: BrickSpec, kind: AtlasKind): number =>
  spec.stored[2] * Math.ceil(spec.channelCount / atlasChannelsPerTexel(kind));

/**
 * Bytes one atlas slot occupies — THE slot-size function. The planner's byte
 * accounting (`planLayerNodes`, the plan tracker, pool viability) and the
 * pool's allocation (`ensurePool`, `pending.bytes`) must all use it: when
 * they disagreed (planner sized a uint8 phasor layer at 1 B/voxel, pool
 * allocated r32f) plans requested ~4× the slots that existed.
 */
export const atlasSlotBytes = (spec: BrickSpec, kind: AtlasKind): number =>
  spec.stored[0] * spec.stored[1] * atlasSlotDepth(spec, kind) * atlasBytesPerVoxel(kind);
