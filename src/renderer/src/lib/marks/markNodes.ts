/**
 * markNodes.ts — the scene graph as plain data. No three, no React.
 *
 * A mark is drawn by two different renderers: `<AppMark>` for the one live
 * canvas, and a bare `THREE.WebGLRenderer` for every list icon. Rather than
 * having each build its own meshes — where moving an extra in one and not the
 * other is a one-line mistake nobody would catch — both consume this. All the
 * layout maths lives here exactly once, and what is left in either renderer is
 * a `.map` over these nodes.
 *
 * Being plain data also makes the layout unit-testable without a GPU, which the
 * imperative alternative is not.
 */
import {
  EXTRA_Z,
  LETTER_Z,
  MARK_SCALE,
  MARK_SCALE_SIMPLE,
  ORBIT,
  SPIKE_R,
  STUD_R,
} from "./constants";
import type { MarkParams } from "./markParams";

const TAU = Math.PI * 2;

export type MarkGeomKind =
  | "plate"
  | "letter"
  | "orb"
  | "cubelet"
  | "stud"
  | "spike"
  | "orbit";

/** Which of the three materials a node wears. */
export type MarkMaterialRole = "base" | "accent" | "ink";

export interface MarkNode {
  /** Stable within one mark — usable directly as a React key. */
  key: string;
  geom: MarkGeomKind;
  /** The plate outline this node belongs to; letters are sized against it. */
  plateGeom: string;
  /** The letter, for `geom: "letter"`. */
  letter?: string;
  material: MarkMaterialRole;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

export interface MarkScene {
  /** Applied to the group that holds every node. */
  rotation: [number, number, number];
  scale: number;
  nodes: MarkNode[];
}

const extras = (p: MarkParams): MarkNode[] => {
  const n = p.count;
  const s = p.elementScale;

  switch (p.element) {
    case "orbs":
    case "cubes": {
      const geom = p.element === "orbs" ? "orb" : "cubelet";
      const k = p.element === "orbs" ? s * 0.68 : s * 0.84;
      return Array.from({ length: n }, (_, i): MarkNode => {
        const a = (i / n) * TAU + p.yaw * 2;
        return {
          key: `${geom}-${i}`,
          geom,
          plateGeom: p.geom,
          material: "accent",
          position: [Math.cos(a) * ORBIT, Math.sin(a) * ORBIT, EXTRA_Z],
          rotation: p.element === "cubes" ? [0.3, 0.4, a] : [0, 0, 0],
          scale: k,
        };
      });
    }
    case "studs":
    case "spikes": {
      const geom = p.element === "studs" ? "stud" : "spike";
      const k = p.element === "studs" ? s * 0.72 : s * 0.92;
      const r = p.element === "studs" ? STUD_R : SPIKE_R;
      return Array.from({ length: n }, (_, i): MarkNode => {
        const a = (i / n) * TAU + p.yaw * 2;
        return {
          key: `${geom}-${i}`,
          geom,
          plateGeom: p.geom,
          material: "accent",
          position: [Math.cos(a) * r, Math.sin(a) * r, EXTRA_Z],
          rotation: [0, 0, a - Math.PI / 2],
          scale: k,
        };
      });
    }
    case "trail":
      return Array.from({ length: n + 1 }, (_, i): MarkNode => {
        const t = i / (n + 1);
        const a = -2.5 + t * 2.6 + p.yaw;
        return {
          key: `trail-${i}`,
          geom: "orb",
          plateGeom: p.geom,
          material: "accent",
          position: [Math.cos(a) * ORBIT, Math.sin(a) * ORBIT, EXTRA_Z],
          rotation: [0, 0, 0],
          scale: s * (0.28 + 0.5 * t),
        };
      });
    case "orbitRing":
      // tilted just enough to read as 3D, never as a flat bar across the symbol
      return [
        {
          key: "orbit",
          geom: "orbit",
          plateGeom: p.geom,
          material: "accent",
          position: [0, 0, 0],
          rotation: [0.42, 0, 0.3 + p.roll],
          scale: 1,
        },
      ];
    default:
      return [];
  }
};

/**
 * The whole mark: a plate, its extras, and the letter on top.
 *
 * `simple` drops the orbiting extras — below roughly 48 px on screen they turn
 * to mush — and compensates with a slightly larger plate.
 */
export function markNodes(
  p: MarkParams,
  opts: { simple?: boolean; scale?: number } = {},
): MarkScene {
  const { simple = false, scale = 1 } = opts;

  const nodes: MarkNode[] = [
    {
      key: "plate",
      geom: "plate",
      plateGeom: p.geom,
      material: "base",
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: 1,
    },
  ];

  if (!simple) nodes.push(...extras(p));

  nodes.push({
    key: "letter",
    geom: "letter",
    plateGeom: p.geom,
    letter: p.letter,
    material: "ink",
    position: [0, 0, LETTER_Z],
    rotation: [0, 0, 0],
    scale: 1,
  });

  return {
    rotation: [0.13, -0.16 + p.yaw, p.roll],
    scale: (simple ? MARK_SCALE_SIMPLE : MARK_SCALE) * scale,
    nodes,
  };
}

/** The hex a node's material should use, for a given mark. */
export const colorFor = (p: MarkParams, role: MarkMaterialRole): string =>
  role === "base" ? p.baseColor : role === "accent" ? p.accentColor : p.ink;
