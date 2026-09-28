import * as THREE from "three";
import { buildSliceSignature } from "../../../platform/model/sliceSignature";
import {
  FRUSTUM_CULL_MARGIN,
  PREFETCH_MARGIN,
  expandVoxelRange,
} from "./viewportPlanning";
import { affineToMatrix4 } from "../../../platform/coords/worldTransform";
import type { LayerState } from "../../../platform/model/layerModel";
import type { LayerViewRange } from "../../../platform/visibility/visibility";
import { atlasKindForGeometry, atlasSlotBytes, decodedBytesPerVoxel } from "./atlasFormat";
import type { BrickSpec } from "./brickSpec";
import { resolveDecodeAllowanceBytes, resolveDecodeFloorBytes } from "./poolBudget";
import type { LayerLevelGeometry, LevelGeometry, Vec3 } from "../../../platform/coords/levelGeometry";
import {
  brickGridForLevel,
  childrenOf,
  chunksTouchingBrick,
  nodeBaseBox,
  nodeKey,
  totalBrickCount,
  type VoxelBox,
} from "./nodeAddress";

/**
 * Unified hierarchical node planner for the brick-pool renderer — the 3D
 * generalization of `planLayerChunks`, shared by both display modes (2D is
 * the single-slab / quadtree degenerate case).
 *
 * Roles are reduced to two because the shader falls back to coarser resident
 * bricks per sample: there are no "cover" chunks and no render feedback.
 *  - "target": fetch + protect from pool eviction
 *  - "keep":   the ancestor chain of every target, so a fallback is always
 *              resident. Protected AND fetched when missing — but a far
 *              keep dispatches after near targets (see compareFetchOrder)
 *
 * Traversal refines closest-first, so when the byte budget runs out it is
 * the distant regions that degrade to coarser bricks.
 */

export type PlannedNode = {
  key: string;
  level: number;
  coords: Vec3;
  role: "target" | "keep";
  /** Emission order within the plan (deterministic, near-first). */
  priority: number;
  /**
   * Foveated squared distance (base voxels²) from the plan focus to the
   * NEAREST point of the node's base box; xy-only in 2D (focus z is
   * mid-stack while nodes sit at slabZ, so a raw dz² would be constant
   * within a level but incomparable across levels). 0 = contains the focus.
   * Box distance is monotone under ancestry: an ancestor's box contains its
   * descendants', so ancestor score ≤ descendant score.
   */
  fetchScore: number;
  /**
   * 0 = rootLevel backdrop (few bricks — the shader's no-hole guarantee for
   * the whole view, always fetched first), 1 = overlaps the strict viewport,
   * 2 = margin-only prefetch (fetched last).
   */
  fetchBand: 0 | 1 | 2;
};

export type LayerNodePlan = {
  mode: "2D" | "3D";
  sliceSignature: string;
  /** Finest level the plan requests anywhere (the shader's ortho LOD hint). */
  targetLevel: number;
  /** Floor of FREE refinement — finer levels were decode-charged (hysteresis
   * feedback input, see PlanLayerNodesInput.previousBudgetMinLevel). */
  budgetMinLevel: number;
  /** Decoded chunk bytes charged for sub-floor refinement (debug only). */
  decodeBytesCharged: number;
  /**
   * Chunk-aligned decoded bytes the VISIBLE region implies at each level,
   * finest first — the exact quantity the budget floor compares against
   * `decodeFloorBytes`. Debug only.
   *
   * Exists because answering "why is level 0 never selected?" otherwise means
   * re-deriving this by hand from chunk shapes and view ranges. With it the
   * answer is one line: L0 needs X, the floor allows Y.
   */
  levelDecodeBytes: number[];
  /** The floor these were measured against (decode currency). Debug only. */
  decodeFloorBytes: number;
  /** Sub-floor allowance actually in force this plan. Debug only. */
  decodeAllowanceBytes: number;
  /**
   * GPU ATLAS SLOT bytes this plan was allowed (`maxPlanBytes`) and the part of
   * it refinement could actually spend (slot currency — the decode pair above
   * is the OTHER currency). Debug only, and for the same reason as
   * `levelDecodeBytes`: when refinement stalls, "the plan had one slot" is the
   * answer, and deriving it by hand means redoing the whole budget chain
   * (device share → pool split → live-atlas clamp → coarsest reserve).
   */
  planBudgetBytes: number;
  /** Slot bytes left for sub-coarsest nodes after the coarsest reservation.
   * 0 means NO refinement was possible at any zoom (P25). Debug only. */
  refineBudgetBytes: number;
  /** 2D only: base-voxel z of the displayed slab (null in 3D / no z axis). */
  slabZ: number | null;
  nodes: PlannedNode[];
  planBytes: number;
};

/**
 * The ONE 2D slab z-mapping convention: base slab z (an integer base-level
 * slice index) → level z voxel, by flooring the base-voxel position. Shared
 * verbatim by the planner (`resolveLevelZ`) and — reimplemented in TSL — the
 * plane shader (`brickNodeMaterials.ts` `makeSampleBrickEx` slab mode). The
 * two MUST agree per level or the shader looks up bricks the planner never
 * fetched (silent coarse fallback, zoom-dependent at non-integer z scales).
 */
export const slabLevelZ = (
  baseSlabZ: number,
  baseScaleZ: number,
  levelScaleZ: number,
): number => Math.floor((baseSlabZ * baseScaleZ) / levelScaleZ);

/**
 * Brick z of the slab `baseSlabZ + dz` at a level (the z±1 prefetch): null
 * when the neighbor slab is outside the base stack or the level does not
 * cover it (truncated pyramid, same drop-out rule as `resolveLevelZ`).
 * Composes `slabLevelZ` with the payload division so the prefetch targets
 * EXACTLY the brick the planner would fetch when the user scrubs there.
 */
export const adjacentSlabBrickZ = (
  baseSlabZ: number,
  dz: number,
  baseScaleZ: number,
  levelScaleZ: number,
  levelShapeZ: number,
  payloadZ: number,
  baseShapeZ: number,
): number | null => {
  const neighborBase = baseSlabZ + dz;
  if (neighborBase < 0 || neighborBase > baseShapeZ - 1) return null;
  const levelZ = slabLevelZ(neighborBase, baseScaleZ, levelScaleZ);
  if (levelZ < 0 || levelZ > levelShapeZ - 1) return null;
  return Math.floor(levelZ / payloadZ);
};

/**
 * Chunk coordinate of the selection `±delta` along a COLLAPSED dim (the t/τ
 * prefetch): null when the neighbor index is outside the dim, or falls in the
 * SAME chunk as the live selection (already fetched by the visible path —
 * nothing to warm).
 *
 * Key parity with the real post-step fetch is load-bearing: after a dim step,
 * `computeFixedIndices` derives `fixedChunkCoords[d]` from LEVEL-0 chunk
 * extents and `enumerateBrickChunkCoords` applies that value at every level —
 * so this helper must be fed level-0 chunking, or the warmed cache keys are
 * never the keys the flush's refetch asks for.
 */
export const adjacentSelectionChunk = (
  fixedChunkCoord: number,
  fixedOffset: number,
  chunkExtent0: number,
  dimExtent: number,
  delta: number,
): number | null => {
  const neighborIndex = fixedChunkCoord * chunkExtent0 + fixedOffset + delta;
  if (neighborIndex < 0 || neighborIndex > dimExtent - 1) return null;
  const neighborChunk = Math.floor(neighborIndex / chunkExtent0);
  return neighborChunk === fixedChunkCoord ? null : neighborChunk;
};

export type NodeCamera = {
  /** Camera frustum transformed into the layer's base-voxel frame. */
  voxelFrustum: THREE.Frustum;
  /** Camera position in base voxels — null for orthographic cameras. */
  voxelPosition: Vec3 | null;
  /** viewportHeight / (2·tan(fovY/2)): px per WORLD unit at world-distance 1
   * (a pure pixel focal length — affine-independent). */
  pxPerVoxelAtUnitDistance: number;
  /** Per-axis WORLD length of one base voxel (`voxelWorldSizeOf` of the
   * layer affine) — THE world-metric LOD input. Omitted/[1,1,1] = the
   * legacy voxel metric (identity reduction; how `orkestrator.worldLod`
   * off is expressed — the tracker passes [1,1,1]). */
  voxelWorldSize?: Vec3;
  /** Normalized view direction for the foveated ordering / aniso discount —
   * null for orthographic cameras or when it cannot be derived. IN SCORE
   * SPACE: the base-voxel direction scaled per axis by `voxelWorldSize` and
   * renormalized (≡ the plain voxel direction under the identity metric, ≡
   * the world direction for rotation-free affines) — it must live in the
   * same metric the score displacements are measured in, or every angle is
   * misread by the affine's condition number. */
  voxelViewDirection?: Vec3 | null;
};

export type PlanLayerNodesInput = {
  layer: LayerState;
  geometry: LayerLevelGeometry;
  spec: BrickSpec;
  mode: "2D" | "3D";
  viewRange: LayerViewRange | undefined;
  /** 3D only; null falls back to the orthographic footprint (viewRange.scale). */
  camera: NodeCamera | null;
  lodBias: number;
  currentZ: number | undefined;
  /** Scene-wide dim-slider selections (t, tau, …) — signature input only. */
  dimSelections?: Record<string, number>;
  /**
   * Slack in the 3D frustum test, as a fraction of each node's own extent —
   * the anti-flicker hysteresis band. Defaults to `FRUSTUM_CULL_MARGIN`; 0 is
   * the strict test. Injectable so the invariant that MATTERS can be asserted
   * directly: the strictly-visible set (bands 0 and 1) must not depend on this
   * value, or the margin has started crowding out visible bricks. See P26.
   */
  frustumCullMargin?: number;
  /** GPU ATLAS SLOT bytes the plan may spend. Slot currency only — see
   * `decodeFloorBytes` for the level floor, which is a different currency. */
  maxPlanBytes?: number;
  /**
   * DECODED-CHUNK bytes the budget floor may spend, i.e. the largest level
   * whose chunk-aligned visible set the pipeline is willing to pull.
   *
   * Split out of `maxPlanBytes` because that one number was being compared
   * against two incompatible things: the floor loop measures decoded zarr
   * chunks, while `refineBudgetBytes`/`planBytes`/atlas sizing measure GPU
   * atlas slots. Conflating them meant a level could be unlocked on a slot
   * budget the chunk cache could not feed — on plane-chunked pyramids, by
   * more than an order of magnitude. Defaults to `maxPlanBytes` so existing
   * callers and tests keep their exact behaviour.
   */
  decodeFloorBytes?: number;
  /**
   * This pool's share of the decoded-chunk cache. When given, the floor and the
   * sub-floor allowance are DERIVED from it (see `resolveDecodeFloorBytes` /
   * `resolveDecodeAllowanceBytes`), which is what keeps the coupling
   * `COARSE_CHAIN_RESERVE x floorLevel + allowance <= cacheShare` true — i.e.
   * any level the planner unlocks has a chunk working set the cache can hold.
   * Explicit `decodeFloorBytes` / `decodeAllowanceBytes` override it.
   */
  decodeCacheShareBytes?: number;
  /** Decoded-chunk byte allowance for refinement BELOW the budget floor.
   * 0 (default) disables sub-floor refinement — the legacy all-or-nothing
   * floor. See `resolveDecodeAllowanceBytes` (poolBudget.ts). */
  decodeAllowanceBytes?: number;
  /** Anisotropy-aware LOD criterion (`anisoEffectiveFactor`) — the caller
   * passes `isAnisoLodEnabled()`; false (default) = the legacy max rule. */
  anisoLod?: boolean;
  /** The previous plan's budgetMinLevel (budget-floor hysteresis input). */
  previousBudgetMinLevel?: number;
  /**
   * Keys of the previous plan's "keep" nodes — the nodes that were refined
   * last time. LOD hysteresis: such a node holds its refinement while its
   * footprint stays within 1/LOD_HYSTERESIS of the unlock threshold, so a
   * zoom resting at a level boundary no longer flips the plan every replan
   * (each flip aborted in-flight bricks, could trim every finer resident and
   * refetched them on the flip back — the oscillation brickResidency measured
   * at 13× fetch amplification). Per NODE, so it is exact in 3D perspective
   * where LOD is per node, and degenerates to the uniform case in 2D.
   */
  previousKeepKeys?: ReadonlySet<string>;
  /**
   * Motion ceiling: no node may refine to a level finer than this. The tracker
   * passes the previous plan's targetLevel while the camera is moving, so
   * coarsening stays immediate but refinement waits for the settle replan —
   * a quick zoom then fetches nothing at the intermediate levels its mid-
   * gesture replans would otherwise have queued (decodes are never aborted,
   * so those competed with the final bricks for worker and upload budget).
   * Undefined = no ceiling. Ignored under a pinned `fixedLOD`.
   */
  refineCeilingLevel?: number;
};

/**
 * How many times over the SPATIAL chunk volume a real fetch actually decodes.
 *
 * The spatial accounting below counts x/y/z voxels only, but the fetcher pulls
 * one chunk per (spatial, channel-chunk, phasor-chunk) combination, and every
 * chunk carries its full extent along the non-spatial axes too. On a 4-channel
 * layer chunked one channel per chunk that is a factor of 4 — the budget floor
 * and the sub-floor allowance were both under-charging by exactly that much.
 *
 * MUST mirror `BrickResidencyManager.enumerateBrickChunkCoords`, which is the
 * function that decides what is actually decoded. Keep the two in lockstep:
 *  - channels: `ceil(channelSlabCount / chunk[c])` chunks, each `chunk[c]` deep.
 *    Uses `channelSlabCount` (real channels), NOT `channelCount` (which also
 *    counts a phasor node's g/s/i slabs — those are derived by the repack, not
 *    fetched);
 *  - phasor: fetched WHOLE (every bin chunk), because the repack reduces the
 *    entire profile;
 *  - collapsed dims (t, tau, …): ONE chunk coordinate is fixed, but the whole
 *    chunk decodes, so its extent still multiplies.
 */
export function nonSpatialDecodeFactor(
  geometry: LayerLevelGeometry,
  level: LevelGeometry,
): number {
  const { xPos, yPos, zPos, intensityPos, phasorPos } = geometry.axes;

  const channelsPerChunk =
    intensityPos !== -1 ? Math.max(1, level.chunks[intensityPos] ?? 1) : 1;
  const channelChunks =
    intensityPos !== -1 ? Math.ceil(geometry.channelSlabCount / channelsPerChunk) : 1;

  const binsPerChunk = phasorPos !== -1 ? Math.max(1, level.chunks[phasorPos] ?? 1) : 1;
  const phasorChunks =
    phasorPos !== -1 && geometry.phasorBins > 0
      ? Math.ceil(geometry.phasorBins / binsPerChunk)
      : 1;

  let collapsed = 1;
  for (let d = 0; d < level.chunks.length; d++) {
    if (d === xPos || d === yPos || d === zPos) continue;
    if (d === intensityPos || d === phasorPos) continue;
    collapsed *= Math.max(1, level.chunks[d] ?? 1);
  }

  return channelChunks * channelsPerChunk * phasorChunks * binsPerChunk * collapsed;
}

/** Slack factor the budget floor tolerates to KEEP an already-unlocked finer
 * level (see budgetMinLevel hysteresis below). */
const BUDGET_FLOOR_HYSTERESIS = 1.15;

/** Slack factor a node that was refined in the previous plan tolerates before
 * it coarsens again (see `previousKeepKeys`). A genuine two-sided band, never a
 * ratchet: unlock needs the full `>= 1` footprint, hold needs `>= 1/1.15`. */
export const LOD_HYSTERESIS = 1.15;

// Scratch objects (single-threaded, one plan at a time).
const scratchBox = new THREE.Box3();

/** How much foveation penalizes off-axis nodes: at the view axis the score is
 * plain distance²; at 90° off-axis it is distance² × (1 + w)². */
export const FOVEA_WEIGHT = 1.5;

/** Floor of the dominant-axis discount (`anisoEffectiveFactor`): even a
 * fully view-aligned axis keeps HALF its refinement pressure — its detail
 * still reaches the pixel through along-ray compositing (a mean-downsampled
 * coarse-z MIP column stores dimmer peaks), just not through screen
 * sampling. Also bounds the shader's stride overshoot at 1/λ = 2×. */
export const ANISO_LOD_ALONG_RAY_WEIGHT = 0.5;

/**
 * Anisotropy-aware refinement factor (`orkestrator.anisoLod`): the finer
 * level's per-axis factor, each axis weighted by how much it faces the
 * SCREEN, maxed. An axis keeps weight 1 until the view direction aligns
 * with it past 45° (`d_i² > 0.5` — at most ONE axis can), then ramps
 * smoothly down to λ:
 *
 *   w_i = max(min(1, sqrt(2·(1 − d_i²))), λ);   eff = max_i(scale_i · w_i)
 *
 * Properties (pinned by tests):
 *  - no axis dominates the view (any diagonal) ⇒ every w = 1 ⇒ eff ≡ the
 *    legacy max — plans are unchanged for diagonal views on EVERY pyramid;
 *  - isotropic and [2ⁿ,2ⁿ,1] pyramids ⇒ eff ≡ max for EVERY view (the
 *    discounted axis never carries the max alone there) — no-op families;
 *  - true-factor pyramids viewed along the divergent axis (face-on SPIM,
 *    scale [16,16,23.5]) ⇒ eff = max(16, 23.5·λ) = 16 — refinement keys to
 *    the screen-dominant axes instead of admitting a whole level early;
 *  - a HUGE divergence (say 32× z) still forces refinement at half weight —
 *    a 32× z-blurred composite is visibly wrong even face-on.
 */
export function anisoEffectiveFactor(
  finerScale: Vec3 | readonly number[],
  viewDir: readonly [number, number, number],
  alongRayWeight = ANISO_LOD_ALONG_RAY_WEIGHT,
): number {
  let eff = 0;
  for (const axis of [0, 1, 2] as const) {
    const d2 = viewDir[axis] * viewDir[axis];
    const w = Math.max(Math.min(1, Math.sqrt(Math.max(2 * (1 - d2), 0))), alongRayWeight);
    eff = Math.max(eff, finerScale[axis] * w);
  }
  return eff;
}

/**
 * Foveated ordering score (squared-distance space): distance to `origin`,
 * penalized by the angle off the view axis. Equidistant nodes in the screen
 * CENTER sort before nodes at the screen edge — pure camera distance loaded
 * near-but-peripheral bricks first, which is backwards for "sharpen what I'm
 * looking at". With a null `viewDirection` (orthographic / 2D) this is the
 * plain squared center distance. Ordering-only: callers must never use it to
 * admit or reject nodes.
 */
export function foveatedScore(
  center: Vec3,
  origin: Vec3,
  viewDirection: Vec3 | null | undefined,
  foveaWeight = FOVEA_WEIGHT,
  /** Per-axis metric of the score space (the voxel WORLD size under
   * worldLod). Angles are not preserved by anisotropic maps — scoring raw
   * voxel displacements against a µm-anisotropic affine effectively
   * switched foveation OFF for side views (a 45° world angle read as 5.7°)
   * and over-penalized top-down ones. `viewDirection` must be normalized
   * in the SAME space as the scaled displacement. */
  axisScale?: Vec3,
): number {
  const dx = (center[0] - origin[0]) * (axisScale?.[0] ?? 1);
  const dy = (center[1] - origin[1]) * (axisScale?.[1] ?? 1);
  const dz = (center[2] - origin[2]) * (axisScale?.[2] ?? 1);
  const distSq = dx * dx + dy * dy + dz * dz;
  if (!viewDirection || distSq === 0) return distSq;
  const dist = Math.sqrt(distSq);
  const cos =
    (dx * viewDirection[0] + dy * viewDirection[1] + dz * viewDirection[2]) / dist;
  const penalty = 1 + foveaWeight * (1 - cos);
  return distSq * penalty * penalty; // ≡ (dist · penalty)², same ordering
}

const boxCenter = (box: VoxelBox): Vec3 => [
  (box.min[0] + box.max[0]) / 2,
  (box.min[1] + box.max[1]) / 2,
  (box.min[2] + box.max[2]) / 2,
];

const boxesOverlap = (a: VoxelBox, b: VoxelBox): boolean =>
  a.min[0] < b.max[0] && b.min[0] < a.max[0] &&
  a.min[1] < b.max[1] && b.min[1] < a.max[1] &&
  a.min[2] < b.max[2] && b.min[2] < a.max[2];

export function planLayerNodes({
  layer,
  geometry,
  spec,
  mode,
  viewRange,
  camera,
  lodBias,
  currentZ,
  dimSelections,
  frustumCullMargin = FRUSTUM_CULL_MARGIN,
  maxPlanBytes = Number.POSITIVE_INFINITY,
  decodeFloorBytes,
  decodeCacheShareBytes,
  decodeAllowanceBytes,
  anisoLod = false,
  previousBudgetMinLevel,
  previousKeepKeys,
  refineCeilingLevel,
}: PlanLayerNodesInput): LayerNodePlan {
  const sliceSignature = buildSliceSignature(layer, dimSelections);
  const levels = geometry.levels;
  const numLevels = levels.length;
  const coarsest = numLevels - 1;
  const { zPos } = geometry.axes;

  const empty = (targetLevel: number, slabZ: number | null): LayerNodePlan => ({
    mode,
    sliceSignature,
    targetLevel,
    budgetMinLevel: coarsest,
    decodeBytesCharged: 0,
    levelDecodeBytes: [],
    decodeFloorBytes: 0,
    decodeAllowanceBytes: 0,
    planBudgetBytes: maxPlanBytes,
    refineBudgetBytes: 0,
    slabZ,
    nodes: [],
    planBytes: 0,
  });
  if (numLevels === 0) return empty(0, null);

  const fixedLOD =
    typeof layer.fixedLOD === "number" && layer.fixedLOD >= 0 && layer.fixedLOD < numLevels
      ? layer.fixedLOD
      : null;

  // ONE uniform slot size for every level: the pool allocates all slots at
  // the atlas kind's width (r32f for phasor layers regardless of source
  // dtype — see atlasKindForGeometry). Sizing plan bytes per-level by source
  // dtype made the plan and the pool disagree on capacity.
  const slotBytes = atlasSlotBytes(spec, atlasKindForGeometry(geometry));

  // --- 2D slab selection (uncentered z mapping, parity with chunkPlanning) --
  const layerAffineInverse = affineToMatrix4(layer.affineMatrix).invert();
  const localZ =
    zPos !== -1 && currentZ !== undefined
      ? new THREE.Vector3(0, 0, currentZ).applyMatrix4(layerAffineInverse).z
      : null;

  /** Nearest base-level slice for the slider position ("out-of-range" hides
   * the layer). Chosen ONCE at base resolution; every coarser level derives
   * its slab from this by floor-division below. */
  const baseSlabZ = ((): number | "out-of-range" | null => {
    if (localZ === null) return null;
    const zIndex = Math.round(localZ / levels[0].scale[2]);
    if (zIndex < 0 || zIndex > levels[0].spatialShape[2] - 1) return "out-of-range";
    return zIndex;
  })();

  /** Level z voxel of the slab. Floor-divided from the SAME base z at every
   * level (`slabLevelZ`) — rounding localZ per level instead can pick a
   * coarse brick whose children don't contain the finer level's slab (e.g.
   * z=150, scales 32/16: round(150/32)=5 but round(150/16)=9, a child of
   * brick 4), which stalls refinement at the coarsest level. Floor chains
   * are self-consistent, and the 2D plane shader mirrors EXACTLY this
   * mapping (`makeSampleBrickEx` slab mode: floor(baseZ / scale), + 0.5
   * only to recenter INSIDE the chosen level texel) — sampling
   * floor((baseZ + 0.5) / scale) instead lands one texel past the planned
   * brick at non-integer z scales (e.g. scale 4.22, baseZ 8: planner 1,
   * shader 2 → UNMAPPED → silent coarse fallback that flips with zoom).
   *
   * "out-of-range" means this LEVEL does not cover the slab. Truncated
   * pyramids genuinely lose tail slices at coarse levels (e.g. 81 base
   * slices → z shape 2 at scale 32 covers only base z < 64): such levels
   * must drop out of the slab chain, NOT clamp to their last slice —
   * a clamped brick shows the wrong z and its children never contain the
   * finer slab, stalling refinement. */
  const resolveLevelZ = (levelIndex: number): number | "out-of-range" => {
    if (baseSlabZ === null) return 0;
    if (baseSlabZ === "out-of-range") return "out-of-range";
    if (levelIndex === 0) return baseSlabZ;
    const zIndex = slabLevelZ(baseSlabZ, levels[0].scale[2], levels[levelIndex].scale[2]);
    if (zIndex > levels[levelIndex].spatialShape[2] - 1) return "out-of-range";
    return zIndex;
  };

  const slabBrickZ = (levelIndex: number): number | null => {
    if (mode !== "2D") return null;
    const levelZ = resolveLevelZ(levelIndex);
    if (levelZ === "out-of-range") return null;
    return Math.floor(levelZ / spec.payload[2]);
  };

  const slabZOut =
    mode === "2D" && zPos !== -1 && localZ !== null
      ? (() => {
          const levelZ = resolveLevelZ(0);
          return levelZ === "out-of-range" ? null : levelZ;
        })()
      : mode === "2D"
        ? 0
        : null;

  if (mode === "2D" && baseSlabZ === "out-of-range") {
    // Slider outside this layer's stack: render nothing.
    return empty(coarsest, null);
  }

  // Truncated pyramids can lose tail slices at coarse levels (81 base slices
  // → z shape 2 at scale 32 covers only base z < 64). For a slab beyond that
  // coverage, root the DFS at the coarsest level that still HAS the slab —
  // levels above it simply have no data for this z.
  let rootLevel = coarsest;
  if (mode === "2D") {
    while (rootLevel > 0 && slabBrickZ(rootLevel) === null) rootLevel--;
  }

  // --- Visible region in base voxels ---------------------------------------
  const baseShape = levels[0].spatialShape;
  let visibleBox: VoxelBox | null = null;
  /** The viewport WITHOUT the prefetch margin — band tagging only. */
  let strictBox: VoxelBox | null = null;
  if (viewRange) {
    const ex = expandVoxelRange(viewRange.xRange, PREFETCH_MARGIN);
    const ey = expandVoxelRange(viewRange.yRange, PREFETCH_MARGIN);
    const ez =
      mode === "3D" && viewRange.zRange
        ? expandVoxelRange(viewRange.zRange, PREFETCH_MARGIN)
        : ([0, baseShape[2]] as [number, number]);
    visibleBox = {
      min: [Math.max(0, ex[0]), Math.max(0, ey[0]), Math.max(0, ez[0])],
      max: [
        Math.min(baseShape[0], ex[1]),
        Math.min(baseShape[1], ey[1]),
        Math.min(baseShape[2], ez[1]),
      ],
    };
    const sz: [number, number] =
      mode === "3D" && viewRange.zRange ? viewRange.zRange : [0, baseShape[2]];
    strictBox = {
      min: [
        Math.max(0, viewRange.xRange[0]),
        Math.max(0, viewRange.yRange[0]),
        Math.max(0, sz[0]),
      ],
      max: [
        Math.min(baseShape[0], viewRange.xRange[1]),
        Math.min(baseShape[1], viewRange.yRange[1]),
        Math.min(baseShape[2], sz[1]),
      ],
    };
  }

  // --- Budget floor on refinement -------------------------------------------
  // The finest level a plan may request FREELY is bounded by the DECODED
  // CHUNK BYTES the visible region implies at that level, not just by GPU
  // slot bytes: fetch granularity is the zarr chunk, so with pathological
  // chunkings (e.g. plane-chunked SPIM stacks, [2,2048,2048]) any fine-level
  // brick pull decodes whole 2048² planes and an eager plan streams the
  // entire full-resolution volume. Counting chunk-aligned coverage at decode
  // width (the worker promotes everything except uint8 to float32) keeps
  // first-view loads at the coarse levels.
  //
  // The floor is two-tier: levels at/coarser than `budgetMinLevel` refine
  // freely; FINER levels may still be admitted by the closest-first DFS, but
  // each admission is charged against `decodeAllowanceBytes` — the deduped
  // decoded bytes of the zarr chunks the admitted children require (see
  // `tryChargeChildren`). On plane-chunked pyramids the visible box's
  // chunk-aligned cost barely shrinks with zoom (chunks span the full x/y
  // extent, and a 3D frustum sees ~the whole depth), so the all-or-nothing
  // floor alone pinned refinement at a coarse level forever; the allowance
  // buys a bounded, focus-first chunk set past it. An explicit fixedLOD
  // overrides both tiers.
  const decodedBytesPerVoxelOf = decodedBytesPerVoxel;
  const visibleBytesAtLevel = (levelIndex: number): number => {
    const level = levels[levelIndex];
    const decodedBytesPerVoxel = decodedBytesPerVoxelOf(level.dtype);
    let voxels = 1;
    for (const axis of [0, 1, 2] as const) {
      const chunkExtent = Math.max(1, level.spatialChunks[axis]);
      const gridExtent = Math.ceil(level.spatialShape[axis] / chunkExtent);
      let chunkCount: number;
      if (mode === "2D" && axis === 2) {
        chunkCount = 1; // single slab → one chunk row along z
      } else if (visibleBox) {
        const lo = visibleBox.min[axis] / level.scale[axis];
        const hi = visibleBox.max[axis] / level.scale[axis];
        chunkCount = Math.max(1, Math.ceil(hi / chunkExtent) - Math.floor(lo / chunkExtent));
      } else {
        chunkCount = gridExtent;
      }
      voxels *= Math.min(gridExtent, chunkCount) * chunkExtent;
    }
    return voxels * decodedBytesPerVoxel * nonSpatialDecodeFactor(geometry, level);
  };
  // Decode currency, NOT slot currency. Precedence: an explicit floor, else the
  // cache-derived one, else `maxPlanBytes` — so a caller that has not been
  // taught the difference behaves exactly as before.
  const floorBytes =
    decodeFloorBytes ??
    (decodeCacheShareBytes !== undefined
      ? resolveDecodeFloorBytes({ decodeCacheShareBytes })
      : maxPlanBytes);
  let budgetMinLevel = coarsest;
  for (let levelIndex = 0; levelIndex <= coarsest; levelIndex++) {
    if (visibleBytesAtLevel(levelIndex) <= floorBytes) {
      budgetMinLevel = levelIndex;
      break;
    }
  }
  // Hysteresis on the budget floor: a zoom hovering right at a level's byte
  // threshold otherwise flips budgetMinLevel back and forth every few
  // replans, and each flip replaces (fetches + evicts) the ENTIRE finest
  // level set. A finer level the previous plan already unlocked stays
  // unlocked while its visible bytes remain within the slack factor; real
  // zoom-outs blow past the slack and re-coarsen normally. Keyed on the
  // previous FLOOR, not targetLevel: with a decode allowance, targetLevel
  // can sit below the floor via charged refinement, and keying on it would
  // ratchet a partial unlock into a full-floor unlock the view never earned.
  if (
    previousBudgetMinLevel !== undefined &&
    previousBudgetMinLevel === budgetMinLevel - 1 &&
    visibleBytesAtLevel(previousBudgetMinLevel) <= floorBytes * BUDGET_FLOOR_HYSTERESIS
  ) {
    budgetMinLevel = previousBudgetMinLevel;
  }

  // The sub-floor allowance, derived AFTER the floor is known: the coarse
  // fallback chain lives in the same cache and the shader reads it on every
  // unmapped sample, so it is reserved before anything is handed to sub-floor
  // refinement. Explicit `decodeAllowanceBytes` wins (tests, and the cold-open
  // gate that passes 0 for a class's first plan).
  const allowanceBytes =
    decodeAllowanceBytes ??
    (decodeCacheShareBytes !== undefined
      ? resolveDecodeAllowanceBytes({
          decodeCacheShareBytes,
          floorLevelBytes: visibleBytesAtLevel(budgetMinLevel),
        })
      : 0);

  // --- Per-node screen footprint --------------------------------------------
  /** Per-axis world size of one base voxel — the metric every distance,
   * angle and refinement factor below is measured in. `[1,1,1]` (no camera,
   * or `worldLod` off — the tracker then passes no `voxelWorldSize`) makes
   * every formula reduce to the legacy voxel metric bit-for-bit. */
  const worldScale: Vec3 = camera?.voxelWorldSize ?? [1, 1, 1];
  /** Screen pixels per WORLD unit at the node's nearest point: the pixel
   * focal length over the WORLD distance (voxel-space clamp to the box,
   * displacement scaled per axis). Dividing by the raw voxel distance was
   * the core view-centering bug: for an anisotropic µm affine the ratio is
   * off by the affine's condition number, direction-dependently — the
   * refinement boundary was a world ellipsoid fixed in orientation (side-on
   * views under-refined, top-down over-refined by ~κ levels). The min clamp
   * is one world voxel (max axis), mirroring the legacy `max(1, dist)`.
   * Without a perspective camera: `viewRange.scale`, which is px per BASE
   * VOXEL (already affine-aware) — `finerFactorOf` matches that metric by
   * skipping the world scaling in that branch. */
  const footprintPxOf = (baseBox: VoxelBox): number => {
    const position = camera?.voxelPosition;
    if (position) {
      const dx =
        (Math.min(baseBox.max[0], Math.max(baseBox.min[0], position[0])) - position[0]) *
        worldScale[0];
      const dy =
        (Math.min(baseBox.max[1], Math.max(baseBox.min[1], position[1])) - position[1]) *
        worldScale[1];
      const dz =
        (Math.min(baseBox.max[2], Math.max(baseBox.min[2], position[2])) - position[2]) *
        worldScale[2];
      const minWorld = Math.max(worldScale[0], worldScale[1], worldScale[2]);
      return camera.pxPerVoxelAtUnitDistance / Math.max(minWorld, Math.hypot(dx, dy, dz));
    }
    return viewRange?.scale ?? 0;
  };

  /**
   * The finer level's refinement factor for a node. Legacy: the MAX spatial
   * component — refine while ANY axis still resolves ≥1 px, so z-dominant
   * views on true-factor pyramids are never under-refined. Under `anisoLod`
   * (with a real camera outside the node) the max is tempered by the
   * DOMINANT-AXIS DISCOUNT (`anisoEffectiveFactor`): the axis the view is
   * aligned with reaches the pixel only through along-ray compositing, not
   * screen sampling, so it counts at reduced weight — killing the max rule's
   * whole-level-early admission (~8× bricks over ~55% of the zoom range on a
   * [16,16,23.5]-style pyramid viewed face-on) while any across-view axis
   * keeps full weight (the original protection, for the physically right
   * reason). DELIBERATE ASYMMETRY with the shader: `desiredLevelAt` stays
   * max-based — it clamps to `uDesiredLevel` and falls back per-sample to
   * resident coarser data, so the planner alone decides fetch AND display;
   * the shader may "desire" finer than admitted and the fallback closes the
   * gap (bounded stride overshoot ≤ 1/λ = 2×, actual ≈1.46× on the target
   * family, exactly 1× on [2ⁿ,2ⁿ,1] pyramids).
   */
  const finerFactorOf = (finerScale: Vec3, baseBox: VoxelBox): number => {
    const position = camera?.voxelPosition;
    // Metric must match footprintPxOf's branch: WORLD sample sizes under a
    // perspective camera (px/world · world/sample = px/sample), raw voxel
    // factors for the orthographic viewRange.scale (px/voxel) fallback —
    // where worldScale is identity anyway (no camera ⇒ no voxelWorldSize).
    const fx = position ? finerScale[0] * worldScale[0] : finerScale[0];
    const fy = position ? finerScale[1] * worldScale[1] : finerScale[1];
    const fz = position ? finerScale[2] * worldScale[2] : finerScale[2];
    const maxFactor = Math.max(fx, fy, fz);
    if (!anisoLod) return maxFactor;
    if (!position) return maxFactor; // orthographic / 2D: conservative max
    if (
      position[0] >= baseBox.min[0] && position[0] <= baseBox.max[0] &&
      position[1] >= baseBox.min[1] && position[1] <= baseBox.max[1] &&
      position[2] >= baseBox.min[2] && position[2] <= baseBox.max[2]
    ) {
      return maxFactor; // camera inside the node: direction is ambiguous
    }
    const center = boxCenter(baseBox);
    // WORLD displacement: the dominant-axis test asks which axis the view
    // aligns with ON SCREEN — an angle, which anisotropic affines do not
    // preserve. The voxel-space direction collapsed the ±45° window to
    // ±atan(1/κ) under a κ-anisotropic affine, re-opening the over-fetch
    // this discount exists to kill.
    const dx = (center[0] - position[0]) * worldScale[0];
    const dy = (center[1] - position[1]) * worldScale[1];
    const dz = (center[2] - position[2]) * worldScale[2];
    const len = Math.hypot(dx, dy, dz);
    if (!(len > 1e-6)) return maxFactor;
    return anisoEffectiveFactor([fx, fy, fz], [dx / len, dy / len, dz / len]);
  };

  const wantFiner = (level: number, baseBox: VoxelBox, key: string): boolean => {
    // Desire is purely footprint-driven; the budget floor gates ADMISSION in
    // `visit` (free above the floor, decode-charged below it).
    if (level <= (fixedLOD ?? 0)) return false;
    if (fixedLOD !== null) return true; // refine all the way to the pinned LOD
    // Motion ceiling (see `refineCeilingLevel`): never finer than the last
    // plan while the camera moves. Coarsening is unaffected.
    if (refineCeilingLevel !== undefined && level - 1 < refineCeilingLevel) return false;
    const finerScale = levels[level - 1].scale;
    // LOD hysteresis (see `previousKeepKeys`): a node refined last plan holds
    // within the slack band; a node that was not needs the full threshold.
    const threshold = previousKeepKeys?.has(key) ? 1 / LOD_HYSTERESIS : 1;
    return footprintPxOf(baseBox) * finerFactorOf(finerScale, baseBox) * lodBias >= threshold;
  };

  const focus: Vec3 = camera?.voxelPosition ??
    (visibleBox
      ? [
          (visibleBox.min[0] + visibleBox.max[0]) / 2,
          (visibleBox.min[1] + visibleBox.max[1]) / 2,
          (visibleBox.min[2] + visibleBox.max[2]) / 2,
        ]
      : [baseShape[0] / 2, baseShape[1] / 2, baseShape[2] / 2]);
  /** Foveation axis — only meaningful with a real camera position. Lives in
   * the SAME metric as the worldScale-scaled score displacements (the WORLD
   * direction under worldLod; NodeCamera.voxelViewDirection doc). */
  const viewAxis = camera?.voxelPosition ? camera.voxelViewDirection ?? null : null;
  const orderScore = (box: VoxelBox): number =>
    foveatedScore(boxCenter(box), focus, viewAxis, FOVEA_WEIGHT, worldScale);

  const clampToRange = (v: number, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, v));
  /**
   * Foveated squared distance from the focus to the box's NEAREST point —
   * unlike center-based `orderScore` this is comparable across levels, which
   * a global fetch sort needs. 2D projects z out entirely (see PlannedNode).
   */
  const fetchScoreOf = (box: VoxelBox): number =>
    foveatedScore(
      [
        clampToRange(focus[0], box.min[0], box.max[0]),
        clampToRange(focus[1], box.min[1], box.max[1]),
        mode === "2D" ? focus[2] : clampToRange(focus[2], box.min[2], box.max[2]),
      ],
      focus,
      viewAxis,
      FOVEA_WEIGHT,
      worldScale,
    );

  // --- Coarsest-level reservation -------------------------------------------
  // The residency manager pins EVERY resident coarsest brick in addition to
  // the plan (the shader's fallback of last resort), so the slots a plan can
  // actually win = budget − the full coarsest grid. Without the reservation a
  // fully refined plan requests essentially the whole pool: repacked bricks
  // find every slot protected at acquire time, are dropped, and are refetched
  // every replan (the acquire-failure treadmill) — worst at deep zoom, when
  // the plan is largest. When the whole pyramid fits the budget there is no
  // slot scarcity at all; skip the reservation so small datasets refine
  // freely.
  const coarsestGrid = brickGridForLevel(geometry, spec, coarsest);
  const coarsestReserveBytes =
    coarsestGrid[0] * coarsestGrid[1] * coarsestGrid[2] * slotBytes;
  const refineBudgetBytes =
    totalBrickCount(geometry, spec) * slotBytes <= maxPlanBytes
      ? maxPlanBytes
      : Math.max(0, maxPlanBytes - coarsestReserveBytes);

  // --- Sub-floor decode accounting ------------------------------------------
  // Charged in the currency the fetcher actually pays: whole decoded zarr
  // chunks, deduped plan-wide (`chunksTouchingBrick` is the fetch path's own
  // mapping). On plane-chunked levels one charged chunk covers the full x/y
  // extent, so every other brick in it refines at zero marginal cost — the
  // fine region grows chunk-aligned, which also keeps it stable under small
  // focus motion.
  const chunkDecodedBytes = (levelIndex: number): number => {
    const level = levels[levelIndex];
    return (
      level.spatialChunks[0] *
      level.spatialChunks[1] *
      level.spatialChunks[2] *
      decodedBytesPerVoxelOf(level.dtype) *
      // `fresh.size` counts SPATIAL chunk keys, so the non-spatial factor
      // applies per spatial column — consistent with the floor above.
      nonSpatialDecodeFactor(geometry, level)
    );
  };
  const chargedChunks = new Set<string>();
  let decodeBytesCharged = 0;
  /** All-or-nothing: charge every NEW chunk the children need, or admit none. */
  const tryChargeChildren = (childLevel: number, children: Vec3[]): boolean => {
    const fresh = new Set<string>();
    for (const child of children)
      for (const chunk of chunksTouchingBrick(geometry, spec, childLevel, child)) {
        const key = `${childLevel}:${chunk[0]}:${chunk[1]}:${chunk[2]}`;
        if (!chargedChunks.has(key)) fresh.add(key);
      }
    const cost = fresh.size * chunkDecodedBytes(childLevel);
    if (decodeBytesCharged + cost > allowanceBytes) return false;
    for (const key of fresh) chargedChunks.add(key);
    decodeBytesCharged += cost;
    return true;
  };

  // --- Closest-first refinement ---------------------------------------------
  const nodes: PlannedNode[] = [];
  let planBytes = 0;
  /** Bytes of sub-coarsest nodes only — what competes for unreserved slots. */
  let refineBytes = 0;
  let targetLevel = coarsest;

  const emit = (
    level: number,
    coords: Vec3,
    role: PlannedNode["role"],
    baseBox: VoxelBox,
  ) => {
    // Band 2 = margin-only prefetch, fetched last. Either margin can put a node
    // there: the 2D viewport's (outside `strictBox`) or the 3D frustum's (only
    // inside once dilated by FRUSTUM_CULL_MARGIN). Without this arm the
    // hysteresis margin would compete with genuinely visible bricks for
    // in-flight slots and trade edge flicker for centre latency.
    const fetchBand: PlannedNode["fetchBand"] =
      level === rootLevel
        ? 0
        : (strictBox && !boxesOverlap(baseBox, strictBox)) || !nodeInFrustum(baseBox, 0)
          ? 2
          : 1;
    nodes.push({
      key: nodeKey(level, coords),
      level,
      coords,
      role,
      priority: nodes.length,
      fetchScore: fetchScoreOf(baseBox),
      fetchBand,
    });
    planBytes += slotBytes;
    if (level < coarsest) refineBytes += slotBytes;
    if (role === "target" && level < targetLevel) targetLevel = level;
  };

  /**
   * Does this node meet the camera frustum, allowing `margin` × its own extent
   * of slack per axis? `margin: 0` is the strict test.
   */
  const nodeInFrustum = (baseBox: VoxelBox, margin: number): boolean => {
    if (mode !== "3D" || !camera) return true;
    const mx = (baseBox.max[0] - baseBox.min[0]) * margin;
    const my = (baseBox.max[1] - baseBox.min[1]) * margin;
    const mz = (baseBox.max[2] - baseBox.min[2]) * margin;
    scratchBox.min.set(baseBox.min[0] - mx, baseBox.min[1] - my, baseBox.min[2] - mz);
    scratchBox.max.set(baseBox.max[0] + mx, baseBox.max[1] + my, baseBox.max[2] + mz);
    return camera.voxelFrustum.intersectsBox(scratchBox);
  };

  const nodeVisible = (baseBox: VoxelBox): boolean => {
    if (visibleBox && !boxesOverlap(baseBox, visibleBox)) return false;
    // Dilated, not strict: an exact test has no hysteresis, so a node on a side
    // plane flips in and out on sub-pixel camera motion and its brick is
    // evicted and refetched each time — the flicker at the viewport edges.
    // See FRUSTUM_CULL_MARGIN.
    return nodeInFrustum(baseBox, frustumCullMargin);
  };

  const visit = (level: number, coords: Vec3): void => {
    const baseBox = nodeBaseBox(geometry, spec, level, coords);
    if (!nodeVisible(baseBox)) return;

    let children: Vec3[] = [];
    if (wantFiner(level, baseBox, nodeKey(level, coords))) {
      const childSlab = slabBrickZ(level - 1);
      // 2D with a real z axis: a child level that doesn't cover the slab
      // (childSlab null) must not be refined into — its bricks would show a
      // different z. Cannot happen below rootLevel with monotone pyramid
      // coverage, but guard against irregular level shapes.
      const childCoversSlab = mode !== "2D" || zPos === -1 || childSlab !== null;
      children = !childCoversSlab
        ? []
        : childrenOf(geometry, spec, level, coords).filter((child) => {
            if (mode === "2D" && childSlab !== null && child[2] !== childSlab) return false;
            return nodeVisible(nodeBaseBox(geometry, spec, level - 1, child));
          });
      const childBytes = children.length * slotBytes;
      const pendingSelfBytes = level < coarsest ? slotBytes : 0;
      if (
        children.length === 0 ||
        refineBytes + pendingSelfBytes + childBytes > refineBudgetBytes
      ) {
        children = [];
      }
      // Sub-floor admission: charged against the decode allowance, AFTER the
      // slot check so slot-rejected refinement never consumes allowance.
      if (
        children.length !== 0 &&
        fixedLOD === null &&
        level - 1 < budgetMinLevel &&
        !tryChargeChildren(level - 1, children)
      ) {
        children = [];
      }
    }

    if (children.length === 0) {
      emit(level, coords, "target", baseBox);
      return;
    }

    emit(level, coords, "keep", baseBox);
    children
      .map((child) => ({
        child,
        dist: orderScore(nodeBaseBox(geometry, spec, level - 1, child)),
      }))
      .sort((a, b) => a.dist - b.dist)
      .forEach(({ child }) => visit(level - 1, child));
  };

  // Roots: bricks of the coarsest slab-covering level overlapping the
  // visible region (all of them when no view range exists yet — "coarsest
  // backdrop before visibility"; refinement needs a footprint, which also
  // needs the view range or a perspective camera).
  const rootGrid = brickGridForLevel(geometry, spec, rootLevel);
  const rootScale = levels[rootLevel].scale;
  const rootSlab = slabBrickZ(rootLevel);

  const rootRange = (axis: 0 | 1 | 2): [number, number] => {
    if (!visibleBox) return [0, rootGrid[axis]];
    const extent = spec.payload[axis] * rootScale[axis];
    return [
      Math.max(0, Math.floor(visibleBox.min[axis] / extent)),
      Math.min(rootGrid[axis], Math.ceil(visibleBox.max[axis] / extent)),
    ];
  };

  const [x0, x1] = rootRange(0);
  const [y0, y1] = rootRange(1);
  const [z0, z1] = rootSlab !== null ? [rootSlab, rootSlab + 1] : rootRange(2);

  const roots: { coords: Vec3; dist: number }[] = [];
  for (let z = z0; z < z1; z++)
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const coords: Vec3 = [x, y, z];
        roots.push({
          coords,
          dist: orderScore(nodeBaseBox(geometry, spec, rootLevel, coords)),
        });
      }
  roots.sort((a, b) => a.dist - b.dist);
  for (const root of roots) visit(rootLevel, root.coords);

  return {
    mode,
    sliceSignature,
    targetLevel,
    budgetMinLevel,
    decodeBytesCharged,
    levelDecodeBytes: levels.map((_, i) => visibleBytesAtLevel(i)),
    decodeFloorBytes: floorBytes,
    decodeAllowanceBytes: allowanceBytes,
    planBudgetBytes: maxPlanBytes,
    refineBudgetBytes,
    slabZ: slabZOut,
    nodes,
    planBytes,
  };
}

/**
 * Fetch dispatch order for a plan's missing nodes:
 *  band 0 — rootLevel backdrop (few bricks, the shader's no-hole guarantee
 *           for the WHOLE view) — always first;
 *  band 1 — on-screen nodes by foveated box distance to the focus, ties
 *           coarse-first. Box distance is monotone under ancestry, so the
 *           near subtree's fallback chain (score 0 over the focus) lands
 *           root→leaf just before its target, while a FAR keep or target
 *           (large distance) no longer preempts near targets — the previous
 *           global keep-before-target rule stalled the area under the cursor
 *           behind the whole viewport's intermediate fallback chain on
 *           zoom-in;
 *  band 2 — margin-only prefetch, last.
 * Emission index is the final deterministic tiebreak.
 */
export const compareFetchOrder = (a: PlannedNode, b: PlannedNode): number => {
  if (a.fetchBand !== b.fetchBand) return a.fetchBand - b.fetchBand;
  if (a.fetchScore !== b.fetchScore) return a.fetchScore - b.fetchScore;
  if (a.level !== b.level) return b.level - a.level; // coarse-first at ties
  return a.priority - b.priority;
};

/** Value equality between two plans (skip store writes / preserve identity). */
export function sameNodePlan(a: LayerNodePlan, b: LayerNodePlan): boolean {
  return (
    a.mode === b.mode &&
    a.sliceSignature === b.sliceSignature &&
    a.targetLevel === b.targetLevel &&
    a.budgetMinLevel === b.budgetMinLevel &&
    a.slabZ === b.slabZ &&
    a.nodes.length === b.nodes.length &&
    a.nodes.every((node, i) => node.key === b.nodes[i].key && node.role === b.nodes[i].role)
  );
}
