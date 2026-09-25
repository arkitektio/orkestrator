import { useFrame } from '@react-three/fiber';

import { computeWorldUnitsPerPixel, probeMarkerRadius } from '../platform/probe/probeWorld';
import { useProbeMarkerBinding } from '../features/probe/useProbeMarkerBinding';
import { perfMonitor } from '../platform/perf/perfMonitor';

/** Screen-pixel radius + physical clamps for the 3D probe marker. */
const MARKER_PX = 6;
const MARKER_MIN_FRACTION = 0.004;
const MARKER_MAX_FRACTION = 0.03;

/**
 * The sphere marking the active probe.
 *
 * Mounted once per probe TARGET and then driven imperatively: the geometry and
 * materials are built when the target appears and live until it goes away, so a
 * hover sweep moves the same objects instead of disposing and rebuilding them
 * (and, on WebGPU, their pipelines) at every voxel crossing. Position comes
 * from `useProbeMarkerBinding`, the camera-dependent radius from the `useFrame`
 * below — neither goes through React (P17). At most one marker: saved points
 * are persisted annotations, rendered by the AnnotationLayer.
 */
export const SceneProbedPoint = () => {
  perfMonitor.countRender('SceneProbedPoint'); // no-op unless a perf recording is armed
  const { identity, outerRef, innerRef, minAxisRef } = useProbeMarkerBinding();

  // Constant-screen-size compensation, straight from the camera each rendered
  // frame (demand frameloop: frames only happen while something changes).
  useFrame(({ camera, size }) => {
    const inner = innerRef.current;
    if (!inner || minAxisRef.current === 0) return;
    inner.scale.setScalar(
      probeMarkerRadius(
        minAxisRef.current,
        computeWorldUnitsPerPixel(camera, size.height),
        MARKER_PX,
        MARKER_MIN_FRACTION,
        MARKER_MAX_FRACTION,
      ),
    );
  });

  if (identity === null) return null;

  return (
    // Starts hidden at scale 0: the binding makes it visible once the geometry
    // resolves, and the first useFrame gives it its real radius — so it never
    // draws for a frame at the wrong place or size.
    <group ref={outerRef} matrixAutoUpdate={false} visible={false}>
      <group ref={innerRef} renderOrder={4} scale={0}>
        <mesh>
          <sphereGeometry args={[1, 24, 16]} />
          <meshBasicMaterial color="#f97316" depthWrite={false} />
        </mesh>
        <mesh scale={1.65}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshBasicMaterial
            color="#fb923c"
            transparent
            opacity={0.2}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
};
