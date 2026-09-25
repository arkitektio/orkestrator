import type { DrawingTool } from "./roiDrawingStore";
import type { OutlinePlanar } from "./roiOutline";

/**
 * What to tell the user about the shape they are dragging out.
 *
 * Assumes isotropic world units with x and y sharing the scene's `spatialUnit` —
 * the same simplification the scale bar already makes (`spatialUnit` is the unit
 * of the world coordinate system's *first* SPACE axis).
 */

export type DrawMeasure =
  | { kind: "box"; width: number; height: number }
  | { kind: "length"; length: number }
  | { kind: "path"; length: number; vertexCount: number };

export function measureDraw(
  tool: DrawingTool,
  points: readonly OutlinePlanar[],
): DrawMeasure | null {
  if (tool === "POINT" || points.length < 2) return null;

  if (tool === "RECTANGLE" || tool === "ELLIPSE") {
    // Absolute, so which corner was pressed first doesn't matter.
    return {
      kind: "box",
      width: Math.abs(points[1].x - points[0].x),
      height: Math.abs(points[1].y - points[0].y),
    };
  }

  if (tool === "SPHERE" || tool === "CUBE") {
    // Corner-pair convention (`features/annotations/primitiveDraw.ts`): the extent is 2r on
    // every axis, so half the x span IS the radius — the number the sizing
    // gesture is choosing.
    return { kind: "length", length: Math.abs(points[1].x - points[0].x) / 2 };
  }

  if (tool === "LINE") {
    return { kind: "length", length: distance(points[0], points[1]) };
  }

  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += distance(points[index - 1], points[index]);
  }
  return { kind: "path", length, vertexCount: points.length };
}

/**
 * Includes depth when the points carry it. Flat gestures leave every point on
 * one z, where this is exactly the old planar distance; a gesture through the
 * volume (every 3D tool, and an enhancer-traced edge especially) genuinely
 * travels in z, and reporting only its xy shadow would under-report the length.
 */
const distance = (a: OutlinePlanar, b: OutlinePlanar): number =>
  Math.hypot(b.x - a.x, b.y - a.y, (b.z ?? 0) - (a.z ?? 0));

/**
 * A fixed magnitude→decimals ladder, so the readout doesn't jitter between
 * widths while you drag.
 *
 * Deliberately not derived from `worldUnitsPerPixel`: that field is throttled
 * and React-subscribed, so it would be both stale mid-gesture and a re-render
 * source. Also not the scale bar's `getNiceNumber` — snapping to 1/2/5×10ⁿ is
 * right for choosing a bar length and wrong for reporting a measured extent.
 */
export function formatSceneLength(value: number): string {
  const magnitude = Math.abs(value);
  if (magnitude === 0) return "0";
  if (magnitude >= 100) return value.toFixed(0);
  if (magnitude >= 10) return value.toFixed(1);
  if (magnitude >= 1) return value.toFixed(2);
  return value.toPrecision(3);
}

/** e.g. "120 × 84 µm", "148 µm", "7 pts · 312 µm". */
export function formatDrawMeasure(
  measure: DrawMeasure | null,
  unit: string,
): string | null {
  if (!measure) return null;

  if (measure.kind === "box") {
    // U+00D7 MULTIPLICATION SIGN, not the letter x.
    return `${formatSceneLength(measure.width)} × ${formatSceneLength(measure.height)} ${unit}`;
  }

  if (measure.kind === "length") {
    return `${formatSceneLength(measure.length)} ${unit}`;
  }

  return `${measure.vertexCount} pts · ${formatSceneLength(measure.length)} ${unit}`;
}

/**
 * A STORED annotation's headline number, by its `AnnotationKind`. Kinds that share a
 * drawing tool's convention reuse `measureDraw`; a closed POLYGON is the one
 * shape whose headline is its area, which no gesture readout ever needed.
 * Plain string keys on purpose: the generated `AnnotationKind` enum lives in the
 * Apollo hooks barrel, which this pure module must not import.
 */
const ANNOTATION_TOOL_BY_KIND: Partial<Record<string, DrawingTool>> = {
  RECTANGLE: "RECTANGLE",
  ELLIPSE: "ELLIPSE",
  LINE: "LINE",
  POLYGON: "POLYGON",
  PATH: "PATH",
  CUBE: "CUBE",
  SPHERE: "SPHERE",
};

/** Shoelace area of the xy footprint; winding direction doesn't matter. */
export function polygonArea(points: readonly OutlinePlanar[]): number {
  let twice = 0;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    twice += a.x * b.y - b.x * a.y;
  }
  return Math.abs(twice) / 2;
}

export type AnnotationMeasure =
  | DrawMeasure
  | { kind: "area"; area: number; vertexCount: number }
  | { kind: "boxArea"; width: number; height: number; area: number }
  | { kind: "sphere"; radius: number; volume: number }
  | { kind: "cube"; side: number; volume: number };

/**
 * A STORED annotation headlines the feature its geometry actually HAS, not
 * the number the drawing gesture chose. The gesture readout (`measureDraw`)
 * rightly reports the radius while you size a sphere — that is the number the
 * drag controls — but a finished sphere IS a volume, an ellipse IS an area,
 * and quoting a sphere as a bare length reads as a line's measure.
 *
 *  - RECTANGLE: width × height, plus the area they enclose.
 *  - ELLIPSE: its bounding box, plus π/4·w·h — the ellipse's area, not the
 *    box's.
 *  - SPHERE: the radius (half the x extent, the corner-pair convention of
 *    `features/annotations/primitiveDraw.ts`) and 4/3·π·r³.
 *  - CUBE: the side (the full extent) and side³.
 *  - POLYGON: shoelace area of the xy footprint.
 *  - LINE / PATH: length, via `measureDraw` — length is already the feature.
 *
 * Same isotropy assumption as the whole module (see the top docblock): the
 * 3D primitives read their extent off x alone, which the corner-pair
 * convention guarantees equals y and z.
 */
export function measureAnnotation(
  roiKind: string,
  points: readonly OutlinePlanar[],
): AnnotationMeasure | null {
  const tool = ANNOTATION_TOOL_BY_KIND[roiKind];
  if (!tool || points.length < 2) return null;
  if (tool === "POLYGON" && points.length >= 3) {
    return { kind: "area", area: polygonArea(points), vertexCount: points.length };
  }
  if (tool === "RECTANGLE" || tool === "ELLIPSE") {
    const width = Math.abs(points[1].x - points[0].x);
    const height = Math.abs(points[1].y - points[0].y);
    const area = tool === "ELLIPSE" ? (Math.PI / 4) * width * height : width * height;
    return { kind: "boxArea", width, height, area };
  }
  if (tool === "SPHERE") {
    const radius = Math.abs(points[1].x - points[0].x) / 2;
    return { kind: "sphere", radius, volume: (4 / 3) * Math.PI * radius ** 3 };
  }
  if (tool === "CUBE") {
    const side = Math.abs(points[1].x - points[0].x);
    return { kind: "cube", side, volume: side ** 3 };
  }
  return measureDraw(tool, points);
}

/** e.g. "r 5.00 µm · 524 µm³" for a sphere, "10 × 4.00 µm · 40.0 µm²" for a
 * rectangle, "1 240 µm²" for a polygon; lengths via `formatDrawMeasure`. */
export function formatAnnotationMeasure(
  measure: AnnotationMeasure | null,
  unit: string,
): string | null {
  if (!measure) return null;
  if (measure.kind === "area") {
    return `${formatSceneLength(measure.area)} ${unit}²`;
  }
  if (measure.kind === "boxArea") {
    return `${formatSceneLength(measure.width)} × ${formatSceneLength(measure.height)} ${unit} · ${formatSceneLength(measure.area)} ${unit}²`;
  }
  if (measure.kind === "sphere") {
    return `r ${formatSceneLength(measure.radius)} ${unit} · ${formatSceneLength(measure.volume)} ${unit}³`;
  }
  if (measure.kind === "cube") {
    return `${formatSceneLength(measure.side)} ${unit} · ${formatSceneLength(measure.volume)} ${unit}³`;
  }
  return formatDrawMeasure(measure, unit);
}
