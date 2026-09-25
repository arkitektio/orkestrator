import { buildAffineMatrix } from "../../../platform/coords/worldTransform";
import { isLabelLayerState, type LayerState } from "../../../platform/model/layerModel";
import type { MergeMember } from "./volumeMergeGroups";

/**
 * Which layers of a shared brick pool are eligible for ONE merged volume pass,
 * and the facts the grouping decides on.
 *
 * Lifted out of `BrickVolumeLayer`'s memo so the eligibility rules are testable
 * — they used to be inline, which meant the only way to check them was to render
 * the component. `planVolumeMergeGroups` is pure and already well covered; this
 * is the half that decides what it is even asked about.
 *
 * Three reasons a pool member is left out, all of them load-bearing:
 *
 *  - **It is not in `layers`.** A member id the store no longer carries has no
 *    affine and no sources to composite.
 *  - **It is hidden.** A hidden member must leave the merged pass IMMEDIATELY:
 *    the pool's membership only updates after the next replan + reconcile, and
 *    until then the primary would keep compositing the hidden layer's channels.
 *  - **It has no plan yet.** Without a target level there is nothing to
 *    raymarch at.
 */

/**
 * Affine identity for merge bucketing, quantized to 12 significant digits per
 * element. The previous key joined the raw float64 elements, so two transforms
 * that are numerically equal but not BITWISE equal — the same placement
 * composed through a different edge order, a server round-trip through JSON —
 * silently split a mergeable group into separate full-screen passes. 12
 * significant digits collapse float-noise (~1e-16 relative) while preserving
 * every real difference a renderer could show (sub-nanometer at cell scale).
 * `-0` normalizes to `0` so the sign of a zero cannot split a bucket.
 */
export const quantizedAffineKey = (elements: readonly number[]): string =>
  elements
    .map((v) => {
      const q = Number(v.toPrecision(12));
      return Object.is(q, -0) ? "0" : String(q);
    })
    .join(",");

/**
 * Members eligible for merging, in pool order.
 *
 * `order` is the layer's index in `layers`, which is what makes the primary
 * choice deterministic across the member components deriving this independently.
 */
export const buildMergeMembers = ({
  memberIds,
  layers,
  targetLevelOf,
}: {
  memberIds: readonly string[];
  layers: readonly LayerState[];
  targetLevelOf: (layerId: string) => number | undefined;
}): MergeMember[] => {
  const members: MergeMember[] = [];
  memberIds.forEach((id) => {
    const order = layers.findIndex((l) => l.id === id);
    const memberLayer = order >= 0 ? layers[order] : undefined;
    if (!memberLayer) return;
    // A LABEL layer never joins a merged pass. The merged material is the image
    // compositor unrolled per member — channel slots, transfers, colormap rows —
    // and a label has none of that: its ids become colour through their own
    // material. Two label layers over one mask still SHARE the pool (same
    // bricks, which is the whole win); they just draw in their own passes, and
    // splitting a group is exact by construction (see volumeMergeGroups.ts).
    //
    // `valueSemantics` in the pool key already keeps a label out of an image's
    // pool, so this is the second of two independent guards — kept because it
    // states the rule where the rule is read.
    if (isLabelLayerState(memberLayer)) return;
    if (memberLayer.visible === false) return;
    const targetLevel = targetLevelOf(id);
    if (targetLevel === undefined) return;
    members.push({
      layerId: id,
      order,
      affineKey: quantizedAffineKey(buildAffineMatrix(memberLayer).elements),
      sourceCount: (memberLayer.sources ?? memberLayer.channels ?? []).length,
      cursorCount: (memberLayer.phasors ?? []).reduce(
        (total, phasor) => total + (phasor.transfer.cursors?.length ?? 0),
        0,
      ),
      targetLevel,
    });
  });
  return members;
};
