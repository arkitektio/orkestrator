import type { CropBox } from "../../platform/coords/cropBox";
import type { OutlinePoint } from "../../platform/model/geometry";

/**
 * The pure half of the crop gesture: the outline's points and the wheel's
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

/** Wheel travel that counts as one step: under one mouse notch in every browser. */
const WHEEL_STEP = 40;
/** `deltaY` in lines (Firefox with a mouse) → pixels. */
const LINE_HEIGHT = 16;

/**
 * Whole steps out of a wheel event, and the travel left over.
 *
 * Scrolling UP grows the box, so the sign is flipped. A mouse notch (one event
 * of at least a step's travel) is exactly ONE step however large the browser
 * makes it; a trackpad's stream of small deltas adds up to steps, so 100 events
 * a second do not become 100 slices.
 */
export const wheelSteps = (
  event: { deltaY: number; deltaMode: number },
  remainder: number,
): { steps: number; remainder: number } => {
  const delta = -event.deltaY * (event.deltaMode === 1 ? LINE_HEIGHT : 1);
  if (delta === 0) return { steps: 0, remainder };
  if (Math.abs(delta) >= WHEEL_STEP) return { steps: Math.sign(delta), remainder: 0 };
  const total = remainder + delta;
  const steps = Math.trunc(total / WHEEL_STEP);
  return { steps, remainder: total - steps * WHEEL_STEP };
};
