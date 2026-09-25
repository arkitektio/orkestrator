/**
 * CPU mirrors of the per-step decisions the raymarch fast path emits in
 * `features/bricks/gpu/brickNodeMaterials.ts` — keep the two in lockstep (same
 * pattern as `features/bricks/shaderspec/opacityCorrection.ts`). The shader cannot be unit-tested
 * against a GPU; these pin the semantics the TSL emission encodes.
 */

/** Residency status codes from the page-table walk (`emitResolveBrickResidency`). */
export const STATUS_UNMAPPED = 0;
export const STATUS_RESIDENT = 1;
export const STATUS_EMPTY = 2;

/** The 0.75-of-a-voxel sampling density both stride rules share. */
export const RAY_PITCH_FACTOR = 0.75;

/**
 * Mirror of the shader's direction-projected marching pitch
 * (`orkestrator.anisoStride`, `levelPitch` in brickNodeMaterials.ts /
 * `lblPitch` in labelNodeMaterials.ts): the ELLIPSOIDAL voxel-crossing
 * distance along a unit ray direction `dir` (base-voxel space) through a
 * level with per-axis scale `scale` —
 *
 *   pitch = 0.75 / |dir / scale|
 *
 * Properties the tests pin (and the shader relies on):
 *  - axis-aligned rays: pitch = 0.75·scale_axis (fixes the face-on
 *    z-undersample of the legacy max rule on [2ⁿ,2ⁿ,1] pyramids);
 *  - isotropic levels: pitch = 0.75·s for EVERY direction (identical to the
 *    legacy rule — visual diffs are confined to anisotropic pyramids);
 *  - never exceeds the legacy 0.75·max(scale) (never oversamples the
 *    coarsest axis) and never exceeds 0.75·scale_i/|dir_i| on any axis
 *    (≥ ~one sample per voxel crossing everywhere).
 */
export function directionProjectedPitch(
  dir: readonly [number, number, number],
  scale: readonly [number, number, number],
): number {
  const norm = Math.hypot(dir[0] / scale[0], dir[1] / scale[1], dir[2] / scale[2]);
  return RAY_PITCH_FACTOR / Math.max(norm, 1e-6);
}

/**
 * Mirror of the shader's `desiredLevelAt` (volumeRayNodes.ts) as a function
 * of camera distance: the first level whose MAX per-axis scale still resolves
 * ≥1 px, clamped no finer than `floorLevel` (uDesiredLevel), the coarsest
 * level otherwise; ortho (pxPerVoxelAtUnitDistance ≤ 0) is the constant
 * floor.
 *
 * WORLD-metric LOD (uVoxelWorldSize ≠ identity): the caller passes the WORLD
 * distance, per-level `max_i(scale_i · w_i)` as `levelMaxScales`, and
 * `minDistance = max_i(w_i)` (one world voxel — the shader's min clamp). The
 * defaults are the identity metric — bit-for-bit the legacy voxel formula.
 *
 * This exists to PIN the soundness argument of the hierarchical-occupancy
 * coarse hop (R4): it is monotone NON-FINER in `distance`, and the ray
 * origin is the camera, so the finest desired level on any FORWARD ray
 * segment is at the segment's start — the hop at level `lvl` therefore
 * never skips a sample that would have desired finer than `lvl`. The world
 * metric preserves the argument: world distance from the camera is monotone
 * along a forward ray (a fixed positive-definite scaling of the same
 * displacement), and the per-level factors stay distance-independent.
 */
export function desiredLevelForDistance(
  distance: number,
  pxPerVoxelAtUnitDistance: number,
  levelMaxScales: readonly number[],
  lodBias: number,
  floorLevel: number,
  minDistance = 1,
): number {
  const coarsest = levelMaxScales.length - 1;
  if (pxPerVoxelAtUnitDistance <= 0) return Math.min(Math.max(floorLevel, 0), coarsest);
  const pxPerBaseVoxel = pxPerVoxelAtUnitDistance / Math.max(distance, minDistance);
  for (let level = 0; level < coarsest; level++) {
    if (pxPerBaseVoxel * levelMaxScales[level] * lodBias >= 1) {
      return Math.min(Math.max(level, floorLevel), coarsest);
    }
  }
  return coarsest;
}

/**
 * The empty-space skip predicate: an unmapped chain always skips; a uniform
 * EMPTY brick skips when no visible channel would contribute. Residents are
 * NOT decided here — their skip is the occupancy predicate below
 * (`residentBrickSkippable`). `maxNorm` is the max normalized intensity across
 * every visible slot of every member at this step.
 */
export function shouldSkipStep(status: number, maxNorm: number): boolean {
  if (status < 0.5) return true;
  return status > 1.5 && maxNorm <= 0.001;
}

/** Transfer-function inputs of one compositor slot (mirrors `chParamsA/B`). */
export type SlotTransfer = {
  climMin: number;
  climMax: number;
  gamma: number;
  invert: boolean;
  visible: boolean;
};

/**
 * Mirror of the shader's `channelNormalize` (`makeChannelNormalize`): raw →
 * range norm → clim window → gamma → optional invert. Clamps to 0.999 BEFORE
 * gamma, so only invert can reach exactly 1.0 — the ATTENUATED_MIP bound below
 * relies on the result never exceeding 1.
 */
export function normalizeSlotValue(
  raw: number,
  dataMin: number,
  dataMax: number,
  slot: SlotTransfer,
): number {
  const baseNorm = clamp01((raw - dataMin) / Math.max(dataMax - dataMin, 0.00001));
  const climRange = Math.max(slot.climMax - slot.climMin, 0.00001);
  let normalized = Math.min(Math.max((baseNorm - slot.climMin) / climRange, 0), 0.999);
  normalized = Math.pow(normalized, Math.max(slot.gamma, 0.0001));
  return slot.invert ? 1 - normalized : normalized;
}

/**
 * The cheap EMPTY-step norm the fast path skips on: every slot of an EMPTY
 * brick taps the same uniform value, so the step's max norm is derivable with
 * pure ALU — no colormap sample, no phasor taps, no cursor loop. Invisible
 * slots are excluded, exactly like the full sampling loop's visibility guard.
 */
export function emptyStepMaxNorm(
  emptyValue: number,
  dataMin: number,
  dataMax: number,
  slots: readonly SlotTransfer[],
): number {
  let maxNorm = 0;
  for (const slot of slots) {
    if (!slot.visible) continue;
    maxNorm = Math.max(maxNorm, normalizeSlotValue(emptyValue, dataMin, dataMax, slot));
  }
  return maxNorm;
}

/**
 * Upper bound of the windowed norm any voxel of a brick can reach, from the
 * occupancy sidecar's conservative raw bracket `[brickMin, brickMax]`
 * (`decodeOccupancyBounds`). `normalizeSlotValue` is monotone in the raw value
 * up to its final invert, so over the whole bracket the norm is bounded by the
 * larger endpoint image — valid for inverted channels too (there the min
 * endpoint dominates). Max over the member's VISIBLE slots, mirroring the
 * shader's `oc<m>` loop.
 */
export function occupancyUpperNorm(
  brickMin: number,
  brickMax: number,
  dataMin: number,
  dataMax: number,
  slots: readonly SlotTransfer[],
): number {
  let upper = 0;
  for (const slot of slots) {
    if (!slot.visible) continue;
    upper = Math.max(
      upper,
      normalizeSlotValue(brickMin, dataMin, dataMax, slot),
      normalizeSlotValue(brickMax, dataMin, dataMax, slot),
    );
  }
  return upper;
}

/** One merged-pass member's inputs to the resident-brick skip decision. */
export type MemberSkipState = {
  /** 0 MIP, 1 ATTENUATED_MIP, 2 VOLUME, 3 ISO. */
  projectionMode: number;
  /** `occupancyUpperNorm` over this member's visible slots. */
  upperNorm: number;
  /** The member's MIP accumulator (max norm seen so far on this ray). */
  bestNorm: number;
  isoThreshold: number;
  /** The member's early-out flag (saturated / first ISO crossing). */
  done: boolean;
};

/**
 * The RESIDENT-brick occupancy skip (shader lockstep: the `occSkipAll` block
 * in `brickNodeMaterials.ts`): the ray may hop the resident brick's whole cell
 * when EVERY member is satisfied — invisible under its clim window (the EMPTY
 * threshold), a MIP that the brick cannot beat, an ISO the brick never
 * reaches, or already done. Conservative by construction: a skipped brick
 * cannot change any member's accumulator.
 */
/** NOTE: this predicate is ALSO the hierarchical-occupancy coarse hop's
 * (R4): the aggregate hop feeds the same shape with `upperNorm` computed
 * from the AGGREGATE bounds instead of the brick's own — one predicate, two
 * granularities, kept in lockstep by construction. */
export function residentBrickSkippable(members: readonly MemberSkipState[]): boolean {
  return members.every((member) => {
    if (member.done) return true;
    if (member.upperNorm <= 0.001) return true;
    if (member.projectionMode === 0 && member.upperNorm <= member.bestNorm) return true;
    if (member.projectionMode === 3 && member.upperNorm < member.isoThreshold) return true;
    return false;
  });
}

/**
 * ATTENUATED_MIP early ray termination bound. The projection ranks samples by
 * `norm · exp(-1.5 · depthFrac)`; `depthFrac` strictly increases along the ray
 * and `norm ≤ 1`, so every future contribution is strictly below
 * `exp(-1.5 · depthFrac_now)`. Once the accumulated max reaches that ceiling,
 * nothing later on the ray can beat it. Deterministic per pixel (P14-safe,
 * same argument as the MIP 0.995 early-out).
 */
export function attenuatedMipDone(attenuatedMax: number, depthFrac: number): boolean {
  return attenuatedMax >= attenuationAt(depthFrac);
}

/** The ATTENUATED_MIP depth weight — mirrors `exp(-1.5·depthFrac)` in the shader. */
export function attenuationAt(depthFrac: number): number {
  return Math.exp(-1.5 * depthFrac);
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

/**
 * Per-slab twin of `occupancyUpperNorm` (`orkestrator.occPerSlab`): each
 * visible slot reads the bracket of ITS OWN atlas slab (`slot.slab`) — the
 * shader's per-slab sidecar plane at `z + slab · uOccSlabDepth` — instead of
 * the brick-wide union. With every slab sharing one bracket this equals
 * `occupancyUpperNorm` (pinned in the tests), and per slab it can only be
 * tighter: a slab's own bracket is contained in the union.
 */
export function occupancyUpperNormPerSlab(
  bounds: readonly { min: number; max: number }[],
  dataMin: number,
  dataMax: number,
  slots: readonly (SlotTransfer & { slab: number })[],
): number {
  let upper = 0;
  for (const slot of slots) {
    if (!slot.visible) continue;
    const bracket = bounds[slot.slab] ?? bounds[0];
    upper = Math.max(
      upper,
      normalizeSlotValue(bracket.min, dataMin, dataMax, slot),
      normalizeSlotValue(bracket.max, dataMin, dataMax, slot),
    );
  }
  return upper;
}
