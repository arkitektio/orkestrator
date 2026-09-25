import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { worldUnitsPerPixelAt } from "@/core/lib/scene/camera/sceneNavigation";
import type { OutlinePoint } from "./roiOutline";

/**
 * Dots on the vertices placed so far, holding a constant size on screen at any
 * zoom.
 *
 * The first vertex is drawn larger and in a different colour because it is where
 * a polygon closes — you need to see the target you are aiming the last click at.
 *
 * Scaling happens imperatively in `useFrame` off the camera, not through a
 * `worldUnitsPerPixel` store subscription: that field is throttled, and
 * subscribing would re-render this component on every camera move (P17). Same
 * shape as `shell/SceneProbedPoint.tsx`, including the `scale={0}`
 * mount so nothing draws at the wrong size for one frame.
 *
 * Measured at EACH handle's own distance from the camera. Under perspective,
 * world-units-per-pixel is a function of depth, so the one number that makes a
 * marker constant on screen is the one taken where the marker is. The probe
 * marker survives using the origin-based figure only because
 * `probeMarkerRadius` clamps it to a fraction of the layer; a handle has no
 * such clamp, so in a scene that does not sit on the world origin the
 * origin-based figure drew a dot the size of the data.
 */

const HANDLE_PX = 4;
/** The closing target reads as a target only if it's clearly bigger. */
const FIRST_VERTEX_SCALE = 1.6;

const FIRST_COLOR = "#fbbf24";
const REST_COLOR = "#22d3ee";

export interface VertexHandlesProps {
  /** Placed vertices in world space. Changes only at click cadence. */
  vertices: readonly OutlinePoint[];
  pxRadius?: number;
}

export const VertexHandles = ({
  vertices,
  pxRadius = HANDLE_PX,
}: VertexHandlesProps) => {
  const groups = useRef(new Map<number, THREE.Group>());

  useFrame(({ camera, size }) => {
    if (groups.current.size === 0) return;
    // Orthographic ignores the distance (its scale is pure zoom), so the flat
    // view keeps exactly the size it had.
    const navigationCamera = camera as {
      isOrthographicCamera?: boolean;
      zoom?: number;
      fov?: number;
    };
    for (const [index, group] of groups.current) {
      const wupp = worldUnitsPerPixelAt(
        navigationCamera,
        camera.position.distanceTo(group.position),
        size.height,
      );
      group.scale.setScalar(
        wupp * pxRadius * (index === 0 ? FIRST_VERTEX_SCALE : 1),
      );
    }
  });

  if (vertices.length === 0) return null;

  return (
    <>
      {vertices.map((vertex, index) => (
        <group
          // Index-keyed on purpose: vertices are only ever appended or cleared
          // wholesale, so an index is stable for a handle's life.
          key={index}
          position={vertex}
          renderOrder={11}
          // Start invisible; the first useFrame sets the real radius before draw.
          scale={0}
          ref={(group) => {
            if (group) groups.current.set(index, group);
            else groups.current.delete(index);
          }}
        >
          <mesh>
            <circleGeometry args={[1, 16]} />
            <meshBasicMaterial
              color={index === 0 ? FIRST_COLOR : REST_COLOR}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </>
  );
};
