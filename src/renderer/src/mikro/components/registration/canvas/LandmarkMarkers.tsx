import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { worldUnitsPerPixel } from "../math/gizmoMath";
import { applyPoint } from "../math/mat4";
import { useRegistration, useRegistrationApi } from "../store/context";

const FIXED_COLOR = "#22d3ee";
const MOVING_COLOR = "#fbbf24";
const LINK_COLOR = "#f472b6";
const MARKER_PX = 5;

/**
 * The landmarks, where they are: a cyan dot on the fixed layer, an amber dot on
 * the moving layer (carried by the draft, since it is stored on the data), and
 * a link between the two halves of a pair. The link IS the residual — a fit is
 * good when the links vanish — so the quality of an alignment is visible in the
 * scene, not only as numbers in a table.
 *
 * No text labels: drei's `<Text>` is a troika ShaderMaterial and does not
 * compile on the WebGPU renderer. The table highlights a row's pair instead.
 *
 * Re-renders at click cadence (the landmark list); positions and screen-size
 * compensation are imperative in `useFrame` (P17).
 */
export const LandmarkMarkers = () => {
  const api = useRegistrationApi();
  const landmarks = useRegistration((state) => state.landmarks);
  const active = useRegistration((state) => state.session !== null);
  const highlighted = useRegistration((state) => state.highlightedLandmarkId);
  const invalidate = useThree((state) => state.invalidate);

  const fixedNodes = useRef(new Map<number, THREE.Object3D>());
  const movingNodes = useRef(new Map<number, THREE.Object3D>());
  const links = useRef<THREE.LineSegments>(null);

  const linkGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(landmarks.length * 6), 3));
    return geometry;
  }, [landmarks.length]);
  useEffect(() => () => linkGeometry.dispose(), [linkGeometry]);
  useEffect(() => api.subscribe(() => invalidate()), [api, invalidate]);

  useFrame(({ camera, size }) => {
    const state = api.getState();
    const lens = camera as { isOrthographicCamera?: boolean; zoom?: number; fov?: number };
    const sizeAt = (node: THREE.Object3D, boost: number) =>
      node.scale.setScalar(
        worldUnitsPerPixel(lens, camera.position.distanceTo(node.position), size.height) * MARKER_PX * boost,
      );

    const positions = linkGeometry.getAttribute("position") as THREE.BufferAttribute;
    state.landmarks.forEach((landmark, index) => {
      const boost = landmark.id === state.highlightedLandmarkId ? 1.8 : 1;
      const fixedNode = fixedNodes.current.get(landmark.id);
      if (fixedNode && landmark.fixed) {
        fixedNode.position.set(...landmark.fixed);
        sizeAt(fixedNode, boost);
      }
      const drawn = landmark.moving ? applyPoint(state.delta, landmark.moving) : null;
      const movingNode = movingNodes.current.get(landmark.id);
      if (movingNode && drawn) {
        movingNode.position.set(...drawn);
        sizeAt(movingNode, boost);
      }
      if (index * 6 + 5 < positions.array.length) {
        // An open pair gets a zero-length link rather than a stale one.
        const from = landmark.fixed ?? drawn ?? [0, 0, 0];
        const to = drawn ?? landmark.fixed ?? [0, 0, 0];
        positions.setXYZ(index * 2, from[0], from[1], from[2]);
        positions.setXYZ(index * 2 + 1, to[0], to[1], to[2]);
      }
    });
    positions.needsUpdate = true;
  });

  if (!active || landmarks.length === 0) return null;

  const dot = (color: string) => (
    <mesh>
      <sphereGeometry args={[1, 16, 12]} />
      <meshBasicMaterial color={color} depthTest={false} depthWrite={false} />
    </mesh>
  );

  return (
    <>
      <lineSegments ref={links} geometry={linkGeometry} renderOrder={27} frustumCulled={false}>
        <lineBasicMaterial color={LINK_COLOR} depthTest={false} depthWrite={false} />
      </lineSegments>
      {landmarks.map((landmark) => (
        <group key={landmark.id}>
          {landmark.fixed && (
            <group
              renderOrder={28}
              scale={0}
              ref={(node) => {
                if (node) fixedNodes.current.set(landmark.id, node);
                else fixedNodes.current.delete(landmark.id);
              }}
            >
              {dot(landmark.id === highlighted ? "#ffffff" : FIXED_COLOR)}
            </group>
          )}
          {landmark.moving && (
            <group
              renderOrder={28}
              scale={0}
              ref={(node) => {
                if (node) movingNodes.current.set(landmark.id, node);
                else movingNodes.current.delete(landmark.id);
              }}
            >
              {dot(landmark.id === highlighted ? "#ffffff" : MOVING_COLOR)}
            </group>
          )}
        </group>
      ))}
    </>
  );
};
