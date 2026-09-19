import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import {
  NetworkLayout,
  PlacedConnection,
  PlacedStimulator,
  PlacedSynapse,
  STIMULATOR_COLOR,
} from "../lib/networkLayout";

/**
 * In-canvas rendering of the neuron model's network layer — synapse markers on
 * the morphology, floating stimulator glyphs, and connection lines — plus a
 * hover tooltip. Shared by the 3D `NeuronVisualizer` and the `NeuronEditor` so
 * both draw the network identically.
 */

export type HoveredNet =
  | { kind: "synapse"; point: THREE.Vector3; data: PlacedSynapse }
  | { kind: "stimulator"; point: THREE.Vector3; data: PlacedStimulator }
  | { kind: "connection"; point: THREE.Vector3; data: PlacedConnection };

export type SetHovered = (h: HoveredNet | null) => void;

const TipRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3">
    <span className="text-white/50">{label}</span>
    <span className="font-mono text-white/90">{value}</span>
  </div>
);

/** Small hover card anchored to the hovered network element (drei Html). */
export const NetworkTooltip = ({ hovered }: { hovered: HoveredNet }) => {
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
  } else if (hovered.kind === "stimulator") {
    const st = hovered.data.stim;
    title = "Stimulator";
    rows = [
      { label: "start", value: st.start },
      { label: "number", value: st.number },
      ...(st.interval ? [{ label: "interval", value: st.interval }] : []),
    ];
  } else {
    const c = hovered.data.connection;
    title = "Connection";
    rows = [
      ...(c.weight ? [{ label: "weight", value: c.weight }] : []),
      ...(c.delay ? [{ label: "delay", value: c.delay }] : []),
      ...(c.threshold ? [{ label: "threshold", value: c.threshold }] : []),
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

const SynapseMarker = ({
  placed,
  radius,
  onHover,
}: {
  placed: PlacedSynapse;
  radius: number;
  onHover: SetHovered;
}) => (
  <mesh
    position={placed.point.toArray()}
    onPointerOver={(e) => {
      e.stopPropagation();
      onHover({ kind: "synapse", point: placed.point, data: placed });
    }}
    onPointerOut={() => onHover(null)}
  >
    <sphereGeometry args={[radius, 16, 16]} />
    <meshStandardMaterial
      color={placed.color}
      emissive={placed.color}
      emissiveIntensity={0.35}
      roughness={0.4}
    />
  </mesh>
);

const StimulatorGlyph = ({
  placed,
  radius,
  onHover,
}: {
  placed: PlacedStimulator;
  radius: number;
  onHover: SetHovered;
}) => (
  <mesh
    position={placed.point.toArray()}
    onPointerOver={(e) => {
      e.stopPropagation();
      onHover({ kind: "stimulator", point: placed.point, data: placed });
    }}
    onPointerOut={() => onHover(null)}
  >
    <octahedronGeometry args={[radius * 1.6, 0]} />
    <meshStandardMaterial
      color={STIMULATOR_COLOR}
      emissive={STIMULATOR_COLOR}
      emissiveIntensity={0.4}
      roughness={0.3}
    />
  </mesh>
);

const ConnectionLine = ({
  placed,
  maxWeight,
  onHover,
}: {
  placed: PlacedConnection;
  maxWeight: number;
  onHover: SetHovered;
}) => {
  const w = Number.isFinite(placed.weight) ? placed.weight : null;
  const lineWidth =
    w != null && maxWeight > 0 ? 0.75 + 2.25 * (w / maxWeight) : 1.25;
  const mid = placed.from.clone().lerp(placed.to, 0.5);

  return (
    <Line
      points={[placed.from.toArray(), placed.to.toArray()]}
      color={STIMULATOR_COLOR}
      lineWidth={lineWidth}
      transparent
      opacity={0.5}
      dashed
      dashSize={4}
      gapSize={2}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover({ kind: "connection", point: mid, data: placed });
      }}
      onPointerOut={() => onHover(null)}
    />
  );
};

export const NetworkLayer = ({
  network,
  onHover,
}: {
  network: NetworkLayout;
  onHover: SetHovered;
}) => {
  // Marker radius is computed in the layout (also used to lift synapses onto
  // the mesh hull), so markers and their offsets stay in sync.
  const radius = network.markerRadius;
  const maxWeight = network.connections.reduce(
    (m, c) => (Number.isFinite(c.weight) ? Math.max(m, c.weight) : m),
    0,
  );

  return (
    <group>
      {network.connections.map((c) => (
        <ConnectionLine
          key={c.connection.id}
          placed={c}
          maxWeight={maxWeight}
          onHover={onHover}
        />
      ))}
      {network.synapses.map((s) => (
        <SynapseMarker
          key={s.synapse.id}
          placed={s}
          radius={radius}
          onHover={onHover}
        />
      ))}
      {network.stimulators.map((s) => (
        <StimulatorGlyph
          key={s.stim.id}
          placed={s}
          radius={radius}
          onHover={onHover}
        />
      ))}
    </group>
  );
};
