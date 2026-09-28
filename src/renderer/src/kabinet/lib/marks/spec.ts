/**
 * spec.ts — the two data tables, behind hand-written types.
 *
 * The casts are the point. `mark-spec.json` is 68 kB (a 256-number mean plus 26
 * anchor vectors) and `glyphs.json` holds heterogeneous command tuples like
 * `["M", 0.12, 0.44]` / `["C", …6 numbers]` across 36 glyphs. Letting TypeScript
 * infer those — `typeof SPEC`, as the upstream package does — produces an
 * enormous union type that then travels to every consumer. Declaring the shape
 * by hand and casting once confines that cost to these two lines.
 */
import RAW_GLYPHS from "./data/glyphs.json";
import RAW_SPEC from "./data/mark-spec.json";

export type ElementKind =
  | "none"
  | "orbs"
  | "studs"
  | "orbitRing"
  | "trail"
  | "cubes"
  | "spikes";

export interface ShapeAnchor {
  id: string;
  geom: string;
  words: string[];
  vec: number[];
}

export interface TopicAnchor {
  id: string;
  label: string;
  element: ElementKind;
  base: string;
  accent: string;
  vec: number[];
}

export interface MarkSpec {
  version: string;
  model: string;
  dim: number;
  mean: number[];
  shapes: ShapeAnchor[];
  topics: TopicAnchor[];
  palette: string[];
  ink: string;
  /** Plain plates only — the expressive symbols stay reserved for real matches. */
  fallbackGeoms: string[];
  shapeMinSimilarity: number;
  shapeMarginThreshold: number;
  topicMinSimilarity: number;
  topicMarginThreshold: number;
}

/** One path command: an opcode followed by its coordinates. */
export type GlyphCmd = [string, ...number[]];

export interface Glyph {
  /** Contours, each a list of commands. */
  c: GlyphCmd[][];
  /** Advance width. */
  a: number;
}

export interface GlyphTable {
  font: string;
  upm: number;
  cap: number;
  glyphs: Record<string, Glyph>;
}

export const SPEC = RAW_SPEC as unknown as MarkSpec;
export const GLYPHS = RAW_GLYPHS as unknown as GlyphTable;
