import { MAX_CHANNELS, MAX_CURSORS } from "./channelLimits";

/**
 * Which volume layers can be raymarched in ONE pass.
 *
 * Layers that share a brick pool share the atlas, page table, geometry, brick
 * spec and value range — that is exactly what `buildPoolKey` asserts. Rendering
 * them as N separate passes therefore walks the same volume N times: N full
 * rasterizations of the same screen region, N level walks per ray step, and
 * (because the materials are additive with `depthWrite = false` and a `Discard`)
 * no early-Z to save any of it. Merging walks once and accumulates every
 * member's channel contributions per step.
 *
 * ## Why splitting a group is exact, not a compromise
 *
 * `commonMaterialSettings` gives EVERY volume layer `AdditiveBlending`, and a
 * layer's own `blend` mode applies only within that layer, across its channel
 * slots. So compositing ACROSS layers is always addition — and addition is
 * associative. Partitioning a group at any member boundary and letting the
 * framebuffer sum the partial results is therefore bit-identical to one merged
 * pass. That makes splitting the safe fallback for every disagreement the merged
 * shader cannot express: correctness never depends on the grouping being clever,
 * only on it being consistent.
 *
 * ## Determinism without coordination
 *
 * Every member component runs this same pure function over the same store
 * snapshot in the same React commit, so they all reach the same answer with no
 * shared state, no provider and no cross-component messaging. Each then checks
 * whether it is the group's `primaryId`: the primary carries the merged
 * material, the rest render nothing.
 */

/** Uniform-slot ceiling for one merged group (shared across its members). */
export const MERGE_MAX_SLOTS = MAX_CHANNELS;
/** Cursor ceiling for one merged group. */
export const MERGE_MAX_CURSORS = MAX_CURSORS;
/**
 * Members per merged pass. The shader unrolls per member, so each one costs a
 * live set of accumulator registers (~10 floats); too many and the shader
 * spills, which inverts the win. Raised 4 → 8: every extra member folded in
 * removes an ENTIRE full-screen raymarch pass (the dominant per-layer frame
 * cost), 8 × ~10 accumulator floats is well inside modern register budgets,
 * and the slot/cursor ceilings (16/16) still bound per-step work. The
 * `orkestrator.volumeMerge` kill switch below remains the A/B lever if a
 * device ever shows spill regressions.
 */
export const MAX_MERGED_MEMBERS = 8;

export type MergeMember = {
  layerId: string;
  /** Index in the scene's layer list — the tie-break for choosing a primary. */
  order: number;
  /**
   * Identity of the layer's world transform. NOT part of the pool key (that
   * keys what a brick HOLDS, not where it is drawn), so co-pool members may
   * legitimately differ here — and a merged pass rasterizes one box, so they
   * cannot share one.
   */
  affineKey: string;
  /** Compositor slots this member needs (channels + phasor sources). */
  sourceCount: number;
  /** Phasor cursors this member needs. */
  cursorCount: number;
  /** The member's own plan target level. */
  targetLevel: number;
};

export type MergeGroup = {
  /** The member that carries the merged material and mesh. */
  primaryId: string;
  /** Every member, in scene order. Includes the primary. */
  memberIds: string[];
  /** Finest level any member planned — see the note in the merged material. */
  targetLevel: number;
  /** Where each member's slots begin in the merged uniform arrays. */
  slotOffsets: Record<string, number>;
};

export type MergeCaps = {
  maxSlots?: number;
  maxCursors?: number;
  maxMembers?: number;
};

/**
 * Partition co-pool members into groups that can each render in one pass.
 * Members must already be filtered to a single pool; ordering of the result
 * follows scene order, which keeps the primary stable across recomputes.
 */
export function planVolumeMergeGroups(
  members: readonly MergeMember[],
  caps: MergeCaps = {},
): MergeGroup[] {
  const maxSlots = caps.maxSlots ?? MERGE_MAX_SLOTS;
  const maxCursors = caps.maxCursors ?? MERGE_MAX_CURSORS;
  const maxMembers = caps.maxMembers ?? MAX_MERGED_MEMBERS;

  // Scene order first, so primaries and slot offsets are stable.
  const ordered = [...members].sort((a, b) => a.order - b.order);

  // 1. Partition by transform: one pass rasterizes one box.
  const byAffine = new Map<string, MergeMember[]>();
  for (const member of ordered) {
    const bucket = byAffine.get(member.affineKey);
    if (bucket) bucket.push(member);
    else byAffine.set(member.affineKey, [member]);
  }

  const groups: MergeGroup[] = [];
  for (const bucket of byAffine.values()) {
    // 2. Chunk on the uniform-budget and member ceilings.
    let current: MergeMember[] = [];
    let slots = 0;
    let cursors = 0;

    const flush = () => {
      if (current.length === 0) return;
      const slotOffsets: Record<string, number> = {};
      let offset = 0;
      for (const member of current) {
        slotOffsets[member.layerId] = offset;
        offset += member.sourceCount;
      }
      groups.push({
        primaryId: current[0].layerId,
        memberIds: current.map((m) => m.layerId),
        // 3. Finest level any member planned. Residency is shared and the
        //    shader walks COARSER from the desired level, so the min is the
        //    finest data actually present in the atlas.
        targetLevel: Math.min(...current.map((m) => m.targetLevel)),
        slotOffsets,
      });
      current = [];
      slots = 0;
      cursors = 0;
    };

    // `bucket` was filled by walking `ordered`, so it IS in scene order.
    for (const member of bucket) {
      // A member that cannot fit even alone still gets its own group: the
      // uniform builder truncates, exactly as the single-layer path already
      // does when a layer exceeds MAX_CHANNELS.
      const wouldOverflow =
        current.length > 0 &&
        (slots + member.sourceCount > maxSlots ||
          cursors + member.cursorCount > maxCursors ||
          current.length + 1 > maxMembers);
      if (wouldOverflow) flush();
      current.push(member);
      slots += member.sourceCount;
      cursors += member.cursorCount;
    }
    flush();
  }

  // Groups come out affine-bucket-major; sort by primary scene order so the
  // result is a deterministic function of the input alone.
  const orderOf = new Map(ordered.map((m, i) => [m.layerId, i]));
  groups.sort((a, b) => (orderOf.get(a.primaryId) ?? 0) - (orderOf.get(b.primaryId) ?? 0));
  return groups;
}

/** The group a layer belongs to, or null when it is not a member of any. */
export function findMergeGroup(
  groups: readonly MergeGroup[],
  layerId: string,
): MergeGroup | null {
  for (const group of groups) {
    if (group.memberIds.includes(layerId)) return group;
  }
  return null;
}

/**
 * Was a kill switch; settled ON (OCTREE_RENDERER.md §6.9), mirroring `orkestrator.gpuRepack`:
 * lets a session A/B the merged pass against one-pass-per-layer without a
 * rebuild. Read at material-build time, so toggling takes effect on the next
 * scene mount. This is the only practical way to bisect a visual regression in
 * a shader that cannot be unit-tested against a GPU.
 */


