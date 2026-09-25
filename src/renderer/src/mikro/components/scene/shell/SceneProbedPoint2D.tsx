import { useFrame } from '@react-three/fiber';

import { computeWorldUnitsPerPixel, probeMarkerRadius } from '../platform/probe/probeWorld';
import { useProbeMarkerBinding } from '../features/probe/useProbeMarkerBinding';
import { perfMonitor } from '../platform/perf/perfMonitor';

/** Screen-pixel radius + physical clamps for the 2D probe marker. */
const MARKER_PX = 8;
const MARKER_MIN_FRACTION = 0.006;
const MARKER_MAX_FRACTION = 0.04;

/**
 * The crosshair marking the active probe in the flat view.
 *
 * Same construction as the 3D marker (`SceneProbedPoint`): mounted once per
 * probe target and driven imperatively from `useProbeMarkerBinding`, so a hover
 * sweep never disposes and rebuilds its geometry. Differs only in the shape,
 * the pixel radius, and the lift off the image plane applied below.
 */
export const SceneProbedPoint2D = () => {
  perfMonitor.countRender('SceneProbedPoint2D'); // no-op unless a perf recording is armed
  const { identity, outerRef, innerRef, minAxisRef, baseZRef } = useProbeMarkerBinding();

  useFrame(({ camera, size }) => {
    const inner = innerRef.current;
    if (!inner || minAxisRef.current === 0) return;
    const radius = probeMarkerRadius(
      minAxisRef.current,
      computeWorldUnitsPerPixel(camera, size.height),
      MARKER_PX,
      MARKER_MIN_FRACTION,
      MARKER_MAX_FRACTION,
    );
    inner.scale.setScalar(radius);
    // Lift slightly above the image plane, proportional to the marker size.
    inner.position.z = baseZRef.current + radius * 0.2;
  });

  if (identity === null) return null;

  return (
    // Starts hidden at scale 0: the binding makes it visible once the geometry
    // resolves, and the first useFrame gives it its real radius — so it never
    // draws for a frame at the wrong place or size.
    <group ref={outerRef} matrixAutoUpdate={false} visible={false}>
      <group ref={innerRef} renderOrder={5} scale={0}>
        <mesh>
          <ringGeometry args={[0.72, 1, 36]} />
          <meshBasicMaterial
            color="#f97316"
            transparent
            opacity={0.95}
            depthWrite={false}
          />
        </mesh>
        <mesh>
          <boxGeometry args={[2.1, 0.18, 0.04]} />
          <meshBasicMaterial color="#fb923c" depthWrite={false} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.18, 2.1, 0.04]} />
          <meshBasicMaterial color="#fb923c" depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
};
