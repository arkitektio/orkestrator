import { useMemo } from "react";

import { AnnotationKind, type SceneAnnotationFragment } from "@/mikro/api/graphql";
import { cn } from "@/lib/utils";

import { getAnnotationSelectionPoints } from "../scene/features/annotations/annotationBounds";
import {
  DEFAULT_STROKE,
  IMPLIED_FILL_OPACITY,
  rgbaToStyle,
} from "../scene/features/annotations/annotationStyle";

/**
 * The shape itself, drawn from its own vectors — what identifies an annotation
 * the way a snapshot identifies a scene, since the names are machine-minted.
 *
 * Its OWN space, flattened to xy and normalized to its bounding box: a list
 * page has no scene, therefore no `pathToWorld` and no world units, so the
 * glyph says what the shape looks like and deliberately not how big it is or
 * where it sits. The same `getAnnotationSelectionPoints` the renderer samples
 * with produces the points, so a rectangle reads as a rectangle and an
 * ellipsis as an ellipsis rather than as its two stored corners.
 */

/**
 * Shapes whose sampled points are a stroke rather than a ring. Stated as the
 * exception so a kind added to the schema defaults to closed — every region
 * kind is, and only the three drawn-through ones are not.
 */
const OPEN_KINDS = new Set<AnnotationKind>([
  AnnotationKind.Line,
  AnnotationKind.Path,
  AnnotationKind.MultiPoint,
]);

const VIEWBOX = 100;
const PADDING = 8;

export const AnnotationGlyph = ({
  annotation,
  className,
}: {
  // The renderer's lean selection is all the glyph needs, so the browse
  // card's and the detail page's richer fragments both pass as supersets.
  annotation: SceneAnnotationFragment;
  className?: string;
}) => {
  const stroke = rgbaToStyle(annotation.strokeColor);
  const fill = rgbaToStyle(annotation.fillColor);
  const strokeColor = stroke?.color ?? DEFAULT_STROKE;

  const points = useMemo(() => {
    // Flattened: the glyph is a plan view, and a volumetric kind's z corners
    // would otherwise fold onto the same xy footprint twice.
    const sampled = getAnnotationSelectionPoints(annotation, true);
    if (sampled.length === 0) return [];

    const xs = sampled.map(([x]) => x);
    const ys = sampled.map(([, y]) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    // One scale for both axes so the aspect ratio survives; a degenerate span
    // (a line, a point) would divide by zero, so it falls back to centered.
    const span = Math.max(maxX - minX, maxY - minY);
    const usable = VIEWBOX - PADDING * 2;
    const scale = span > 0 ? usable / span : 0;
    const offsetX = (VIEWBOX - (maxX - minX) * scale) / 2;
    const offsetY = (VIEWBOX - (maxY - minY) * scale) / 2;

    return sampled.map(
      ([x, y]) =>
        [
          (x - minX) * scale + offsetX,
          // SVG y grows downward, image y grows downward too — no flip.
          (y - minY) * scale + offsetY,
        ] as [number, number],
    );
  }, [annotation]);

  if (points.length === 0) return null;

  const isClosed = !OPEN_KINDS.has(annotation.kind);
  const fillColor = annotation.filled ? (fill?.color ?? strokeColor) : "none";
  const fillOpacity = annotation.filled
    ? (fill?.opacity ?? IMPLIED_FILL_OPACITY)
    : 0;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      className={cn("h-full w-full", className)}
      // Decorative: the kind badge next to it already names the shape.
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
    >
      {points.length === 1 || annotation.kind === AnnotationKind.Point ? (
        <circle
          cx={points[0][0]}
          cy={points[0][1]}
          r={5}
          fill={strokeColor}
          fillOpacity={stroke?.opacity ?? 1}
        />
      ) : isClosed ? (
        <polygon
          points={points.map(([x, y]) => `${x},${y}`).join(" ")}
          fill={fillColor}
          fillOpacity={fillOpacity}
          stroke={strokeColor}
          strokeOpacity={stroke?.opacity ?? 1}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      ) : (
        <polyline
          points={points.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          stroke={strokeColor}
          strokeOpacity={stroke?.opacity ?? 1}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
};
