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

/**
 * The depth is set with the WHEEL. It used to follow the pointer's height
 * above where the rectangle was fixed, which only works while there is canvas
 * left above the pointer: fix the rectangle near the top edge and the box
 * could not grow, and past the edge no move arrives at all. A wheel has no
 * edge to run out of, and it leaves the pointer free.
 */

/** Wheel travel that makes one notch: a mouse wheel's click, in pixels. */
export const WHEEL_NOTCH_PX = 100;
/** A line-mode wheel event (`deltaMode` 1) in pixels: a click is three lines, and one notch. */
const WHEEL_LINE_PX = 34;
/** About how many notches take the box from one slice to the whole stack. */
const FULL_DEPTH_NOTCHES = 60;

/**
 * Depth steps per wheel notch: one slice while the stack is short enough to
 * walk a slice at a time, more on a long one, so a 600-slice stack does not
 * need 600 notches.
 */
export const depthStepsPerNotch = (slices: number): number =>
  slices > FULL_DEPTH_NOTCHES ? Math.ceil(slices / FULL_DEPTH_NOTCHES) : 1;

/**
 * Turns wheel events into whole notches. A mouse wheel sends one notch per
 * click; a trackpad sends a stream of small deltas, which add up here until
 * they make one. Returns the notches this event completed: positive when the
 * wheel goes UP (away from the user), which grows the box.
 */
export const createWheelNotches = () => {
  let carried = 0;
  return (event: { deltaY: number; deltaMode: number }): number => {
    const pixels = event.deltaMode === 1 ? event.deltaY * WHEEL_LINE_PX : event.deltaY;
    // A change of direction starts over: the leftover of the other way is not
    // travel in this one.
    if (carried !== 0 && Math.sign(pixels) !== Math.sign(carried)) carried = 0;
    carried += pixels;
    const notches = Math.trunc(carried / WHEEL_NOTCH_PX);
    carried -= notches * WHEEL_NOTCH_PX;
    return notches === 0 ? 0 : -notches;
  };
};

/**
 * The depth after `notches` of the wheel: never less than one slice (0 steps),
 * never more than the stack holds (`slices`; 0 when the scene has no z grid,
 * and then there is no ceiling to hold it to).
 */
export const depthAfterWheel = (steps: number, notches: number, slices: number): number => {
  const next = Math.max(0, steps + notches * depthStepsPerNotch(slices));
  return slices > 0 ? Math.min(slices, next) : next;
};
