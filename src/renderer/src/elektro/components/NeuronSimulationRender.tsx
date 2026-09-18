import { Html, OrbitControls, useCursor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo, useState } from "react";
import * as THREE from "three";
import { CompartmentFragment, CoordFragment, DetailSimulationFragment, SectionFragment } from "../api/graphql";
import { FitCamera } from "../lib/fitCamera";
import { toBase } from "@/lib/quantities";
import { RecordingMarker } from "../model_render/RecordingMarker";
import { StimulusMarker } from "../model_render/StimulusMarker";
import { interpolateCoords } from "../model_render/utils";
import { sitesOf, type SiteLike } from "../lib/sites";

const getColorFromIndex = (index: number) => {
  const hue = (index * 137.508) % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

type CompartmentMap = Record<string, CompartmentFragment>;

const CylinderWithTooltip = ({
  section,
  start,
  end,
  color,
  compartmentMap,
  selectedId,
  setSelectedId,
}: {
  section: SectionFragment;
  start: CoordFragment;
  end: CoordFragment;
  color: string;
  compartmentMap: CompartmentMap;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}) => {
  const [hovered, setHovered] = useState(false);
  const isSelected = selectedId === section.id;

  // Coords are `Length` quantity strings ("1 µm"); normalise each to µm.
  const startVec = new THREE.Vector3(
    toBase(start.x, "length", 0),
    toBase(start.y, "length", 0),
    toBase(start.z, "length", 0),
  );
  const endVec = new THREE.Vector3(
    toBase(end.x, "length", 0),
    toBase(end.y, "length", 0),
    toBase(end.z, "length", 0),
  );
  const dir = new THREE.Vector3().subVectors(endVec, startVec);
  const length = dir.length();
  const diamUm = toBase(section.diam, "length", 1);
  const position = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
  const orientation = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize()
  );

  const params = section.category ? compartmentMap[section.category] : undefined;

  useCursor(hovered);

  return (
    <group position={position.toArray()} quaternion={orientation}>
      {/* Interaction hitbox */}
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedId(section.id);
        }}
      >
        <cylinderGeometry args={[diamUm * 2, diamUm * 2, length * 2, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Visible geometry */}
      <mesh>
        <cylinderGeometry args={[diamUm / 2, diamUm / 2, length, 8]} />
        <meshStandardMaterial color={hovered ? "hotpink" : color} />
      </mesh>

      {(isSelected) && (
        <Html center>
          <div
            style={{
              background: "rgba(0,0,0,0.8)",
              color: "white",
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              minWidth: "200px",
              maxHeight: "250px",
              overflowY: "auto",
            }}
          >
            <strong>Section: {section.id}</strong>
            <div>Category: <code>{section.category}</code></div>
            {params ? (
              <>
                <div style={{ marginTop: 4 }}>
                  <strong>Ions:</strong>
                  <ul style={{ paddingLeft: 16 }}>
                    {params.ions.map(({ ion, style }) => (
                      <li key={ion}>{ion}: {style}</li>
                    ))}
                  </ul>
                </div>
                <div style={{ marginTop: 4 }}>
                  <strong>Section Params:</strong>
                  <ul style={{ paddingLeft: 16 }}>
                    {params.sectionParams.map(({ mechanism, param, distribution }) => (
                      <li key={`${mechanism}.${param}`}>{mechanism}.{param}: {distribution.value}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div style={{ color: "#ccc" }}>No matching compartment data</div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};



export const NeuronSimulationVisualizer = ({ simulation }: { simulation: DetailSimulationFragment }) => {
  const sitePoint = (site: SiteLike): THREE.Vector3 | null => {
    const cell = simulation.model.config.cells.find((c) => c.id === site.cell);
    const section = cell?.topology.sections.find((s) => s.id === site.location);
    if (!section?.coords || typeof site.position !== "number") return null;
    return interpolateCoords(section.coords, site.position);
  };
  const cells = simulation.model.config.cells
  const compartmentMap = Object.fromEntries(
    simulation.model.config.cells.flatMap((cell) =>
      cell.biophysics.compartments.map((c) => [c.id, c])
    )
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Rotation center = centroid of every cell's root-node position; the enclosing
  // radius (from all coords) keeps the whole model framed regardless of aspect.
  const { points, target } = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const rootNodes: THREE.Vector3[] = [];
    cells.forEach(cell =>
      cell.topology.sections.forEach(section => {
        const isRoot = !section.parent;
        if (section.coords && section.coords.length > 0) {
          // Coords / length are `Length` quantity strings; normalise to µm.
          section.coords.forEach(c => points.push(new THREE.Vector3(
            toBase(c.x, "length", 0), toBase(c.y, "length", 0), toBase(c.z, "length", 0),
          )));
          if (isRoot) {
            const c = section.coords[0];
            rootNodes.push(new THREE.Vector3(
              toBase(c.x, "length", 0), toBase(c.y, "length", 0), toBase(c.z, "length", 0),
            ));
          }
        } else {
          const half = toBase(section.length, "length", 10) / 2;
          points.push(new THREE.Vector3(0, 0, -half), new THREE.Vector3(0, 0, half));
          if (isRoot) rootNodes.push(new THREE.Vector3(0, 0, -half));
        }
      }),
    );
    const basis = rootNodes.length > 0 ? rootNodes : points;
    const target = new THREE.Vector3();
    basis.forEach(p => target.add(p));
    if (basis.length > 0) target.multiplyScalar(1 / basis.length);
    return { points, target };
  }, [cells]);

  return (
    <Canvas
      camera={{ position: [0, 0, 200], fov: 50 }}
      onPointerMissed={() => setSelectedId(null)}
    >
      <ambientLight />
      <directionalLight position={[20, 10, 10]} />
      <OrbitControls makeDefault />

      <FitCamera points={points} target={target} />

      <>
        {cells.map(cell =>
          <>
            {cell.topology.sections.flatMap((section, secIndex) => {
              const color = getColorFromIndex(secIndex);

              const coords = section.coords;
              if (coords && coords.length > 1) {
                return coords.slice(1).map((end, i) => (
                  <CylinderWithTooltip
                    key={`${section.id}-${i}`}
                    section={section}
                    start={coords[i]}
                    end={end}
                    color={color}
                    compartmentMap={compartmentMap}
                    selectedId={selectedId}
                    setSelectedId={setSelectedId}
                  />
                ));
              } else {
                // Fallback geometry centred on the origin; lengths are in µm and
                // CylinderWithTooltip re-parses coords, so emit them as µm strings.
                const halfUm = toBase(section.length, "length", 10) / 2;
                const start: CoordFragment = { x: "0 µm", y: "0 µm", z: `${-halfUm} µm` };
                const end: CoordFragment = { x: "0 µm", y: "0 µm", z: `${halfUm} µm` };

                return (
                  <CylinderWithTooltip
                    key={`${section.id}-fallback`}
                    section={section}
                    start={start}
                    end={end}
                    color={color}
                    compartmentMap={compartmentMap}
                    selectedId={selectedId}
                    setSelectedId={setSelectedId}
                  />
                );
              }
            }
            )}
          </>)}
        {/* Markers come from the sites the datasets' anchors name. A site on a
            section the model does not have is skipped, not thrown on: a stale
            anchor should cost a marker, not the whole picture. */}
        {simulation.recordings.flatMap((dataset) => sitesOf(dataset, "recording")).map((site) => {
          const point = sitePoint(site);
          return point ? <RecordingMarker key={`rec-${site.id}`} recording={site} position={point} /> : null;
        })}
        {simulation.stimuli.flatMap((dataset) => sitesOf(dataset, "stimulus")).map((site) => {
          const point = sitePoint(site);
          return point ? <StimulusMarker key={`stim-${site.id}`} stimulus={site} position={point} /> : null;
        })}
      </>
    </Canvas>
  );
};
