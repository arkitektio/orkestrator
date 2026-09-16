import { Card } from "@/components/ui/card";
import { OrbitControls, useCursor } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Vignette } from '@react-three/postprocessing';
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CompartmentFragment, DetailNeuronModelFragment, SectionFragment } from "../api/graphql";
import { rgbaToCss } from "../lib/color";
import { computeRootCentroidFit, FitCamera } from "../lib/fitCamera";
import {
  DEFAULT_WEIGHTS,
  DominanceWeights,
  IMPORTANCE_MUTED,
  useImportanceColors,
} from "../lib/importance";
import { useNeuronPanelStore } from "../lib/neuronPanelStore";
import { buildNetworkLayout, SegmentGeom } from "../lib/networkLayout";
import { toBase } from "@/lib/quantities";
import { ImportanceControl } from "./ImportanceControl";
import { HoveredNet, NetworkLayer, NetworkTooltip } from "./NetworkLayer3D";
import { NetworkControl } from "./NetworkControl";

// --- Types & Helpers ---
interface ProcessedSegment {
  id: string;
  uniqueKey: string;
  section: SectionFragment;
  start: THREE.Vector3;
  end: THREE.Vector3;
  direction: THREE.Vector3;
  color: string;
}

const getColorFromIndex = (index: number) => {
  const hue = (index * 137.508) % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

const getParentInfo = (section: SectionFragment) => {
  if (!section.parent)  return null;
  const conn = section.parent
  return { id: conn.parent, location: conn.parentLocation ?? 1 };
};

const getPerpendicularVector = (vec: THREE.Vector3) => {
  const v = vec.clone().normalize();
  const helper = Math.abs(v.dot(new THREE.Vector3(0, 1, 0))) > 0.9
    ? new THREE.Vector3(1, 0, 0)
    : new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3().crossVectors(v, helper).normalize();
};

// --- CORE LOGIC: Equidistant Spacing ---

const calculateBranchDirection = (
  parentDir: THREE.Vector3,
  location: number,
  siblingIndex: number,
  siblingCount: number,
  groupSeed: number
) => {
  const isStartTip = location < 0.05;
  const isEndTip = location > 0.95;
  const isTip = isStartTip || isEndTip;

  let poleVector: THREE.Vector3;

  if (isEndTip) {
    poleVector = parentDir.clone().normalize();
  } else if (isStartTip) {
    poleVector = parentDir.clone().normalize().negate();
  } else {
    const baseOrtho = getPerpendicularVector(parentDir);
    poleVector = baseOrtho;
  }

  const finalDir = poleVector.clone();

  if (isTip) {
    if (siblingCount <= 1) return finalDir;

    const hinge = getPerpendicularVector(poleVector);
    const azimuthalAngle = (siblingIndex * (Math.PI * 2)) / siblingCount;
    const groupPhase = (groupSeed % 100) * 0.01 * Math.PI * 2;

    hinge.applyAxisAngle(poleVector, azimuthalAngle + groupPhase);

    const spreadAngle = Math.PI / 4;
    finalDir.applyAxisAngle(hinge, spreadAngle);

    return finalDir;

  } else {
    if (siblingCount > 1) {
      const angleStep = (Math.PI * 2) / siblingCount;
      const groupPhase = (groupSeed % 100) * 0.01 * Math.PI * 2;
      finalDir.applyAxisAngle(parentDir.clone().normalize(), (siblingIndex * angleStep) + groupPhase);
    } else {
      const groupPhase = (groupSeed % 100) * 0.01 * Math.PI * 2;
      finalDir.applyAxisAngle(parentDir.clone().normalize(), groupPhase);
    }
    return finalDir;
  }
};

// --- Layout Hook ---

const useNeuronLayout = (model: DetailNeuronModelFragment) => {
  return useMemo(() => {
    const rawSections = model.config.cells.flatMap((cell) => cell.topology.sections);

    // A section is tinted by its compartment's color (matched on `category` →
    // compartment `id`) when one is set; otherwise it falls back to the
    // depth-based hue below.
    const compartmentColor = new Map<string, string>();
    model.config.cells.forEach((cell) =>
      cell.biophysics.compartments.forEach((c) => {
        const css = rgbaToCss(c.color);
        if (css) compartmentColor.set(c.id, css);
      }),
    );

    const sectionMap = new Map<string, SectionFragment>();
    const childrenMap = new Map<string, SectionFragment[]>();

    rawSections.forEach(sec => {
      sectionMap.set(sec.id, sec);
      const parentInfo = getParentInfo(sec);
      if (parentInfo) {
        if (!childrenMap.has(parentInfo.id)) childrenMap.set(parentInfo.id, []);
        childrenMap.get(parentInfo.id)?.push(sec);
      }
    });

    const segments: ProcessedSegment[] = [];
    const geometryMap = new Map<string, { start: THREE.Vector3, end: THREE.Vector3, direction: THREE.Vector3 }>();

    const processSection = (
      sectionId: string,
      parentGeom: { start: THREE.Vector3, end: THREE.Vector3, direction: THREE.Vector3 } | null,
      depth: number
    ) => {
      const section = sectionMap.get(sectionId);
      if (!section) return;

      const allChildren = childrenMap.get(sectionId) || [];
      const parentInfo = getParentInfo(section);

      let start: THREE.Vector3;
      let direction: THREE.Vector3;

      if (parentGeom && parentInfo) {
        const loc = parentInfo.location;

        start = new THREE.Vector3().lerpVectors(parentGeom.start, parentGeom.end, loc);

        const coLocatedSiblings = (childrenMap.get(parentInfo.id) || []).filter(s => {
          const p = getParentInfo(s);
          return p && Math.abs(p.location - loc) < 0.001;
        });

        coLocatedSiblings.sort((a, b) => a.id.localeCompare(b.id));

        const myIndex = coLocatedSiblings.findIndex(s => s.id === section.id);
        const siblingCount = coLocatedSiblings.length;

        const parentKey = `${parentInfo.id}-${loc.toFixed(2)}`;
        const groupSeed = parentKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

        direction = calculateBranchDirection(
          parentGeom.direction,
          loc,
          myIndex,
          siblingCount,
          groupSeed
        );

      } else {
        start = new THREE.Vector3(0, 0, 0);
        direction = new THREE.Vector3(0, 1, 0);
      }

      // `length` is a `Length` quantity string ("10 µm"); normalise to µm.
      const length = toBase(section.length, "length", 10);
      const end = start.clone().add(direction.clone().normalize().multiplyScalar(length));

      segments.push({
        id: section.id,
        uniqueKey: section.id,
        section,
        start,
        end,
        direction,
        color: compartmentColor.get(section.category ?? "") ?? getColorFromIndex(depth)
      });

      geometryMap.set(section.id, { start, end, direction });

      allChildren.forEach(child => {
        processSection(child.id, { start, end, direction }, depth + 1);
      });
    };

    const roots = rawSections.filter(s => !s.parent);
    const entryPoints = roots.length > 0 ? roots : [rawSections[0]];

    entryPoints.forEach(root => processSection(root.id, null, 0));

    return segments;
  }, [model.id, model.config.cells]);
};

// --- Visual Components ---

const Branch = ({
  section, start, end, color,
}: {
  section: SectionFragment;
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: string;
}) => {
  const hasPanel = useNeuronPanelStore((s) => Boolean(s.panels[section.id]));
  const isHovered = useNeuronPanelStore((s) => s.hoveredId === section.id);
  const setHovered = useNeuronPanelStore((s) => s.setHovered);
  const togglePanel = useNeuronPanelStore((s) => s.togglePanel);
  const toggleExclusive = useNeuronPanelStore((s) => s.toggleExclusive);

  const dir = new THREE.Vector3().subVectors(end, start);
  const length = dir.length();
  // `diam` is a `Length` quantity string ("1 µm"); normalise to µm for geometry.
  const diamUm = toBase(section.diam, "length", 1);

  useCursor(isHovered);

  if (length < 0.001) return null;

  const position = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const orientation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const active = hasPanel || isHovered;

  return (
    <group position={position.toArray()} quaternion={orientation}>
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); setHovered(section.id); }}
        onPointerOut={() => setHovered(null)}
        onClick={(e) => {
          e.stopPropagation();
          // Anchor the panel at the exact point on the branch that was clicked.
          const panel = { sectionId: section.id, position: e.point.toArray() as [number, number, number] };
          // Ctrl/Cmd-click stacks panels; a plain click shows only this one.
          if (e.ctrlKey || e.metaKey) togglePanel(panel);
          else toggleExclusive(panel);
        }}
      >
        <cylinderGeometry args={[Math.max(diamUm, 2), Math.max(diamUm, 2), length, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[diamUm / 2, diamUm / 2, length, 8]} />
        <meshStandardMaterial
          color={active ? "hotpink" : color}
          emissive={hasPanel ? "hotpink" : "black"}
          emissiveIntensity={hasPanel ? 0.4 : 0}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
};

// --- Panel projection (scene api) ---

/**
 * Lives inside the <Canvas>. Each frame it projects every open panel's
 * world-space anchor into screen pixels using the camera (the three.js scene
 * api) and writes the result straight onto the matching DOM node's transform.
 * Doing it imperatively avoids a React re-render on every frame.
 */
const PanelProjector = ({
  nodes,
}: {
  nodes: React.RefObject<Map<string, HTMLDivElement>>;
}) => {
  const projected = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, size }) => {
    const { panels } = useNeuronPanelStore.getState();
    for (const id in panels) {
      const node = nodes.current?.get(id);
      if (!node) continue;

      const [x, y, z] = panels[id].position;
      projected.set(x, y, z).project(camera);

      const screenX = (projected.x * 0.5 + 0.5) * size.width;
      const screenY = (-projected.y * 0.5 + 0.5) * size.height;
      const behindCamera = projected.z > 1;

      node.style.transform = `translate(-50%, calc(-100% - 12px)) translate(${screenX}px, ${screenY}px)`;
      node.style.opacity = behindCamera ? "0" : "1";
      node.style.pointerEvents = behindCamera ? "none" : "auto";
    }
  });

  return null;
};

// --- DOM panel ---

const ParamRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3 text-xs">
    <span className="text-white/50">{label}</span>
    <span className="font-mono text-white/90">{value}</span>
  </div>
);

const NeuronPanelCard = ({
  section,
  compartment,
  onClose,
}: {
  section?: SectionFragment;
  compartment?: CompartmentFragment;
  onClose: () => void;
}) => {
  if (!section) return null;

  return (
    <Card className="flex max-h-72 w-52 flex-col gap-0 border-white/10 bg-black/70 py-0 text-white shadow-2xl shadow-black/60 ring-white/10 backdrop-blur-xl hover:bg-black/70">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-2.5 py-1.5">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold tracking-tight">{section.id}</p>
          <p className="text-[0.5625rem] uppercase tracking-widest text-white/40">
            {section.category}
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded p-0.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close panel"
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="shrink-0 space-y-1 px-2.5 py-2">
        <ParamRow label="Diameter" value={section.diam} />
        {section.length && <ParamRow label="Length" value={section.length} />}
        <ParamRow label="Segments" value={section.nseg} />
      </div>

      {compartment && (
        <div className="flex min-h-0 flex-col border-t border-white/10 px-2.5 py-2">
          <p className="mb-1 shrink-0 text-[0.5625rem] uppercase tracking-widest text-white/40">
            Mechanisms
          </p>
          {compartment.mechanisms.length === 0 ? (
            <p className="text-[0.6875rem] text-white/40">None</p>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
              <div className="flex flex-wrap gap-1">
                {compartment.mechanisms.map((mech) => (
                  <span
                    key={mech}
                    className="rounded-full bg-white/10 px-1.5 py-0.5 text-[0.5625rem] font-medium"
                  >
                    {mech}
                  </span>
                ))}
              </div>

              {compartment.sectionParams.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {compartment.sectionParams.map((p, i) => (
                    <ParamRow
                      key={`${p.mechanism}-${p.param}-${i}`}
                      label={`${p.mechanism}.${p.param}`}
                      value={String(p.distribution.value)}
                    />
                  ))}
                </div>
              )}

              {compartment.ions.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {compartment.ions.map((ion) => (
                    <ParamRow
                      key={ion.ion}
                      label={`${ion.ion} (${ion.style})`}
                      value={ion.reversalPotential ?? "—"}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

/**
 * Sits on top of the <Canvas> as a normal DOM layer. It renders one panel per
 * open entry in the store; positioning is handled imperatively by
 * <PanelProjector>, which writes onto the refs we register here.
 */
const PanelOverlay = ({
  sectionMap,
  compartmentMap,
  nodes,
}: {
  sectionMap: Map<string, SectionFragment>;
  compartmentMap: Record<string, CompartmentFragment>;
  nodes: React.RefObject<Map<string, HTMLDivElement>>;
}) => {
  const panels = useNeuronPanelStore((s) => s.panels);
  const closePanel = useNeuronPanelStore((s) => s.closePanel);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Object.values(panels).map((panel) => {
        const section = sectionMap.get(panel.sectionId);
        return (
          <div
            key={panel.sectionId}
            ref={(el) => {
              if (el) nodes.current?.set(panel.sectionId, el);
              else nodes.current?.delete(panel.sectionId);
            }}
            className="absolute left-0 top-0 will-change-transform"
            style={{ pointerEvents: "auto" }}
          >
            <NeuronPanelCard
              section={section}
              compartment={
                section?.category ? compartmentMap[section.category] : undefined
              }
              onClose={() => closePanel(panel.sectionId)}
            />
          </div>
        );
      })}
    </div>
  );
};

// --- Main Component ---

export const NeuronVisualizer = ({ model }: { model: DetailNeuronModelFragment }) => {
  const segments = useNeuronLayout(model);

  // Importance heatmap: hover the control to preview, click to pin. Settings
  // tune the dominance blend weights (which refetch the score).
  const [weights, setWeights] = useState<DominanceWeights>(DEFAULT_WEIGHTS);
  const [pinned, setPinned] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const importanceActive = pinned || previewing;
  const importance = useImportanceColors(model, weights);

  // Network layer (synapses / stimulators / connections). Positions are joined
  // against the section geometry the layout already computed.
  const [showNetwork, setShowNetwork] = useState(true);
  const [hoveredNet, setHoveredNet] = useState<HoveredNet | null>(null);
  const segmentGeom = useMemo<Map<string, SegmentGeom>>(
    () =>
      new Map(
        segments.map((s) => [
          s.section.id,
          {
            start: s.start,
            end: s.end,
            radius: toBase(s.section.diam, "length", 1) / 2,
          },
        ]),
      ),
    [segments],
  );
  const network = useMemo(
    () => buildNetworkLayout(model.config, segmentGeom),
    [model.config, segmentGeom],
  );
  useCursor(Boolean(hoveredNet));

  const compartmentMap = useMemo(() => Object.fromEntries(model.config.cells.flatMap((cell) => cell.biophysics.compartments.map((c) => [c.id, c]))), [model]);
  const sectionMap = useMemo(
    () => new Map(segments.map((seg) => [seg.section.id, seg.section])),
    [segments],
  );
  const { points, target } = useMemo(() => computeRootCentroidFit(segments), [segments]);

  const nodes = useRef<Map<string, HTMLDivElement>>(new Map());
  const closeAll = useNeuronPanelStore((s) => s.closeAll);
  const hasPanels = useNeuronPanelStore((s) => Object.keys(s.panels).length > 0);

  // Panels are anchored to section ids of *this* model — drop them when the
  // model changes or the renderer unmounts so they can't leak across pages.
  useEffect(() => {
    return () => closeAll();
  }, [model.id, closeAll]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "500px" }}>
      <Canvas camera={{ fov: 34 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 50, 20]} />

        <OrbitControls makeDefault />

        {/* Fit the whole neuron into view, rotating around the root-node centroid. */}
        <FitCamera points={points} target={target} />

        {segments.map((seg) => (
          <Branch
            key={seg.uniqueKey}
            section={seg.section}
            start={seg.start}
            end={seg.end}
            color={
              importanceActive
                ? importance.colors.get(seg.section.id) ?? IMPORTANCE_MUTED
                : seg.color
            }
          />
        ))}

        {showNetwork && network.hasData && (
          <NetworkLayer network={network} onHover={setHoveredNet} />
        )}
        {hoveredNet && <NetworkTooltip hovered={hoveredNet} />}

        <PanelProjector nodes={nodes} />

        <EffectComposer>
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>

      <PanelOverlay sectionMap={sectionMap} compartmentMap={compartmentMap} nodes={nodes} />

      {/* Bottom-left, not top-left: the page floats its title card in the
          top-left corner (NeuronModelTitleOverlay), the way the dataset page
          does, so the HUD takes the corner beneath it. */}
      {(importance.hasData || network.hasData) && (
        <div className="pointer-events-auto absolute bottom-3 left-3 flex flex-col gap-2">
          {importance.hasData && (
            <ImportanceControl
              variant="dark"
              weights={weights}
              onWeightsChange={setWeights}
              active={importanceActive}
              pinned={pinned}
              onPreviewChange={setPreviewing}
              onTogglePin={() => setPinned((p) => !p)}
              min={importance.min}
              max={importance.max}
            />
          )}
          {network.hasData && (
            <NetworkControl
              show={showNetwork}
              onToggle={() => setShowNetwork((v) => !v)}
              counts={{
                synapses: network.synapses.length,
                stimulators: network.stimulators.length,
                connections: network.connections.length,
              }}
              unmatched={network.unmatchedSynapses}
            />
          )}
        </div>
      )}

      {hasPanels && (
        <button
          onClick={closeAll}
          className="pointer-events-auto absolute right-3 top-3 rounded-md border border-white/10 bg-black/60 px-2.5 py-1 text-xs text-white/70 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white"
        >
          Close all
        </button>
      )}
    </div>
  );
};
