import { descriptorsOf, structure } from "@/core/smart/structure";
import type { JSONObject, Structure } from "@/core/types";

import { effectiveProbeLayerId } from "../../../platform/probe/probeTargeting";
import type { HoverPoint, SelectedRoi } from "../roiSelectionStore";

/**
 * What the click menu of a shape (`AnnotationActionMenu`) asks rekuest with:
 * the annotation as arg 0 and the lens the probe reads as arg 1, each with
 * the descriptors it PROVIDES, so a port's `Requires` narrows both sides
 * ("a rectangle", "a single-channel image"). Pure, so the pairing is testable
 * without a canvas.
 */

/**
 * The identifier an action types a pixel lens with. Deliberately not the UI's
 * `@mikro/lens`: mikro hosts one structure per lens kind and rekuest matches a
 * port's identifier exactly, so `@mikro/lens` would match no port at all.
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
 * The lens of the layer the probe reads (`effectiveProbeLayerId`: the pin,
 * else the first visible brick layer) — the image the user is "on". Null when
 * no layer can answer a probe; the menu then has nothing to pair the shape
 * with and says so, rather than listing one-argument actions.
 */
export const probeLensPartner = (
  probeLayerId: string | null,
  layers: readonly ProbeLensLayer[],
  label?: (layerId: string) => string | undefined,
): Structure | null => {
  const targetId = effectiveProbeLayerId(probeLayerId, layers);
  const layer = layers.find((candidate) => candidate.id === targetId);
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
