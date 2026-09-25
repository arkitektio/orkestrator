import * as THREE from "three";

/**
 * How wide an annotation outline's pick band is.
 *
 * `platform/draw/Line.tsx` draws with three's WebGPU fat line, whose raycast
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
 * three, so this is the padding, not the total.
 */
export const ROI_PICK_RADIUS_PX = 8;

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
