import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/ui/tooltip";
import { cn } from "@/core/util/utils";
import type { LightpathGraphFragment } from "@/mikro/api/graphql";
import { Maximize2 } from "lucide-react";
import { useMemo, useState } from "react";
import { boxFaces, depth, partFaces, project, toPath, type Face, type Point } from "./isometric";
import {
  ELEMENT_PARTS,
  layoutLightPath,
  type LayoutNode,
  type LightPathLayout,
  type PartTone,
} from "./lightPathLayout";
import { KIND_LABEL, buildLightPath, elementDetails, wavelengthToColor } from "./lightPathModel";

/**
 * A light path drawn as the microscope it describes: the stand in faint
 * outline, the recorded elements standing on it, and the beam running
 * through them in its own colour.
 *
 * Isometric SVG, not a canvas: a panel lists one of these per anchor in view,
 * and a browser hands out only a few live GL contexts. The real, orbitable
 * view is one click away (`LightPath3DDialog`), built on the same layout.
 */

/** Paint per face: how much of the ink colour a surface takes. */
const SHADE: Record<Face["shade"], number> = { top: 0.34, right: 0.2, left: 0.11, flat: 0.3 };
const TONE: Record<PartTone, number> = { body: 1, metal: 1.25, glass: 0.45, tint: 0.9, sensor: 1.1, slide: 0.55, hole: 1 };

/** Narrowest and widest the picture may be for its height. */
const MIN_ASPECT = 1.35;
const MAX_ASPECT = 2.6;
const PADDING = 0.3;

type Frame = { x: number; y: number; width: number; height: number };

const frameOf = (layout: LightPathLayout): Frame => {
  const points: Point[] = [
    ...layout.ghost.flatMap((part) => boxFaces(part.center, part.size).flatMap((face) => face.points)),
    ...layout.nodes.flatMap((node) =>
      ELEMENT_PARTS[node.entry.kind].flatMap((part) => partFaces(node, part).flatMap((face) => face.points)),
    ),
    ...layout.beams.flatMap((beam) => beam.points.map(project)),
  ];
  if (points.length === 0) return { x: 0, y: 0, width: 1, height: 1 };
  let x = Math.min(...points.map((point) => point[0])) - PADDING;
  let y = Math.min(...points.map((point) => point[1])) - PADDING;
  let width = Math.max(...points.map((point) => point[0])) + PADDING - x;
  // Arm labels hang under their element.
  let height = Math.max(...points.map((point) => point[1])) + PADDING * 2 - y;
  // Pad to the allowed shape rather than letterbox, so a position in the
  // frame is the same fraction of the element on screen.
  if (width / height < MIN_ASPECT) {
    const wider = height * MIN_ASPECT;
    x -= (wider - width) / 2;
    width = wider;
  } else if (width / height > MAX_ASPECT) {
    const taller = width / MAX_ASPECT;
    y -= (taller - height) / 2;
    height = taller;
  }
  return { x, y, width, height };
};

const nodeColor = (node: LayoutNode) => (node.nm === null ? undefined : wavelengthToColor(node.nm));

const ElementSolid = ({ node, lit }: { node: LayoutNode; lit: boolean }) => (
  <g data-element={node.id} data-kind={node.entry.kind}>
    {ELEMENT_PARTS[node.entry.kind].map((part, partIndex) =>
      partFaces(node, part).map((face, faceIndex) => {
        // A filter, a dichroic and the sample take the colour of their light.
        const tinted = part.tone === "tint" ? nodeColor(node) : undefined;
        return (
          <path
            key={`${partIndex}:${faceIndex}`}
            d={toPath(face.points)}
            fill={part.tone === "hole" ? "black" : (tinted ?? "currentColor")}
            fillOpacity={
              part.tone === "hole" ? 0.7 : Math.min(0.9, SHADE[face.shade] * TONE[part.tone] * (tinted ? 1.6 : 1))
            }
            stroke={tinted ?? "currentColor"}
            strokeOpacity={lit ? 1 : 0.7}
            strokeWidth={lit ? 1.25 : 0.75}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        );
      }),
    )}
  </g>
);

const ElementHover = ({ node }: { node: LayoutNode }) => {
  const { element, kind } = node.entry;
  const details = elementDetails(element);
  return (
    <TooltipContent
      side="top"
      sideOffset={4}
      className="max-w-64 space-y-1 border border-border bg-popover text-left text-popover-foreground shadow-md [&_svg.z-50]:!bg-popover [&_svg.z-50]:!fill-popover"
    >
      <div className="flex items-baseline gap-1.5">
        <span className="min-w-0 truncate font-medium">{element.label}</span>
        <span className="shrink-0 text-muted-foreground">· {KIND_LABEL[kind]}</span>
      </div>
      {details.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
          {details.map((detail) => (
            <div key={detail.label} className="contents">
              <dt className="text-muted-foreground">{detail.label}</dt>
              <dd className="text-right font-mono">{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </TooltipContent>
  );
};

export const LightPathSchematic = ({
  graph,
  tone = "overlay",
  onExpand,
  className,
}: {
  graph: LightpathGraphFragment;
  /** `overlay`: white on the dark viewport chrome; `surface`: theme tokens, for a page. */
  tone?: "overlay" | "surface";
  /** Opens the 3D view; without it the picture is a still. */
  onExpand?: () => void;
  className?: string;
}) => {
  const layout = useMemo(() => layoutLightPath(buildLightPath(graph)), [graph]);
  const frame = useMemo(() => frameOf(layout), [layout]);
  const [hovered, setHovered] = useState<string | null>(null);

  // Far to near, so a part in front covers the one behind it.
  const nodes = useMemo(
    () => [...layout.nodes].sort((a, b) => depth(a.position) - depth(b.position)),
    [layout],
  );

  if (layout.nodes.length === 0) {
    return (
      <span className={cn("text-[9px]", tone === "overlay" ? "text-white/40" : "text-muted-foreground")}>
        no elements recorded
      </span>
    );
  }

  const at = ([u, v]: Point) => ({
    left: `${((u - frame.x) / frame.width) * 100}%`,
    top: `${((v - frame.y) / frame.height) * 100}%`,
  });

  return (
    <div
      data-lightpath
      className={cn(
        "group/lightpath relative w-full select-none text-left",
        tone === "overlay" ? "text-white" : "text-foreground",
        onExpand && "cursor-pointer",
        className,
      )}
      style={{ aspectRatio: `${frame.width} / ${frame.height}` }}
      onClick={onExpand}
    >
      <svg
        viewBox={`${frame.x} ${frame.y} ${frame.width} ${frame.height}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-label={`Light path: ${nodes.map((node) => node.entry.element.label).join(", ")}`}
      >
        <g data-ghost>
          {layout.ghost.map((part) =>
            boxFaces(part.center, part.size).map((face, index) => (
              <path
                key={`${part.id}:${index}`}
                d={toPath(face.points)}
                fill="currentColor"
                fillOpacity={0.025}
                stroke="currentColor"
                strokeOpacity={0.16}
                strokeWidth={0.75}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )),
          )}
        </g>

        <g data-beams fill="none" strokeLinecap="round" strokeLinejoin="round">
          {layout.beams.map((beam) => {
            const d = toPath(beam.points.map(project), false);
            const color = beam.nm === null ? "currentColor" : wavelengthToColor(beam.nm);
            return (
              <g key={beam.id} data-beam={beam.phase}>
                {beam.nm !== null && (
                  <path d={d} stroke={color} strokeOpacity={0.28} strokeWidth={5} vectorEffect="non-scaling-stroke" />
                )}
                <path
                  d={d}
                  stroke={color}
                  strokeOpacity={beam.nm === null ? 0.55 : 1}
                  strokeWidth={1.5}
                  // No wavelength on record: a beam, of no stated colour.
                  strokeDasharray={beam.nm === null ? "3 3" : undefined}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
        </g>

        {nodes.map((node) => (
          <ElementSolid key={node.id} node={node} lit={hovered === node.id} />
        ))}
      </svg>

      {nodes.map((node) => {
        const [u, v] = project(node.position);
        const beside = node.axis === "y";
        return (
          <Tooltip key={node.id}>
            <TooltipTrigger asChild>
              <div
                className="absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={at([u, v])}
                onPointerEnter={() => setHovered(node.id)}
                onPointerLeave={() => setHovered((current) => (current === node.id ? null : current))}
              />
            </TooltipTrigger>
            <ElementHover node={node} />
            <span
              className={cn(
                "pointer-events-none absolute max-w-[4.5rem] truncate font-mono text-[9px] leading-none",
                beside ? "-translate-y-1/2" : "-translate-x-1/2",
                hovered === node.id ? "opacity-100" : "opacity-60",
              )}
              style={at(beside ? [u + 0.62, v] : [u, v + 0.5])}
            >
              {node.entry.element.label || KIND_LABEL[node.entry.kind]}
            </span>
          </Tooltip>
        );
      })}

      {onExpand && (
        <button
          type="button"
          aria-label="Open the light path in 3D"
          className="absolute right-0 top-0 rounded p-0.5 opacity-40 transition-opacity hover:opacity-100 focus-visible:opacity-100 group-hover/lightpath:opacity-80"
          onClick={(event) => {
            event.stopPropagation();
            onExpand();
          }}
        >
          <Maximize2 className="size-3" />
        </button>
      )}
    </div>
  );
};
