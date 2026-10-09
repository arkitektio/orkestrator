import { ElementKind } from "@/mikro/api/graphql";
import type { LightPath, PathBeam, PathElement, Phase } from "./lightPathModel";

/**
 * Where everything of a light path stands, in one 3D space: x to the right,
 * y up, z towards the viewer. The isometric drawing and the three.js view
 * are both built from this, so they cannot disagree about where a part is.
 *
 * A graph that records a pose for every element is laid out by those poses.
 * No graph in the wild does, so the default is the stand of an inverted
 * microscope: the sample on the stage, the objective under it, the
 * illumination coming in from the left onto the cube, the detection leaving
 * to the right one level lower. A source that lights the sample without
 * passing the objective (transmitted light) stands above the stage instead.
 */

export type Vec3 = [number, number, number];
export type Axis = "x" | "y" | "z";

export type LayoutNode = {
  id: string;
  entry: PathElement;
  position: Vec3;
  /** The axis the beam passes the element along. */
  axis: Axis;
  /** +1 when the light travels along `axis`, -1 against it. */
  direction: 1 | -1;
  /** Wavelength of the light leaving it, when the graph states one. */
  nm: number | null;
};

export type LayoutBeam = {
  id: string;
  beam: PathBeam;
  phase: Phase;
  nm: number | null;
  points: Vec3[];
};

/** A part of the stand nobody recorded: context, drawn faintly. */
export type GhostPart = {
  id: "stage" | "body" | "base" | "cube" | "turn" | "port" | "pillar";
  center: Vec3;
  /** Extent along x, y, z. */
  size: Vec3;
};

export type LightPathLayout = {
  nodes: LayoutNode[];
  beams: LayoutBeam[];
  ghost: GhostPart[];
  /** Laid out from recorded poses rather than on the generic stand. */
  posed: boolean;
};

/** Distance between neighbours along an arm, and along the optical axis. */
export const ARM_STEP = 1.25;
export const AXIS_STEP = 0.85;
const LANE_STEP = 0.9;
export const STAGE_Y = 3;
/** How far the two passes of a shared stretch are drawn apart. */
const PASS_OFFSET = 0.07;

const FOLDING: ReadonlySet<ElementKind> = new Set([ElementKind.Mirror, ElementKind.BeamSplitter]);

/** 1-based rank of each distinct order, nearest the sample first. */
const ranks = (entries: PathElement[]): Map<number, number> => {
  const orders = [...new Set(entries.map((entry) => entry.order))].sort((a, b) => a - b);
  return new Map(orders.map((order, index) => [order, index + 1]));
};

const laneOffset = (entry: PathElement, entries: PathElement[]): number => {
  const count = entries.filter((other) => other.order === entry.order).length;
  return (entry.lane - (count - 1) / 2) * LANE_STEP;
};

const posedPositions = (path: LightPath): Map<string, Vec3> | null => {
  const raw = new Map<string, Vec3>();
  for (const { id, element } of path.elements) {
    const position = element.pose?.position;
    if (position?.x == null || position.y == null || position.z == null) return null;
    raw.set(id, [position.x, position.y, position.z]);
  }
  if (raw.size < 2) return null;
  const axes = [0, 1, 2] as const;
  const min = axes.map((axis) => Math.min(...[...raw.values()].map((point) => point[axis])));
  const max = axes.map((axis) => Math.max(...[...raw.values()].map((point) => point[axis])));
  const span = Math.max(...axes.map((axis) => max[axis] - min[axis]));
  // Every element in one spot is a pose nobody filled in, not a layout.
  if (span === 0) return null;
  const scale = (ARM_STEP * Math.max(2, raw.size - 1)) / span;
  return new Map(
    [...raw].map(([id, point]) => [
      id,
      axes.map((axis) => (point[axis] - (min[axis] + max[axis]) / 2) * scale) as Vec3,
    ]),
  );
};

const onAxis = (point: Vec3) => point[0] === 0 && point[2] === 0;

/** Light runs along the stand's axes: a beam leaving the axis turns a corner. */
const route = (from: Vec3, to: Vec3): Vec3[] => {
  if (from[1] === to[1] || onAxis(from) === onAxis(to)) return [from, to];
  const off = onAxis(from) ? to : from;
  return [from, [0, off[1], 0], to];
};

export const layoutLightPath = (path: LightPath): LightPathLayout => {
  const leaving = new Map<string, number | null>();
  for (const beam of path.beams) {
    if (beam.nm !== null || !leaving.has(beam.from)) leaving.set(beam.from, beam.nm);
  }

  const posed = posedPositions(path);
  if (posed) {
    return {
      nodes: path.elements.map((entry) => ({
        id: entry.id,
        entry,
        position: posed.get(entry.id)!,
        axis: "x",
        direction: 1,
        nm: leaving.get(entry.id) ?? null,
      })),
      beams: path.beams.map((beam) => ({
        id: beam.id,
        beam,
        phase: beam.phase,
        nm: beam.nm,
        points: [posed.get(beam.from)!, posed.get(beam.to)!],
      })),
      ghost: [],
      posed: true,
    };
  }

  const of = (arm: PathElement["arm"]) => path.elements.filter((entry) => entry.arm === arm);
  const shared = of("shared");
  const illumination = of("illumination");
  const detection = of("detection");
  const samples = of("sample");
  const loose = of("loose");

  const sharedRank = ranks(shared);
  const deepest = shared.reduce<PathElement | null>(
    (best, entry) => (best === null || entry.order > best.order ? entry : best),
    null,
  );
  // The cube: where the illumination meets the axis. A recorded mirror or
  // splitter at the foot of the axis is it; otherwise the place is a ghost.
  const recordedFold = path.epi && deepest !== null && FOLDING.has(deepest.kind);
  const foldY = recordedFold
    ? STAGE_Y - AXIS_STEP * sharedRank.get(deepest!.order)!
    : STAGE_Y - AXIS_STEP * (sharedRank.size + 1);
  // Emission passes the cube and leaves one level further down.
  const exitY = path.epi ? foldY - AXIS_STEP * 1.15 : foldY;

  const positions = new Map<string, Vec3>();
  const nodes: LayoutNode[] = [];
  const place = (entry: PathElement, position: Vec3, axis: Axis, direction: 1 | -1) => {
    positions.set(entry.id, position);
    nodes.push({ id: entry.id, entry, position, axis, direction, nm: leaving.get(entry.id) ?? null });
  };

  for (const entry of samples) {
    place(entry, [(entry.lane - (samples.length - 1) / 2) * LANE_STEP * 1.4, STAGE_Y, 0], "y", 1);
  }
  for (const entry of shared) {
    // The objective points up at the sample.
    place(entry, [0, STAGE_Y - AXIS_STEP * sharedRank.get(entry.order)!, 0], "y", 1);
  }

  const inRank = ranks(illumination);
  for (const entry of illumination) {
    const rank = inRank.get(entry.order)!;
    const lane = laneOffset(entry, illumination);
    if (path.epi) place(entry, [-ARM_STEP * rank, foldY, lane], "x", 1);
    else place(entry, [lane, STAGE_Y + AXIS_STEP * (rank + 0.2), 0], "y", -1);
  }

  const outRank = ranks(detection);
  for (const entry of detection) {
    place(entry, [ARM_STEP * outRank.get(entry.order)!, exitY, laneOffset(entry, detection)], "x", 1);
  }

  loose.forEach((entry, index) => {
    place(entry, [(index - (loose.length - 1) / 2) * ARM_STEP * 0.8, exitY, 1.7], "x", 1);
  });

  const beams = path.beams.map((beam): LayoutBeam => {
    // Two passes of one stretch (in and out through the objective) are drawn
    // side by side, or the second would cover the first.
    const shift = (beam.phase === "illumination" ? -1 : 1) * (path.epi ? PASS_OFFSET : 0);
    const points = route(positions.get(beam.from)!, positions.get(beam.to)!).map(
      ([x, y, z]): Vec3 => [x + shift, y, z],
    );
    return { id: beam.id, beam, phase: beam.phase, nm: beam.nm, points };
  });

  const lowest = Math.min(exitY, foldY) - 0.55;
  const ghost: GhostPart[] = [
    { id: "stage", center: [0, STAGE_Y - 0.14, 0], size: [2.4, 0.1, 1.6] },
    { id: "body", center: [0, (STAGE_Y - 0.5 + lowest) / 2, 0], size: [1.1, STAGE_Y - 0.5 - lowest, 1.1] },
    { id: "base", center: [0, lowest - 0.06, 0], size: [2.6, 0.12, 1.8] },
  ];
  if (path.epi && !recordedFold) ghost.push({ id: "cube", center: [0, foldY, 0], size: [0.5, 0.5, 0.5] });
  if (path.epi && detection.length > 0) ghost.push({ id: "turn", center: [0, exitY, 0], size: [0.4, 0.4, 0.4] });
  if (detection.length > 0) {
    ghost.push({ id: "port", center: [(0.55 + ARM_STEP) / 2, exitY, 0], size: [ARM_STEP - 0.55, 0.34, 0.34] });
  }
  if (!path.epi && illumination.length > 0) {
    // The arm a transmitted-light source hangs from.
    const top = STAGE_Y + AXIS_STEP * (inRank.size + 0.9);
    ghost.push({ id: "pillar", center: [0, (STAGE_Y + top) / 2, -0.9], size: [0.3, top - STAGE_Y, 0.3] });
  }

  return { nodes, beams, ghost, posed: false };
};

/* ─────────────────────── what an element is made of ─────────────────────── */

export type PartTone = "body" | "metal" | "glass" | "tint" | "sensor" | "slide" | "hole";

/**
 * One solid of an element, in the element's own frame: `along` is the beam
 * axis (positive towards where the light goes), the other two extents are
 * across it. Both renderers turn these into their own geometry.
 */
export type ElementPart =
  | { shape: "box"; along: number; height: number; depth: number; offset?: number; tone: PartTone }
  | { shape: "cylinder"; radius: number; radiusEnd?: number; length: number; offset?: number; tone: PartTone }
  /** A thin square at 45° to the beam: what folds it. */
  | { shape: "plate"; size: number; tone: PartTone };

const DISC = (tone: PartTone): ElementPart[] => [{ shape: "cylinder", radius: 0.27, length: 0.07, tone }];
const STOP: ElementPart[] = [
  { shape: "cylinder", radius: 0.28, length: 0.05, tone: "body" },
  { shape: "cylinder", radius: 0.07, length: 0.07, tone: "hole" },
];

export const ELEMENT_PARTS: Record<ElementKind, ElementPart[]> = {
  [ElementKind.Laser]: [
    { shape: "box", along: 0.95, height: 0.36, depth: 0.36, tone: "body" },
    { shape: "cylinder", radius: 0.09, length: 0.14, offset: 0.54, tone: "metal" },
  ],
  [ElementKind.Lamp]: [
    { shape: "box", along: 0.55, height: 0.5, depth: 0.5, tone: "body" },
    { shape: "cylinder", radius: 0.17, length: 0.2, offset: 0.37, tone: "metal" },
  ],
  [ElementKind.OtherSource]: [
    { shape: "box", along: 0.55, height: 0.42, depth: 0.42, tone: "body" },
    { shape: "cylinder", radius: 0.12, length: 0.16, offset: 0.35, tone: "metal" },
  ],
  [ElementKind.Objective]: [
    { shape: "cylinder", radius: 0.3, length: 0.3, offset: -0.2, tone: "metal" },
    { shape: "cylinder", radius: 0.3, radiusEnd: 0.13, length: 0.32, offset: 0.11, tone: "metal" },
    { shape: "cylinder", radius: 0.1, length: 0.04, offset: 0.29, tone: "glass" },
  ],
  [ElementKind.Lens]: [{ shape: "cylinder", radius: 0.3, length: 0.09, tone: "glass" }],
  [ElementKind.Mirror]: [{ shape: "plate", size: 0.55, tone: "metal" }],
  [ElementKind.BeamSplitter]: [
    { shape: "box", along: 0.46, height: 0.46, depth: 0.46, tone: "glass" },
    { shape: "plate", size: 0.6, tone: "tint" },
  ],
  [ElementKind.Filter]: DISC("tint"),
  [ElementKind.Polarizer]: DISC("glass"),
  [ElementKind.Waveplate]: DISC("glass"),
  [ElementKind.Pinhole]: STOP,
  [ElementKind.Aperture]: STOP,
  [ElementKind.Shutter]: STOP,
  [ElementKind.Detector]: [
    { shape: "box", along: 0.5, height: 0.44, depth: 0.44, tone: "sensor" },
    { shape: "cylinder", radius: 0.14, length: 0.1, offset: -0.3, tone: "metal" },
  ],
  [ElementKind.Ccd]: [
    { shape: "box", along: 0.7, height: 0.56, depth: 0.56, tone: "sensor" },
    { shape: "cylinder", radius: 0.19, length: 0.16, offset: -0.43, tone: "metal" },
  ],
  [ElementKind.Sample]: [
    { shape: "box", along: 0.05, height: 1.1, depth: 0.42, tone: "slide" },
    { shape: "cylinder", radius: 0.13, length: 0.05, offset: 0.05, tone: "tint" },
  ],
  [ElementKind.Other]: [{ shape: "box", along: 0.36, height: 0.36, depth: 0.36, tone: "body" }],
};

/** A part's centre in the stand's space. */
export const partCenter = (node: Pick<LayoutNode, "position" | "axis" | "direction">, offset = 0): Vec3 => {
  const index = node.axis === "x" ? 0 : node.axis === "y" ? 1 : 2;
  const center: Vec3 = [...node.position];
  center[index] += offset * node.direction;
  return center;
};

/** A box part's extent along x, y, z for the axis its element lies on. */
export const boxSize = (axis: Axis, along: number, height: number, depth: number): Vec3 =>
  axis === "x" ? [along, height, depth] : axis === "y" ? [height, along, depth] : [depth, height, along];
