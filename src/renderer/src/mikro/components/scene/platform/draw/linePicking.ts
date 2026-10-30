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
 * A batch's primitives (segments, triangles) cut into short runs with a bounding
 * box each, in the batch's local space: what lets a pick test the runs the ray
 * can reach instead of every primitive, on every pointer move.
 *
 * A run never crosses a shape, so a small shape is one box, and a long one (a
 * traced path, a freehand stroke, whose box would cover the image) is many.
 */
export type PickIndex = {
  positions: Float32Array;
  /** Floats per primitive: 6 for a fat-line segment, 9 for a triangle. */
  stride: number;
  starts: Uint32Array;
  ends: Uint32Array;
  /** min xyz, max xyz per run. */
  bounds: Float32Array;
};

const PICK_RUN = 64;

export function buildPickIndex(
  positions: Float32Array,
  ranges: readonly { start: number; end: number }[],
  stride: number,
): PickIndex {
  let runs = 0;
  for (const { start, end } of ranges) runs += Math.ceil((end - start) / PICK_RUN);
  const starts = new Uint32Array(runs);
  const ends = new Uint32Array(runs);
  const bounds = new Float32Array(runs * 6);
  let run = 0;
  for (const { start, end } of ranges) {
    for (let from = start; from < end; from += PICK_RUN) {
      const to = Math.min(end, from + PICK_RUN);
      let minX = Infinity;
      let minY = Infinity;
      let minZ = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let maxZ = -Infinity;
      for (let i = from * stride; i < to * stride; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (z < minZ) minZ = z;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        if (z > maxZ) maxZ = z;
      }
      starts[run] = from;
      ends[run] = to;
      bounds.set([minX, minY, minZ, maxX, maxY, maxZ], run * 6);
      run += 1;
    }
  }
  return { positions, stride, starts, ends, bounds };
}

/** Built on the first pick: a batch in a mode that never picks pays nothing. */
export const lazyPickIndex = (
  positions: Float32Array,
  ranges: readonly { start: number; end: number }[],
  stride: number,
): (() => PickIndex) => {
  let index: PickIndex | null = null;
  return () => (index ??= buildPickIndex(positions, ranges, stride));
};

/** Slop on the box test, so rounding never loses a hit on a box's very edge. */
const BOX_TOLERANCE = 1e-6;

/** Does the ray's line, from `tStart` on, pass through the box grown by `margin`? */
const reachesBox = (
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  bounds: ArrayLike<number>,
  offset: number,
  margin: number,
  tStart: number,
): boolean => {
  let tMin = tStart;
  let tMax = Infinity;
  for (let axis = 0; axis < 3; axis++) {
    const o = axis === 0 ? origin.x : axis === 1 ? origin.y : origin.z;
    const d = axis === 0 ? direction.x : axis === 1 ? direction.y : direction.z;
    const min = bounds[offset + axis] - margin;
    const max = bounds[offset + axis + 3] + margin;
    if (d === 0) {
      if (o < min || o > max) return false;
      continue;
    }
    const t0 = (min - o) / d;
    const t1 = (max - o) / d;
    if (t0 < t1) {
      if (t0 > tMin) tMin = t0;
      if (t1 < tMax) tMax = t1;
    } else {
      if (t1 > tMin) tMin = t1;
      if (t0 < tMax) tMax = t0;
    }
    if (tMin > tMax + BOX_TOLERANCE * (Math.abs(tMin) + Math.abs(tMax) + 1)) return false;
  }
  return true;
};

/** A run box pulled through a matrix: the box of its image, no corner walk. */
const transformBox = (
  source: ArrayLike<number>,
  offset: number,
  m: ArrayLike<number>,
  target: Float64Array,
  targetOffset: number,
): void => {
  for (let row = 0; row < 3; row++) {
    let min = m[12 + row];
    let max = m[12 + row];
    for (let column = 0; column < 3; column++) {
      const k = m[column * 4 + row];
      const a = k * source[offset + column];
      const b = k * source[offset + column + 3];
      min += Math.min(a, b);
      max += Math.max(a, b);
    }
    target[targetOffset + row] = min;
    target[targetOffset + row + 3] = max;
  }
};

/**
 * The world half-width of the pick band at a view depth, as three's own
 * `getWorldSpaceHalfWidth`: `radiusPx` through the projection and back.
 */
const clipOffset = new THREE.Vector4();
const worldHalfWidth = (
  camera: THREE.Camera,
  depth: number,
  lineWidth: number,
  resolution: THREE.Vector2,
): number => {
  clipOffset.set(0, 0, -depth, 1).applyMatrix4(camera.projectionMatrix);
  clipOffset.multiplyScalar(1 / clipOffset.w);
  clipOffset.x = lineWidth / resolution.x;
  clipOffset.y = lineWidth / resolution.y;
  clipOffset.applyMatrix4(camera.projectionMatrixInverse);
  clipOffset.multiplyScalar(1 / clipOffset.w);
  return Math.abs(Math.max(clipOffset.x, clipOffset.y));
};

const corner = new THREE.Vector3();
const ssOrigin = new THREE.Vector4();
const ssOrigin3 = new THREE.Vector3();
const start4 = new THREE.Vector4();
const end4 = new THREE.Vector4();
const mvMatrix = new THREE.Matrix4();
const screenLine = new THREE.Line3();
const closestPoint = new THREE.Vector3();
const worldStart = new THREE.Vector3();
const worldEnd = new THREE.Vector3();
const pointOnRay = new THREE.Vector3();
const pointOnSegment = new THREE.Vector3();
const bestPoint = new THREE.Vector3();
const bestPointOnLine = new THREE.Vector3();

type FatLine = THREE.Mesh & {
  _resolution: THREE.Vector2;
  material: THREE.Material & { linewidth: number; worldUnits?: boolean };
};

/** The run boxes in world space, kept until the line's matrix moves. */
type WorldRuns = { matrix: Float64Array; bounds: Float64Array; whole: Float64Array };

const worldRunsOf = (index: PickIndex, matrix: ArrayLike<number>, cached: WorldRuns | null) => {
  if (cached) {
    let same = true;
    for (let i = 0; i < 16 && same; i++) same = cached.matrix[i] === matrix[i];
    if (same) return cached;
  }
  const count = index.starts.length;
  const bounds = new Float64Array(count * 6);
  const whole = new Float64Array([Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]);
  for (let run = 0; run < count; run++) {
    transformBox(index.bounds, run * 6, matrix, bounds, run * 6);
    for (let axis = 0; axis < 3; axis++) {
      whole[axis] = Math.min(whole[axis], bounds[run * 6 + axis]);
      whole[axis + 3] = Math.max(whole[axis + 3], bounds[run * 6 + axis + 3]);
    }
  }
  return { matrix: Float64Array.from(matrix as ArrayLike<number>), bounds, whole };
};

/**
 * Three's screen-space fat-line test (`LineSegments2`'s `raycastScreenSpace`,
 * the same arithmetic), over the runs the ray can reach, keeping the nearest
 * hit as `nearestLineHit` would without building an object per hit.
 *
 * The run test is conservative: a stroke hit means the ray passes within the
 * band's world half-width of that stroke at its depth, and the half-width only
 * grows with depth, so a box grown by the width at the batch's FARTHEST depth
 * cannot lose one. `linePicking.test.ts` holds it to three's own answer.
 */
function raycastRuns(
  line: FatLine,
  raycaster: THREE.Raycaster,
  index: PickIndex,
  runs: WorldRuns,
  intersects: THREE.Intersection[],
): void {
  const { camera, ray } = raycaster;
  const resolution = line._resolution;
  const threshold = (raycaster.params as Line2Params).Line2?.threshold || 0;
  const lineWidth = line.material.linewidth + threshold;

  let farthest = camera.near;
  for (let i = 0; i < 8; i++) {
    corner
      .set(
        runs.whole[i & 1 ? 3 : 0],
        runs.whole[i & 2 ? 4 : 1],
        runs.whole[i & 4 ? 5 : 2],
      )
      .applyMatrix4(camera.matrixWorldInverse);
    if (-corner.z > farthest) farthest = -corner.z;
  }
  const width = worldHalfWidth(camera, farthest, lineWidth, resolution);
  // Before the first draw the resolution is (0, 0) and the width means nothing.
  const margin = Number.isFinite(width) ? width : null;
  const reaches = (bounds: ArrayLike<number>, offset: number) =>
    margin === null ||
    reachesBox(ray.origin, ray.direction, bounds, offset, margin, -Infinity);
  if (!reaches(runs.whole, 0)) return;

  const near = -camera.near;
  ray.at(1, pointOnRay);
  ssOrigin.set(pointOnRay.x, pointOnRay.y, pointOnRay.z, 1);
  ssOrigin.applyMatrix4(camera.matrixWorldInverse);
  ssOrigin.applyMatrix4(camera.projectionMatrix);
  ssOrigin.multiplyScalar(1 / ssOrigin.w);
  ssOrigin.x *= resolution.x / 2;
  ssOrigin.y *= resolution.y / 2;
  ssOrigin3.set(ssOrigin.x, ssOrigin.y, 0);

  mvMatrix.multiplyMatrices(camera.matrixWorldInverse, line.matrixWorld);

  const { positions, starts, ends } = index;
  let bestSegment = -1;
  let bestGap = Infinity;
  for (let run = 0; run < starts.length; run++) {
    if (!reaches(runs.bounds, run * 6)) continue;
    for (let i = starts[run]; i < ends[run]; i++) {
      const at = i * 6;
      start4.set(positions[at], positions[at + 1], positions[at + 2], 1).applyMatrix4(mvMatrix);
      end4.set(positions[at + 3], positions[at + 4], positions[at + 5], 1).applyMatrix4(mvMatrix);

      if (start4.z > near && end4.z > near) continue;
      if (start4.z > near) {
        start4.lerp(end4, (start4.z - near) / (start4.z - end4.z));
      } else if (end4.z > near) {
        end4.lerp(start4, (end4.z - near) / (end4.z - start4.z));
      }

      start4.applyMatrix4(camera.projectionMatrix);
      end4.applyMatrix4(camera.projectionMatrix);
      start4.multiplyScalar(1 / start4.w);
      end4.multiplyScalar(1 / end4.w);
      start4.x *= resolution.x / 2;
      start4.y *= resolution.y / 2;
      end4.x *= resolution.x / 2;
      end4.y *= resolution.y / 2;

      screenLine.start.set(start4.x, start4.y, 0);
      screenLine.end.set(end4.x, end4.y, 0);
      const param = screenLine.closestPointToPointParameter(ssOrigin3, true);
      screenLine.at(param, closestPoint);

      const zPos = THREE.MathUtils.lerp(start4.z, end4.z, param);
      if (zPos < -1 || zPos > 1) continue;
      if (ssOrigin3.distanceTo(closestPoint) >= lineWidth * 0.5) continue;

      worldStart
        .set(positions[at], positions[at + 1], positions[at + 2])
        .applyMatrix4(line.matrixWorld);
      worldEnd
        .set(positions[at + 3], positions[at + 4], positions[at + 5])
        .applyMatrix4(line.matrixWorld);
      ray.distanceSqToSegment(worldStart, worldEnd, pointOnRay, pointOnSegment);
      const gap = pointOnRay.distanceToSquared(pointOnSegment);
      if (gap < bestGap) {
        bestGap = gap;
        bestSegment = i;
        bestPoint.copy(pointOnRay);
        bestPointOnLine.copy(pointOnSegment);
      }
    }
  }
  if (bestSegment < 0) return;
  intersects.push({
    point: bestPoint.clone(),
    pointOnLine: bestPointOnLine.clone(),
    distance: ray.origin.distanceTo(bestPoint),
    object: line,
    face: null,
    faceIndex: bestSegment,
  } as THREE.Intersection);
}

/**
 * Make a fat line report only its nearest hit (`nearestLineHit`). Wraps the
 * instance's own `raycast`; call once per line object.
 *
 * `pickIndex` is the batch's index when it has one, and is what an annotation
 * batch must pass: without it every pointer move tests every segment. World-unit
 * lines, which three tests differently, always take three's path.
 */
export function raycastNearestOnly(
  line: THREE.Object3D,
  pickIndex?: () => PickIndex | null,
): void {
  const original = line.raycast.bind(line);
  const scratch: THREE.Intersection[] = [];
  let source: PickIndex | null = null;
  let runs: WorldRuns | null = null;
  line.raycast = (raycaster, intersects) => {
    const index = pickIndex?.() ?? null;
    const fatLine = line as FatLine;
    if (index && !fatLine.material.worldUnits) {
      if (index !== source) {
        source = index;
        runs = null;
      }
      runs = worldRunsOf(index, line.matrixWorld.elements, runs);
      raycastRuns(fatLine, raycaster, index, runs, intersects);
      return;
    }
    scratch.length = 0;
    original(raycaster, scratch);
    const nearest = nearestLineHit(scratch as (THREE.Intersection & LineHit)[]);
    if (nearest) intersects.push(nearest);
  };
}

const localRay = new THREE.Ray();
const inverseWorld = new THREE.Matrix4();
const triangleA = new THREE.Vector3();
const triangleB = new THREE.Vector3();
const triangleC = new THREE.Vector3();
const triangleHit = new THREE.Vector3();
const nearestTriangleHit = new THREE.Vector3();

/**
 * A `raycast` for a merged, double-sided triangle batch: `Mesh.raycast`'s test
 * over the runs the ray can reach, reporting the nearest triangle. One hit is
 * all the event system keeps of an object anyway (nearest first, first wins).
 */
export function createPickMeshRaycast(
  pickIndex: () => PickIndex,
): (this: THREE.Object3D, raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) => void {
  return function raycast(raycaster, intersects) {
    const { positions, starts, ends, bounds } = pickIndex();
    localRay.copy(raycaster.ray).applyMatrix4(inverseWorld.copy(this.matrixWorld).invert());
    let best = -1;
    let bestDistance = Infinity;
    for (let run = 0; run < starts.length; run++) {
      if (!reachesBox(localRay.origin, localRay.direction, bounds, run * 6, 0, 0)) continue;
      for (let i = starts[run]; i < ends[run]; i++) {
        const at = i * 9;
        triangleA.set(positions[at], positions[at + 1], positions[at + 2]);
        triangleB.set(positions[at + 3], positions[at + 4], positions[at + 5]);
        triangleC.set(positions[at + 6], positions[at + 7], positions[at + 8]);
        if (!localRay.intersectTriangle(triangleA, triangleB, triangleC, false, triangleHit)) {
          continue;
        }
        triangleHit.applyMatrix4(this.matrixWorld);
        const distance = raycaster.ray.origin.distanceTo(triangleHit);
        if (distance < raycaster.near || distance > raycaster.far) continue;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
          nearestTriangleHit.copy(triangleHit);
        }
      }
    }
    if (best < 0) return;
    intersects.push({
      distance: bestDistance,
      point: nearestTriangleHit.clone(),
      object: this,
      faceIndex: best,
    } as THREE.Intersection);
  };
}
