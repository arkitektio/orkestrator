import { DialogDescription, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { cn } from "@/core/util/utils";
import type { LightpathGraphFragment } from "@/mikro/api/graphql";
import { Edges, Html, Line, OrbitControls } from "@react-three/drei";
import { Canvas, type ThreeElements } from "@react-three/fiber";
import { useMemo, useState } from "react";
import {
  ELEMENT_PARTS,
  boxSize,
  layoutLightPath,
  partCenter,
  type Axis,
  type ElementPart,
  type LayoutNode,
  type LightPathLayout,
  type PartTone,
  type Vec3,
} from "./lightPathLayout";
import {
  KIND_LABEL,
  buildLightPath,
  elementDetails,
  wavelengthToColor,
  type Arm,
  type PathElement,
} from "./lightPathModel";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

/**
 * The light path as a model to turn around: the same stand and the same
 * places as the drawing in the metadata panel (`LightPathSchematic`, both
 * read `layoutLightPath`), in three.js, with what is recorded about each
 * element listed beside it.
 *
 * One canvas, opened on request — never one per anchor.
 */

const MATERIAL: Record<PartTone, { color: string; opacity: number; metalness: number; roughness: number }> = {
  body: { color: "#4b5261", opacity: 1, metalness: 0.3, roughness: 0.6 },
  metal: { color: "#aab2c0", opacity: 1, metalness: 0.7, roughness: 0.35 },
  glass: { color: "#cfe8ff", opacity: 0.35, metalness: 0, roughness: 0.1 },
  tint: { color: "#cfe8ff", opacity: 0.6, metalness: 0, roughness: 0.2 },
  sensor: { color: "#2b303a", opacity: 1, metalness: 0.4, roughness: 0.5 },
  slide: { color: "#dfefff", opacity: 0.4, metalness: 0, roughness: 0.1 },
  hole: { color: "#000000", opacity: 1, metalness: 0, roughness: 1 },
};

/** A cylinder is built along y; this turns it onto the element's axis. */
const ALONG: Record<Axis, [number, number, number]> = {
  x: [0, 0, -Math.PI / 2],
  y: [0, 0, 0],
  z: [Math.PI / 2, 0, 0],
};

const PartMesh = ({ node, part, lit }: { node: LayoutNode; part: ElementPart; lit: boolean }) => {
  const tone = MATERIAL[part.tone];
  const color = part.tone === "tint" && node.nm !== null ? wavelengthToColor(node.nm) : tone.color;
  const material = (
    <meshStandardMaterial
      color={color}
      transparent={tone.opacity < 1}
      opacity={tone.opacity}
      metalness={tone.metalness}
      roughness={tone.roughness}
      emissive={lit ? "#ffffff" : "#000000"}
      emissiveIntensity={lit ? 0.25 : 0}
    />
  );
  if (part.shape === "plate") {
    return (
      <mesh position={node.position} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[part.size, 0.02, part.size]} />
        {material}
      </mesh>
    );
  }
  const position = partCenter(node, part.offset);
  if (part.shape === "box") {
    return (
      <mesh position={position}>
        <boxGeometry args={boxSize(node.axis, part.along, part.height, part.depth)} />
        {material}
      </mesh>
    );
  }
  // three's "top" radius is the +axis end; `radiusEnd` is the downstream one.
  const end = part.radiusEnd ?? part.radius;
  const [top, bottom] = node.direction === 1 ? [end, part.radius] : [part.radius, end];
  return (
    <mesh position={position} rotation={ALONG[node.axis]}>
      <cylinderGeometry args={[top, bottom, part.length, 40]} />
      {material}
    </mesh>
  );
};

const center = (layout: LightPathLayout): Vec3 => {
  const points = [...layout.nodes.map((node) => node.position), ...layout.ghost.map((part) => part.center)];
  const axis = (index: 0 | 1 | 2) =>
    (Math.min(...points.map((point) => point[index])) + Math.max(...points.map((point) => point[index]))) / 2;
  return [axis(0), axis(1), axis(2)];
};

const Stand = ({
  layout,
  hovered,
  onHover,
}: {
  layout: LightPathLayout;
  hovered: string | null;
  onHover: (id: string | null) => void;
}) => (
  <>
    {layout.ghost.map((part) => (
      <mesh key={part.id} position={part.center}>
        <boxGeometry args={part.size} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.035} depthWrite={false} />
        <Edges color="#ffffff" transparent opacity={0.22} />
      </mesh>
    ))}

    {layout.beams.map((beam) => (
      <Line
        key={beam.id}
        points={beam.points}
        color={beam.nm === null ? "#9aa0aa" : wavelengthToColor(beam.nm)}
        lineWidth={beam.nm === null ? 1.5 : 3}
        // No wavelength on record: a beam, of no stated colour.
        dashed={beam.nm === null}
        dashSize={0.12}
        gapSize={0.1}
      />
    ))}

    {layout.nodes.map((node) => (
      <group
        key={node.id}
        onPointerOver={(event) => {
          event.stopPropagation();
          onHover(node.id);
        }}
        onPointerOut={() => onHover(null)}
      >
        {ELEMENT_PARTS[node.entry.kind].map((part, index) => (
          <PartMesh key={index} node={node} part={part} lit={hovered === node.id} />
        ))}
        <Html
          position={[node.position[0], node.position[1] - 0.48, node.position[2]]}
          center
          zIndexRange={[10, 0]}
          className={cn(
            "pointer-events-none whitespace-nowrap font-mono text-[10px] text-white",
            hovered === node.id ? "opacity-100" : "opacity-60",
          )}
        >
          {node.entry.element.label || KIND_LABEL[node.entry.kind]}
        </Html>
      </group>
    ))}
  </>
);

/** The order light meets the elements in: sources first, detectors last. */
const ARM_ORDER: Record<Arm, number> = { illumination: 0, shared: 1, sample: 2, detection: 3, loose: 4 };
const inPathOrder = (a: PathElement, b: PathElement) =>
  ARM_ORDER[a.arm] - ARM_ORDER[b.arm] ||
  // Towards the sample on the way in, away from it on the way out.
  (a.arm === "detection" ? a.order - b.order : b.order - a.order) ||
  a.lane - b.lane;

const ARM_LABEL: Record<Arm, string> = {
  illumination: "Illumination",
  shared: "Optical axis",
  sample: "Sample",
  detection: "Detection",
  loose: "Not connected",
};

export const LightPath3DDialog = ({
  graph,
  title,
}: {
  graph: LightpathGraphFragment;
  /** What the light path belongs to, e.g. the channel's name. */
  title?: string;
}) => {
  const layout = useMemo(() => layoutLightPath(buildLightPath(graph)), [graph]);
  const target = useMemo(() => center(layout), [layout]);
  const [hovered, setHovered] = useState<string | null>(null);
  const entries = useMemo(() => layout.nodes.map((node) => node.entry).sort(inPathOrder), [layout]);

  return (
    <div className="flex h-[70vh] min-h-0 flex-col gap-3">
      <DialogHeader>
        <DialogTitle>Light path{title ? ` · ${title}` : ""}</DialogTitle>
        <DialogDescription>
          {layout.posed
            ? "Elements stand where their recorded poses put them."
            : "Recorded elements on a generic stand. The faint parts are context, not on record."}
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-md bg-neutral-950">
          <Canvas
            frameloop="demand"
            dpr={[1, 2]}
            gl={{ antialias: true }}
            camera={{ position: [target[0] + 6, target[1] + 4.5, target[2] + 7], fov: 30 }}
          >
            <ambientLight intensity={0.9} />
            <directionalLight position={[5, 8, 6]} intensity={2} />
            <directionalLight position={[-6, 3, -4]} intensity={0.7} />
            <Stand layout={layout} hovered={hovered} onHover={setHovered} />
            <OrbitControls makeDefault target={target} enablePan={false} minDistance={3} maxDistance={24} />
          </Canvas>
        </div>

        <ul className="w-64 shrink-0 space-y-0.5 overflow-y-auto pr-1 text-xs">
          {entries.map((entry, index) => {
            const details = elementDetails(entry.element);
            const heads = index === 0 || entries[index - 1].arm !== entry.arm;
            return (
              <li key={entry.id}>
                {heads && (
                  <div className="pb-0.5 pt-2 text-[10px] uppercase tracking-widest text-muted-foreground first:pt-0">
                    {ARM_LABEL[entry.arm]}
                  </div>
                )}
                <div
                  className={cn("rounded-md px-2 py-1.5", hovered === entry.id && "bg-muted")}
                  onPointerEnter={() => setHovered(entry.id)}
                  onPointerLeave={() => setHovered(null)}
                >
                  <div className="flex items-baseline gap-1.5">
                    <span className="min-w-0 truncate font-medium">{entry.element.label}</span>
                    <span className="shrink-0 text-muted-foreground">{KIND_LABEL[entry.kind]}</span>
                  </div>
                  {details.length > 0 && (
                    <dl className="mt-0.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                      {details.map((detail) => (
                        <div key={detail.label} className="contents">
                          <dt className="text-muted-foreground">{detail.label}</dt>
                          <dd className="truncate text-right font-mono">{detail.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
