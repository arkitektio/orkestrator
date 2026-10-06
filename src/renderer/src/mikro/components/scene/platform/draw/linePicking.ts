import * as THREE from "three";

/**
 * How wide an annotation outline's pick band is.
 *
 * `@/core/data/scene/draw/Line` draws with three's WebGPU fat line, whose raycast
 * (`three/examples/jsm/lines/webgpu/LineSegments2.js`) works in SCREEN space: it
 * projects ray and segments into `NDC × resolution / 2` and accepts a hit when
 *
 *     distance < ( material.linewidth + params.Line2.threshold ) * 0.5
 *
 * Nothing configures `params.Line2`, so three's own `|| 0` fallback applies and
 * the pick radius is HALF the drawn stroke — under a pixel, and a DEVICE pixel
 * at that, so half a CSS pixel on a retina display. That is the whole reason an
 * ROI outline is so hard to click: you have to land the cursor on the hairline
 * itself.
 *
 * The resolution those pixels are measured in is `LineSegments2._resolution`,
 * which the line sets from `renderer.getViewport()` in `onBeforeRender` — device
 * pixels, and (0, 0) until the line has rendered once. So the threshold is in
 * device pixels too, and a CSS-pixel band has to be scaled by DPR.
 */

/**
 * Pick RADIUS around a stroke, in CSS pixels — how far off an outline a click
 * may land and still select it. The stroke's own half-width is added on top by
 * three, so this is the padding, not the total. Generous on purpose: a path
 * is nothing BUT its stroke, and hovering one is how its actions are reached.
 */
export const ROI_PICK_RADIUS_PX = 14;

/**
 * The radius expressed as three's threshold: it halves `linewidth + threshold`,
 * and measures in the viewport's device pixels. A missing or nonsensical DPR
 * falls back to 1× rather than collapsing the band to nothing.
 */
export const linePickThreshold = (dpr: number): number =>
  2 * ROI_PICK_RADIUS_PX * (Number.isFinite(dpr) && dpr > 0 ? dpr : 1);

/** Raycaster params, which three types loosely and does not declare Line2 on. */
type Line2Params = { Line2?: { threshold: number } };

/**
 * Widen every fat line's pick band. Global by nature — `params` belongs to the
 * raycaster — but only objects carrying event handlers are ever raycast, and in
 * this scene those are the annotation shapes.
 */
export function applyLinePickThreshold(
  raycaster: THREE.Raycaster,
  dpr: number,
): void {
  const params = raycaster.params as Line2Params;
  const threshold = linePickThreshold(dpr);
  if (params.Line2) {
    params.Line2.threshold = threshold;
    return;
  }
  params.Line2 = { threshold };
}

/** The parts of a fat-line hit `nearestLineHit` reads. */
type LineHit = { point: THREE.Vector3; pointOnLine?: THREE.Vector3 };

/**
 * Of one fat-line object's hits, the one whose stroke passes CLOSEST to the
 * pick ray — the path the pointer is actually nearest to.
 *
 * A wide pick band makes this necessary. A merged outline batch is ONE
 * object holding many shapes, and R3F keeps a single hit per object (its
 * dedupe key has no segment in it), choosing by distance along the ray.
 * Shapes on one plane all tie on that, so the winner was whichever segment
 * came first in the batch: with two paths inside the band, hover and click
 * landed on the wrong one about as often as the right one. Each hit carries
 * the ray point and the point on its segment; their gap is the miss
 * distance, and the smallest gap is the answer.
 */
export function nearestLineHit<H extends LineHit>(hits: readonly H[]): H | null {
  let best: H | null = null;
  let bestGap = Infinity;
  for (const hit of hits) {
    const gap = hit.pointOnLine ? hit.point.distanceToSquared(hit.pointOnLine) : 0;
    if (gap < bestGap) {
      bestGap = gap;
      best = hit;
    }
  }
  return best;
}

/**
 * Make a fat line report only its nearest hit (`nearestLineHit`). Wraps the
 * instance's own `raycast`; call once per line object.
 */
export function raycastNearestOnly(line: THREE.Object3D): void {
  const original = line.raycast.bind(line);
  const scratch: THREE.Intersection[] = [];
  line.raycast = (raycaster, intersects) => {
    scratch.length = 0;
    original(raycaster, scratch);
    const nearest = nearestLineHit(scratch as (THREE.Intersection & LineHit)[]);
    if (nearest) intersects.push(nearest);
  };
}
