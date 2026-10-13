import type { CropBox } from "../../platform/coords/cropBox";
import type { OutlinePoint } from "../../platform/model/geometry";

/**
 * The pure half of the crop gesture: the outline's points and the depth's
 * arithmetic. Kept out of the component so both are testable without a canvas.
 */

/**
 * `|ray.z|` below which the view counts as edge-on to the XY plane (about 7°).
 * Under it the cursor ray meets the rectangle's plane so far away, and moves
 * along it so fast, that a rectangle cannot be pointed at.
 */
export const EDGE_ON_LIMIT = 0.12;

type Corner = readonly [number, number, number?];

/** The closed rectangle between two corners, drawn at height `z`. */
export const rectOutline = (a: Corner, b: Corner, z: number): OutlinePoint[] => [
  [a[0], a[1], z],
  [b[0], a[1], z],
  [b[0], b[1], z],
  [a[0], b[1], z],
  [a[0], a[1], z],
];

/**
 * All twelve edges of the box as ONE polyline (the preview line draws a single
 * strip): the bottom loop, then each top edge with the vertical down to the
 * bottom corner it passes. Four edges are walked twice; none is missed.
 */
export const boxOutline = (box: CropBox): OutlinePoint[] => {
  const [x0, y0, z0] = box.min;
  const [x1, y1, z1] = box.max;
  const b: OutlinePoint[] = [
    [x0, y0, z0],
    [x1, y0, z0],
    [x1, y1, z0],
    [x0, y1, z0],
  ];
  const t: OutlinePoint[] = b.map(([x, y]) => [x, y, z1]);
  return [
    b[0], b[1], b[2], b[3], b[0],
    t[0], t[1], b[1], t[1], t[2], b[2], t[2], t[3], b[3], t[3], t[0],
  ];
};

/** Pointer travel per slice when the stack is short: fine enough to pick one slice by hand. */
const MAX_PX_PER_STEP = 12;
/** And when it is long: a pixel is the least a hand moves. */
const MIN_PX_PER_STEP = 1;
/** The share of the canvas height that reaches the whole stack. */
const FULL_DEPTH_TRAVEL = 0.4;

/**
 * Pointer pixels per depth step: `FULL_DEPTH_TRAVEL` of the canvas grows the
 * box from one slice to the whole stack (`slices`), so a 600-slice stack does
 * not need three screens of travel and a 10-slice one does not flip per pixel.
 */
export const depthPixelsPerStep = (canvasHeight: number, slices: number): number => {
  if (!(slices > 1) || !(canvasHeight > 0)) return MAX_PX_PER_STEP;
  const perStep = (canvasHeight * FULL_DEPTH_TRAVEL) / slices;
  return Math.min(MAX_PX_PER_STEP, Math.max(MIN_PX_PER_STEP, perStep));
};

/**
 * Depth steps for a pointer at `clientY`, the gesture having entered the depth
 * phase at `fromY`. Moving UP grows the box (screen y runs down, so the sign is
 * flipped); below where it started the box is one slice and stays one.
 */
export const depthSteps = (fromY: number, clientY: number, pixelsPerStep: number): number =>
  Math.max(0, Math.round((fromY - clientY) / Math.max(pixelsPerStep, 1e-6)));
