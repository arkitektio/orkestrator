import { Html, useCursor } from "@react-three/drei";
import { type ThreeEvent, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { MeshStandardNodeMaterial } from "three/webgpu";
import { Line } from "@/core/lib/scene/draw/Line";
import {
  NetworkLayout,
  PlacedStimulator,
  PlacedSynapse,
  STIMULATOR_COLOR,
} from "../model/networkLayout";
import { useMorphologyStore } from "../stores/morphologyStore";
import { INSTANCE_UPLOAD_FRAMES } from "./instanceUpload";

/**
 * The network layer in the canvas — synapse markers on the morphology,
 * floating stimulator glyphs and stimulator→synapse connections — plus a hover
 * tooltip. Shared by the viewer and the editor so both draw it identically.
 *
 * Markers are instanced (one draw per kind, colour per instance); the
 * connections are the WebGPU fat line (`@/lib/scene/draw/Line`), which drei's
 * WebGL `<Line>` cannot be under this renderer. Visibility of each part comes
 * from the store's network layer settings.
 */

type Hovered =
  | { kind: "synapse"; point: THREE.Vector3; data: PlacedSynapse }
  | { kind: "stimulator"; point: THREE.Vector3; data: PlacedStimulator };

/** A dimmed stimulator violet: the lines are context, the markers the data. */
const CONNECTION_COLOR = new THREE.Color(STIMULATOR_COLOR).multiplyScalar(0.6);

const SYNAPSE_GEOMETRY = new THREE.SphereGeometry(1, 16, 12);
const STIMULATOR_GEOMETRY = new THREE.OctahedronGeometry(1.6, 0);

const TipRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3">
    <span className="text-white/50">{label}</span>
    <span className="font-mono text-white/90">{value}</span>
  </div>
);

/** Small hover card anchored to the hovered marker. */
const NetworkTooltip = ({ hovered }: { hovered: Hovered }) => {
  let title: string;
  let badge: string | null = null;
  let rows: { label: string; value: React.ReactNode }[];

  if (hovered.kind === "synapse") {
    const s = hovered.data.synapse;
    title = "Synapse";
    badge = hovered.data.excitatory ? "excitatory" : "inhibitory";
    rows = [
      { label: "on", value: s.location },
      { label: "τ1", value: s.tau1 },
      { label: "τ2", value: s.tau2 },
      { label: "e", value: s.e },
      ...(s.delay ? [{ label: "delay", value: s.delay }] : []),
    ];
  } else {
    const st = hovered.data.stim;
    title = "Stimulator";
    rows = [
      { label: "start", value: st.start },
      { label: "number", value: st.number },
      ...(st.interval ? [{ label: "interval", value: st.interval }] : []),
    ];
  }

  return (
    <Html position={hovered.point.toArray()} center>
      <div className="pointer-events-none -translate-y-3 rounded-md border border-white/10 bg-black/80 px-2 py-1.5 text-xs text-white shadow-xl backdrop-blur-md">
        <div className="mb-1 flex items-center gap-2">
          <span className="font-semibold tracking-tight">{title}</span>
          {badge && (
            <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[0.5625rem] uppercase tracking-widest text-white/60">
              {badge}
            </span>
          )}
        </div>
        <div className="space-y-0.5">
          {rows.map((r) => (
            <TipRow key={r.label} label={r.label} value={r.value} />
          ))}
        </div>
      </div>
    </Html>
  );
};

/** One instanced marker kind: positions, per-instance colours, hover by instance. */
const Markers = <T,>({
  items,
  pointOf,
  colorOf,
  geometry,
  radius,
  onHover,
}: {
  items: readonly T[];
  pointOf: (item: T) => THREE.Vector3;
  colorOf: (item: T) => string;
  geometry: THREE.BufferGeometry;
  radius: number;
  onHover: (item: T | null) => void;
}) => {
  const invalidate = useThree((s) => s.invalidate);
  const mesh = useMemo(() => {
    const material = new MeshStandardNodeMaterial({ roughness: 0.35 });
    const instanced = new THREE.InstancedMesh(geometry, material, Math.max(1, items.length));
    instanced.count = items.length;
    instanced.frustumCulled = false;
    return instanced;
  }, [geometry, items.length]);

  useEffect(
    () => () => {
      (mesh.material as THREE.Material).dispose();
      mesh.dispose();
    },
    [mesh],
  );

  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    items.forEach((item, i) => {
      matrix.makeScale(radius, radius, radius).setPosition(pointOf(item));
      mesh.setMatrixAt(i, matrix);
      // Emissive-ish: lift the colour so markers read against lit tubes.
      mesh.setColorAt(i, color.setStyle(colorOf(item)).multiplyScalar(1.25));
    });
    if (items.length === 0) mesh.setColorAt(0, color.set(0, 0, 0));
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    invalidate(INSTANCE_UPLOAD_FRAMES);
  }, [mesh, items, pointOf, colorOf, radius, invalidate]);

  if (items.length === 0) return null;
  return (
    <primitive
      object={mesh}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onHover(e.instanceId != null ? items[e.instanceId] ?? null : null);
      }}
      onPointerOut={() => onHover(null)}
    />
  );
};

const synapsePoint = (s: PlacedSynapse) => s.point;
const synapseColor = (s: PlacedSynapse) => s.color;
const stimulatorPoint = (s: PlacedStimulator) => s.point;
const stimulatorColor = () => STIMULATOR_COLOR;

export const NetworkMarks = ({ network }: { network: NetworkLayout }) => {
  const settings = useMorphologyStore((s) => s.network);
  const [hovered, setHovered] = useState<Hovered | null>(null);
  useCursor(Boolean(hovered));

  const maxWeight = useMemo(
    () =>
      network.connections.reduce(
        (m, c) => (Number.isFinite(c.weight) ? Math.max(m, c.weight) : m),
        0,
      ),
    [network.connections],
  );

  // Hidden parts can't stay hovered.
  useEffect(() => {
    if (!settings.visible) setHovered(null);
  }, [settings.visible]);

  if (!settings.visible || !network.hasData) return null;

  return (
    <group>
      {settings.connections &&
        network.connections.map((c) => {
          const w = Number.isFinite(c.weight) ? c.weight : null;
          return (
            <Line
              key={c.connection.id}
              points={[c.from, c.to]}
              color={CONNECTION_COLOR}
              lineWidth={w != null && maxWeight > 0 ? 0.75 + 2.25 * (w / maxWeight) : 1.25}
              dashed
              dashSize={4}
              gapSize={2}
            />
          );
        })}
      {settings.synapses && (
        <Markers
          items={network.synapses}
          pointOf={synapsePoint}
          colorOf={synapseColor}
          geometry={SYNAPSE_GEOMETRY}
          radius={network.markerRadius}
          onHover={(s) =>
            setHovered(s ? { kind: "synapse", point: s.point, data: s } : null)
          }
        />
      )}
      {settings.stimulators && (
        <Markers
          items={network.stimulators}
          pointOf={stimulatorPoint}
          colorOf={stimulatorColor}
          geometry={STIMULATOR_GEOMETRY}
          radius={network.markerRadius}
          onHover={(s) =>
            setHovered(s ? { kind: "stimulator", point: s.point, data: s } : null)
          }
        />
      )}
      {hovered && <NetworkTooltip hovered={hovered} />}
    </group>
  );
};
