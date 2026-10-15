import { descriptorsOf, structure } from "@/core/smart/structure";
import type { JSONObject, Structure } from "@/core/types";

import { effectiveProbeLayerId } from "../../../platform/probe/probeTargeting";
import type { HoverPoint, SelectedRoi } from "../roiSelectionStore";

/**
 * What a shape's card (`AnnotationPairActions`) asks rekuest with:
 * the annotation as arg 0 and a lens as arg 1 — the one the probe reads,
 * unless the card's "Run with" picker names another layer — each with
 * the descriptors it PROVIDES, so a port's `Requires` narrows both sides
 * ("a rectangle", "a single-channel image"). Pure, so the pairing is testable
 * without a canvas.
 */

/**
 * The identifier an action types a pixel lens with: mikro hosts one structure
 * per lens kind and rekuest matches a port's identifier exactly.
 */
export const ARRAY_LENS_IDENTIFIER = "@mikro/arraylens";

/** The slice of a brick layer the pairing reads (structural). */
export type ProbeLensLayer = {
  id: string;
  visible?: boolean;
  lens: { id: string; name?: string | null; descriptors?: unknown };
};

/** The clicked shape, with the descriptors the server answered for it. */
export const annotationObject = (
  roi: Pick<SelectedRoi, "id" | "name">,
  descriptors: unknown,
): Structure =>
  structure("@mikro/annotation", roi.id, {
    label: roi.name,
    descriptors: descriptorsOf(descriptors),
  });

/**
 * The layer a card runs its actions with: the one picked in its "Run with"
 * picker while that layer is still in the scene — hidden or not, an action
 * reads the lens, not the pixels on screen — else the probe's.
 */
export const pairLayerId = (
  pickedLayerId: string | null,
  probeLayerId: string | null,
  layers: readonly { id: string; visible?: boolean }[],
): string | null =>
  pickedLayerId !== null && layers.some((layer) => layer.id === pickedLayerId)
    ? pickedLayerId
    : effectiveProbeLayerId(probeLayerId, layers);

/**
 * One layer's lens, as an array lens. Null when the layer is not in the
 * scene — with `pairLayerId`, when no layer can answer a probe either; the
 * menu then has nothing to pair the shape with and says so, rather than
 * listing one-argument actions.
 */
export const layerLensPartner = (
  layerId: string | null,
  layers: readonly ProbeLensLayer[],
  label?: (layerId: string) => string | undefined,
): Structure | null => {
  const layer = layers.find((candidate) => candidate.id === layerId);
  if (!layer) return null;
  return structure(ARRAY_LENS_IDENTIFIER, layer.lens.id, {
    label: label?.(layer.id) ?? layer.lens.name,
    descriptors: descriptorsOf(layer.lens.descriptors) as JSONObject | undefined,
  });
};

/**
 * What a crop structure's id starts with before the crop exists. Never a lens
 * id: a run path that forgot to `materialize` is refused by the server rather
 * than run on another lens.
 */
export const CROP_ID_PREFIX = "cut:";

/** What a crop of `lens` to the shape is called: "<shape> on <image>". */
export const cropLabel = (roi: Pick<SelectedRoi, "name">, lens: Pick<Structure, "label">): string =>
  `${roi.name || "Shape"} on ${lens.label ?? "this image"}`;

/**
 * The crop of a lens to the shape — the lens `createLens(lens:, annotation:)`
 * would return — before it is made: an array lens with the descriptors the
 * server says the crop would have (`descriptorsUnder`), so the actions it fits
 * can be listed. Its id stands for the pair; the card makes the crop when an
 * action runs on it and hands the real lens over instead.
 */
export const cropLensObject = (
  roi: Pick<SelectedRoi, "id" | "name">,
  lens: Pick<Structure, "id" | "label">,
  descriptors: unknown,
): Structure =>
  structure(ARRAY_LENS_IDENTIFIER, `${CROP_ID_PREFIX}${lens.id}:${roi.id}`, {
    label: cropLabel(roi, lens),
    descriptors: descriptorsOf(descriptors),
  });

/** How far (px) the pointer may travel between press and release and still be a click. */
export const CLICK_SLOP_PX = 4;

/**
 * Where a click on a pick surface landed, scene world coordinates — or
 * undefined when the pointer travelled: R3F reports a pan or an orbit that
 * ENDS on a shape as a click too, and that still selects, but must not open
 * the menu.
 */
export const clickPointOf = (event: {
  delta: number;
  point: { x: number; y: number; z: number };
}): HoverPoint | undefined =>
  event.delta > CLICK_SLOP_PX ? undefined : [event.point.x, event.point.y, event.point.z];
