import * as THREE from "three";
import { toBase } from "@/core/util/quantities";

/**
 * A neuron model's morphology, in world µm — the one geometry both the viewer
 * and the editor draw, pick against and anchor the network layer on.
 *
 * ## Real coordinates first, the synthetic layout as the fallback
 *
 * A section with two or more `coords` (NEURON pt3d points) is drawn where the
 * model says it is, tapering with the per-point `diam` when one is given.
 * A section without them — a stylised model, or one the editor just added
 * (`coords: []`) — is laid out the way the viewer always has: a straight run
 * of `length` µm, branching off its parent at `parentLocation` (see
 * `branchDirection`). The fallback is per SECTION, so a synthetic child hangs
 * correctly off a real parent: it starts at `pointAlong(parent, location)` and
 * branches around the parent's local tangent there.
 *
 * Pure (three's math only, no scene objects), so it runs under vitest.
 */

/** The structural slice of a section this module reads. The viewer passes
 *  `SectionFragment`s; the editor passes its live, locally edited copies. */
export type MorphologySectionInput = {
  id: string;
  diam?: string | number | null;
  length?: string | number | null;
  category?: string | null;
  coords?: readonly {
    x: string | number;
    y: string | number;
    z: string | number;
    diam?: string | number | null;
  }[] | null;
  parent?: { parent: string; parentLocation?: number | null } | null;
};

export type MorphologyCellInput = {
  id: string;
  topology: { sections: readonly MorphologySectionInput[] };
};

export type MorphologySection = {
  id: string;
  /** Index into `Morphology.sections` — the id the GPU buffers carry. */
  ordinal: number;
  cellId: string;
  category: string | null;
  parentId: string | null;
  /** Tree depth from the section's root (0 for a root). */
  depth: number;
  /** True when the section had no usable coords and was laid out. */
  synthetic: boolean;
  /** The centreline, ≥ 2 points. */
  points: THREE.Vector3[];
  /** Radius (µm) at each point. */
  radii: number[];
  /** Arc length (µm) from the first point to each point; `cumLength[0] === 0`. */
  cumLength: number[];
  /** Total centreline length (µm). */
  length: number;
  /** Index of this section's first segment in the flat segment table. */
  firstSegment: number;
};

export type Morphology = {
  sections: MorphologySection[];
  byId: Map<string, MorphologySection>;
  /**
   * One row per centreline segment (consecutive point pair), ready for
   * instancing: `segStart`/`segEnd` are xyz triples, `segRadius` the mean of
   * the two end radii, `segSection` the owning section's ordinal and
   * `segIndex` the segment's index within its section.
   */
  segmentCount: number;
  segStart: Float32Array;
  segEnd: Float32Array;
  segRadius: Float32Array;
  segSection: Uint32Array;
  segIndex: Uint32Array;
  /** Every point of every section, radius-padded. Empty for an empty model. */
  bounds: THREE.Box3;
  /** Centroid of the root sections' first points — the orbit pivot. */
  rootCentroid: THREE.Vector3;
  /** Distance from `rootCentroid` to the farthest radius-padded point. */
  radius: number;
  anySynthetic: boolean;
};

/** Diameter (µm) a section falls back to when it states none. */
const DEFAULT_DIAM_UM = 1;
/** Length (µm) a coords-less section falls back to when it states none. */
const DEFAULT_LENGTH_UM = 10;

const UP = new THREE.Vector3(0, 1, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);

/** A unit vector perpendicular to `vec` (any consistent choice). */
export const perpendicularTo = (vec: THREE.Vector3): THREE.Vector3 => {
  const v = vec.clone().normalize();
  const helper = Math.abs(v.dot(UP)) > 0.9 ? RIGHT : UP;
  return new THREE.Vector3().crossVectors(v, helper).normalize();
};

/**
 * The synthetic layout's branching rule (the editor's, now both surfaces'):
 * a child points back along its parent at the start tip, sideways at the
 * middle and forward at the end tip, swinging continuously between them as
 * `location` moves — so dragging a branch along its parent never jumps.
 * Co-located siblings spread evenly around the parent's axis (plus a
 * per-group phase so neighbouring groups don't all point one way), and never
 * closer than a 45° cone, which is the classic bifurcation at a tip.
 */
export const branchDirection = (
  parentDir: THREE.Vector3,
  location: number,
  siblingIndex: number,
  siblingCount: number,
  groupSeed: number,
): THREE.Vector3 => {
  const axis = parentDir.clone().normalize();
  const groupPhase = (groupSeed % 100) * 0.01 * Math.PI * 2;

  const radial = perpendicularTo(axis);
  const azimuth = siblingCount > 1 ? (siblingIndex * Math.PI * 2) / siblingCount : 0;
  radial.applyAxisAngle(axis, azimuth + groupPhase);

  // -1 at the start tip, 0 mid-section, +1 at the end tip.
  const axialBias = (location - 0.5) * 2;
  let radialMag = Math.sqrt(Math.max(0, 1 - axialBias * axialBias));
  if (siblingCount > 1) radialMag = Math.max(radialMag, Math.sin(Math.PI / 4));
  const axialMag = Math.sign(axialBias) * Math.sqrt(Math.max(0, 1 - radialMag * radialMag));

  const dir = axis.multiplyScalar(axialMag).add(radial.multiplyScalar(radialMag));
  if (dir.lengthSq() < 1e-6) return radial.normalize();
  return dir.normalize();
};

const seedOf = (key: string): number =>
  key.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

/** The coords a section can be drawn from, in µm — null when fewer than two parse. */
const realPoints = (
  section: MorphologySectionInput,
  fallbackRadius: number,
): { points: THREE.Vector3[]; radii: number[] } | null => {
  const coords = section.coords ?? [];
  if (coords.length < 2) return null;
  const points: THREE.Vector3[] = [];
  const radii: number[] = [];
  for (const c of coords) {
    const x = toBase(c.x, "length", NaN);
    const y = toBase(c.y, "length", NaN);
    const z = toBase(c.z, "length", NaN);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    points.push(new THREE.Vector3(x, y, z));
    const d = toBase(c.diam, "length", NaN);
    radii.push(Number.isFinite(d) && d > 0 ? d / 2 : fallbackRadius);
  }
  return points.length >= 2 ? { points, radii } : null;
};

const cumulative = (points: THREE.Vector3[]): number[] => {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + points[i].distanceTo(points[i - 1]));
  }
  return cum;
};

/**
 * The point and unit tangent `location` (0..1, by arc length) along a section.
 * A zero-length section reports its first point and +y.
 */
export const pointAlong = (
  section: Pick<MorphologySection, "points" | "cumLength" | "length">,
  location: number,
): { point: THREE.Vector3; tangent: THREE.Vector3; segment: number } => {
  const { points, cumLength, length } = section;
  const lastSegment = points.length - 2;
  if (!(length > 0)) {
    return { point: points[0].clone(), tangent: UP.clone(), segment: 0 };
  }
  const target = clamp01(location) * length;
  let i = 0;
  while (i < lastSegment && cumLength[i + 1] < target) i++;
  const segLength = cumLength[i + 1] - cumLength[i];
  const t = segLength > 0 ? (target - cumLength[i]) / segLength : 0;
  const a = points[i];
  const b = points[i + 1];
  const tangent = b.clone().sub(a);
  if (tangent.lengthSq() < 1e-12) tangent.copy(UP);
  return {
    point: a.clone().lerp(b, t),
    tangent: tangent.normalize(),
    segment: i,
  };
};

/**
 * The inverse of `pointAlong` for a pick: project `worldPoint` onto segment
 * `segment` of the section and return its fractional location (0..1).
 */
export const locationOf = (
  section: Pick<MorphologySection, "points" | "cumLength" | "length">,
  segment: number,
  worldPoint: THREE.Vector3,
): number => {
  const { points, cumLength, length } = section;
  if (!(length > 0)) return 0;
  const i = Math.max(0, Math.min(segment, points.length - 2));
  const a = points[i];
  const ab = points[i + 1].clone().sub(a);
  const segLengthSq = ab.lengthSq();
  const t = segLengthSq > 0 ? clamp01(worldPoint.clone().sub(a).dot(ab) / segLengthSq) : 0;
  return clamp01((cumLength[i] + t * Math.sqrt(segLengthSq)) / length);
};

/** Build the morphology of every cell. Section ids are treated as unique across the model. */
export const buildMorphology = (cells: readonly MorphologyCellInput[]): Morphology => {
  const inputs = new Map<string, { section: MorphologySectionInput; cellId: string }>();
  const children = new Map<string, MorphologySectionInput[]>();
  const order: MorphologySectionInput[] = [];

  for (const cell of cells) {
    for (const section of cell.topology.sections) {
      if (inputs.has(section.id)) continue;
      inputs.set(section.id, { section, cellId: cell.id });
      order.push(section);
      const parentId = section.parent?.parent;
      if (parentId) {
        if (!children.has(parentId)) children.set(parentId, []);
        children.get(parentId)!.push(section);
      }
    }
  }

  const sections: MorphologySection[] = [];
  const byId = new Map<string, MorphologySection>();

  const place = (
    section: MorphologySectionInput,
    cellId: string,
    parent: MorphologySection | null,
    depth: number,
  ) => {
    if (byId.has(section.id)) return; // a cycle or a repeat: place once
    const radius = toBase(section.diam, "length", DEFAULT_DIAM_UM) / 2;
    const real = realPoints(section, radius);

    let points: THREE.Vector3[];
    let radii: number[];
    if (real) {
      points = real.points;
      radii = real.radii;
    } else {
      let start = new THREE.Vector3();
      let direction = UP.clone();
      const connection = section.parent;
      if (parent && connection) {
        const location = connection.parentLocation ?? 1;
        const anchor = pointAlong(parent, location);
        start = anchor.point;
        // Siblings sharing this attachment point share a fan.
        const coLocated = (children.get(parent.id) ?? [])
          .filter((s) => Math.abs((s.parent?.parentLocation ?? 1) - location) < 0.001)
          .sort((a, b) => a.id.localeCompare(b.id));
        direction = branchDirection(
          anchor.tangent,
          location,
          coLocated.findIndex((s) => s.id === section.id),
          coLocated.length,
          seedOf(`${parent.id}-${location.toFixed(2)}`),
        );
      }
      const length = toBase(section.length, "length", DEFAULT_LENGTH_UM);
      points = [start, start.clone().add(direction.multiplyScalar(length))];
      radii = [radius, radius];
    }

    const cumLength = cumulative(points);
    const placed: MorphologySection = {
      id: section.id,
      ordinal: sections.length,
      cellId,
      category: section.category ?? null,
      parentId: section.parent?.parent ?? null,
      depth,
      synthetic: !real,
      points,
      radii,
      cumLength,
      length: cumLength[cumLength.length - 1],
      firstSegment: 0,
    };
    sections.push(placed);
    byId.set(placed.id, placed);

    for (const child of children.get(section.id) ?? []) {
      place(child, inputs.get(child.id)!.cellId, placed, depth + 1);
    }
  };

  // Roots are sections with no parent — or whose parent is not in the model,
  // which must still be drawn rather than silently dropped.
  const roots = order.filter((s) => !s.parent?.parent || !inputs.has(s.parent.parent));
  for (const root of roots) place(root, inputs.get(root.id)!.cellId, null, 0);
  // Anything left sits on a parent cycle; lay it out from the origin.
  for (const section of order) {
    if (!byId.has(section.id)) place(section, inputs.get(section.id)!.cellId, null, 0);
  }

  // Flat segment table.
  let segmentCount = 0;
  for (const s of sections) {
    s.firstSegment = segmentCount;
    segmentCount += s.points.length - 1;
  }
  const segStart = new Float32Array(segmentCount * 3);
  const segEnd = new Float32Array(segmentCount * 3);
  const segRadius = new Float32Array(segmentCount);
  const segSection = new Uint32Array(segmentCount);
  const segIndex = new Uint32Array(segmentCount);
  const bounds = new THREE.Box3();
  const pad = new THREE.Vector3();

  for (const s of sections) {
    for (let i = 0; i < s.points.length; i++) {
      pad.setScalar(s.radii[i]);
      bounds.expandByPoint(s.points[i].clone().add(pad));
      bounds.expandByPoint(s.points[i].clone().sub(pad));
      if (i === s.points.length - 1) continue;
      const row = s.firstSegment + i;
      s.points[i].toArray(segStart, row * 3);
      s.points[i + 1].toArray(segEnd, row * 3);
      segRadius[row] = (s.radii[i] + s.radii[i + 1]) / 2;
      segSection[row] = s.ordinal;
      segIndex[row] = i;
    }
  }

  const rootSections = sections.filter((s) => s.depth === 0);
  const rootCentroid = new THREE.Vector3();
  for (const s of rootSections) rootCentroid.add(s.points[0]);
  if (rootSections.length > 0) rootCentroid.multiplyScalar(1 / rootSections.length);

  let radius = 0;
  for (const s of sections) {
    for (let i = 0; i < s.points.length; i++) {
      radius = Math.max(radius, s.points[i].distanceTo(rootCentroid) + s.radii[i]);
    }
  }

  return {
    sections,
    byId,
    segmentCount,
    segStart,
    segEnd,
    segRadius,
    segSection,
    segIndex,
    bounds,
    rootCentroid,
    radius,
    anySynthetic: sections.some((s) => s.synthetic),
  };
};
