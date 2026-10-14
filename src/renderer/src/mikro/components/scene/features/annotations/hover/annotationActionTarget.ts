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
