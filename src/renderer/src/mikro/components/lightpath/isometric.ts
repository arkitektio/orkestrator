import { boxSize, partCenter, type Axis, type ElementPart, type LayoutNode, type Vec3 } from "./lightPathLayout";

/**
 * The stand's 3D space on paper: a view from the front right, above, with
 * no perspective, so equal parts stay equal wherever they stand. Flatter
 * than a true isometric (22° rather than 30°): the arms of a microscope run
 * sideways, and the panel this is drawn in is wider than it is tall.
 */

export type Point = [number, number];

const ANGLE = (22 * Math.PI) / 180;
const COS = Math.cos(ANGLE);
const SIN = Math.sin(ANGLE);

export const project = ([x, y, z]: Vec3): Point => [(x - z) * COS, (x + z) * SIN - y];

/** How near a point is to the viewer; larger is nearer. */
export const depth = ([x, y, z]: Vec3): number => x + y + z;

export type Face = { points: Point[]; shade: "top" | "right" | "left" | "flat" };

/** The three faces of an axis-aligned box the viewer can see. */
export const boxFaces = ([cx, cy, cz]: Vec3, [sx, sy, sz]: Vec3): Face[] => {
  const [x0, x1] = [cx - sx / 2, cx + sx / 2];
  const [y0, y1] = [cy - sy / 2, cy + sy / 2];
  const [z0, z1] = [cz - sz / 2, cz + sz / 2];
  const face = (shade: Face["shade"], corners: Vec3[]): Face => ({ shade, points: corners.map(project) });
  return [
    face("left", [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]),
    face("right", [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]]),
    face("top", [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]),
  ];
};

const UNIT: Record<Axis, Vec3> = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const ACROSS: Record<Axis, [Vec3, Vec3]> = {
  x: [UNIT.y, UNIT.z],
  y: [UNIT.x, UNIT.z],
  z: [UNIT.x, UNIT.y],
};

const SEGMENTS = 28;

const ring = (center: Vec3, axis: Axis, radius: number): Point[] => {
  const [u, v] = ACROSS[axis];
  return Array.from({ length: SEGMENTS }, (_, index) => {
    const angle = (index / SEGMENTS) * Math.PI * 2;
    const [cos, sin] = [Math.cos(angle) * radius, Math.sin(angle) * radius];
    return project([
      center[0] + u[0] * cos + v[0] * sin,
      center[1] + u[1] * cos + v[1] * sin,
      center[2] + u[2] * cos + v[2] * sin,
    ]);
  });
};

const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

/** Convex hull (monotone chain): the outline of a solid from its rim points. */
export const hull = (points: Point[]): Point[] => {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted;
  const half = (input: Point[]) => {
    const chain: Point[] = [];
    for (const point of input) {
      while (chain.length >= 2 && cross(chain[chain.length - 2], chain[chain.length - 1], point) <= 0) chain.pop();
      chain.push(point);
    }
    chain.pop();
    return chain;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
};

/** A cylinder (or a cone's frustum) lying along an axis: its outline and the end facing the viewer. */
export const cylinderFaces = (
  center: Vec3,
  axis: Axis,
  direction: 1 | -1,
  radius: number,
  radiusEnd: number,
  length: number,
): Face[] => {
  const along = UNIT[axis];
  const end = (sign: number): Vec3 => [
    center[0] + along[0] * sign * (length / 2),
    center[1] + along[1] * sign * (length / 2),
    center[2] + along[2] * sign * (length / 2),
  ];
  // `radiusEnd` is the downstream end; every axis points towards the viewer,
  // so the +axis end is the one seen.
  const near = ring(end(1), axis, direction === 1 ? radiusEnd : radius);
  const far = ring(end(-1), axis, direction === 1 ? radius : radiusEnd);
  return [
    { shade: axis === "y" ? "right" : "left", points: hull([...near, ...far]) },
    { shade: axis === "y" ? "top" : "right", points: near },
  ];
};

/** The square of a folding element, at 45° between the arm and the optical axis. */
export const plateFace = ([cx, cy, cz]: Vec3, size: number): Face => {
  const diagonal = size / 2 / Math.SQRT2;
  const half = size / 2;
  const corners: Vec3[] = [
    [cx - diagonal, cy - diagonal, cz - half],
    [cx + diagonal, cy + diagonal, cz - half],
    [cx + diagonal, cy + diagonal, cz + half],
    [cx - diagonal, cy - diagonal, cz + half],
  ];
  return { shade: "flat", points: corners.map(project) };
};

/** One solid of an element, as the faces to paint, back to front. */
export const partFaces = (node: LayoutNode, part: ElementPart): Face[] => {
  if (part.shape === "plate") return [plateFace(node.position, part.size)];
  const center = partCenter(node, part.offset);
  if (part.shape === "box") return boxFaces(center, boxSize(node.axis, part.along, part.height, part.depth));
  return cylinderFaces(center, node.axis, node.direction, part.radius, part.radiusEnd ?? part.radius, part.length);
};

export const toPath = (points: Point[], closed = true): string =>
  points.map(([u, v], index) => `${index === 0 ? "M" : "L"}${u.toFixed(3)} ${v.toFixed(3)}`).join(" ") +
  (closed ? " Z" : "");
