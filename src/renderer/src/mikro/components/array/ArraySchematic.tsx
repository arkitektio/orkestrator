import { cn } from "@/core/util/utils";
import { memo, useMemo } from "react";
import { arraySchematic, Interval, Point, SchematicAxis } from "./schematicGeometry";

const points = (polygon: Point[]) => polygon.map(([x, y]) => `${x},${y}`).join(" ");

/**
 * An array drawn the way dask draws one: a strip, a rectangle or an oblique
 * cube per (up to) three axes, the chunk grid across its faces, and each side
 * named with its axis and size. `highlight` fills the part a lens selects.
 *
 * Inline SVG at the box's own pixel size, so the labels stay one size however
 * the blocks scale.
 */
export const ArraySchematic = memo(
  ({
    axes,
    width,
    height,
    highlight,
    className,
  }: {
    axes: readonly SchematicAxis[];
    width: number;
    height: number;
    highlight?: readonly Interval[];
    className?: string;
  }) => {
    const schematic = useMemo(() => arraySchematic(axes, { width, height, highlight }), [axes, width, height, highlight]);
    if (!schematic) return null;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn("overflow-visible", className)} aria-hidden>
        {schematic.faces.map((face, index) => (
          <polygon key={`f${index}`} points={points(face)} className="fill-primary/15 stroke-foreground/70" strokeWidth={1.25} strokeLinejoin="round" />
        ))}
        {schematic.lines.map(([from, to], index) => (
          <line key={`l${index}`} x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} className="stroke-foreground/30" strokeWidth={0.6} />
        ))}
        {schematic.highlight.map((face, index) => (
          <polygon key={`h${index}`} points={points(face)} className="fill-primary/45 stroke-primary" strokeWidth={1} strokeLinejoin="round" />
        ))}
        {schematic.labels.map((label) => (
          <text
            key={`${label.text}@${label.x},${label.y}`}
            x={label.x}
            y={label.y}
            transform={label.angle ? `rotate(${label.angle} ${label.x} ${label.y})` : undefined}
            textAnchor="middle"
            dominantBaseline="hanging"
            className="fill-muted-foreground font-mono"
            fontSize={9}
          >
            {label.text}
          </text>
        ))}
      </svg>
    );
  },
);
