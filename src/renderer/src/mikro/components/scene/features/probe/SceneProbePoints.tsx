import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { probePointColor, type ProbePoint } from "../../platform/probe/probePoints";
import { computeWorldUnitsPerPixel } from "../../platform/probe/probeWorld";
import { useViewerStore } from "../../platform/stores/viewerStore";

/** Screen-pixel radius of a pinned point's marker. */
const MARKER_PX = 5;
/** A point pinned on another slice of the flat view: still there, visibly not here. */
const OFF_SLICE_OPACITY = 0.25;

const scratch = new THREE.Vector3();

const ProbePointMarker = ({
  point,
  flat,
  dimmed,
}: {
  point: ProbePoint;
  flat: boolean;
  dimmed: boolean;
}) => {
  const groupRef = useRef<THREE.Group | null>(null);
  const world = point.probe.worldPos;

  // Constant screen size, straight from the camera each rendered frame — the
  // live marker's idiom (`shell/SceneProbedPoint.tsx`), measured at the point
  // itself so a perspective view sizes near and far markers alike.
  useFrame(({ camera, size }) => {
    const group = groupRef.current;
    if (!group || !world) return;
    const radius =
      computeWorldUnitsPerPixel(camera, size.height, scratch.set(world[0], world[1], world[2])) *
      MARKER_PX;
    group.scale.setScalar(radius);
    // Lifted just off the image plane, like the live 2D marker.
    if (flat) group.position.z = world[2] + radius * 0.2;
  });

  if (!world) return null;
  const color = probePointColor(point.index);
  const opacity = dimmed ? OFF_SLICE_OPACITY : 1;

  return (
    // Starts at scale 0: the first useFrame gives it its real radius, so it
    // never draws for a frame at the wrong size.
    <group ref={groupRef} position={world} renderOrder={flat ? 5 : 4} scale={0}>
      {flat ? (
        <>
          <mesh>
            <ringGeometry args={[0.7, 1, 32]} />
            <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
          </mesh>
          <mesh>
            <circleGeometry args={[0.3, 16]} />
            <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
          </mesh>
        </>
      ) : (
        <>
          <mesh>
            <sphereGeometry args={[1, 20, 14]} />
            <meshBasicMaterial color={color} depthWrite={false} />
          </mesh>
          <mesh scale={1.65}>
            <sphereGeometry args={[1, 20, 14]} />
            <meshBasicMaterial color={color} transparent opacity={0.25} depthWrite={false} />
          </mesh>
        </>
      )}
    </group>
  );
};

/**
 * The pinned probe points, drawn where they were clicked — each in the colour
 * of its panel in the probe HUD, which is how the two are told apart.
 *
 * A React subscription is fine here: `probePoints` changes at click cadence,
 * unlike the live probe the single orange marker tracks (P17). `flat` is the
 * 2D view: rings instead of spheres, and points pinned on a different slice
 * (or in 3D) are dimmed rather than passed off as lying on this one.
 */
export const SceneProbePoints = ({ flat = false }: { flat?: boolean }) => {
  const points = useViewerStore((s) => s.probePoints);
  const currentZ = useViewerStore((s) => (flat ? s.currentZ : 0));
  const invalidate = useThree((state) => state.invalidate);

  // Demand frameloop: a pinned or removed point needs a frame to show.
  useEffect(() => {
    invalidate();
  }, [points, currentZ, invalidate]);

  return (
    <>
      {points.map((point) => (
        <ProbePointMarker
          key={point.id}
          point={point}
          flat={flat}
          dimmed={flat && point.flatZ !== currentZ}
        />
      ))}
    </>
  );
};
