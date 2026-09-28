import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useRegistration, useRegistrationApi } from "../store/context";

/** The 12 edges of a unit box, as index pairs into its 8 corners. */
const EDGES = [0, 1, 1, 3, 3, 2, 2, 0, 4, 5, 5, 7, 7, 6, 6, 4, 0, 4, 1, 5, 2, 6, 3, 7];

/**
 * An outline of the moving layer, drawn WHERE THE DRAFT PUTS IT.
 *
 * Two jobs. It says which layer a session is moving — not obvious when layers
 * overlap, which is the whole situation — and in `release` apply-mode it IS
 * the feedback during a drag: the data stays put (so a heavy scene replans
 * once, on release) and this box shows where it is going.
 *
 * The box is the layer's world box under the SERVER placement (`baseBox`),
 * carried by the draft as a matrix. Set imperatively in `useFrame` (P17); a
 * plain `LineSegments` with a basic material, since drei's `<Line>` does not
 * compile on the WebGPU renderer.
 */
export const MovingOutline = () => {
  const api = useRegistrationApi();
  const active = useRegistration((state) => state.session !== null);
  const baseBox = useRegistration((state) => state.baseBox);
  const lines = useRef<THREE.LineSegments>(null);
  const invalidate = useThree((state) => state.invalidate);

  const geometry = useMemo(() => {
    if (!baseBox) return null;
    const { min, max } = baseBox;
    const corners: number[][] = [];
    for (const z of [min[2], max[2]]) for (const y of [min[1], max[1]]) for (const x of [min[0], max[0]]) corners.push([x, y, z]);
    const positions = new Float32Array(EDGES.flatMap((index) => corners[index]));
    const built = new THREE.BufferGeometry();
    built.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return built;
  }, [baseBox]);

  useEffect(() => () => geometry?.dispose(), [geometry]);
  useEffect(() => api.subscribe(() => invalidate()), [api, invalidate]);

  useFrame(() => {
    const node = lines.current;
    if (!node) return;
    const d = api.getState().delta;
    // Row-major rows straight into `Matrix4.set`, which takes row-major.
    node.matrix.set(
      d[0][0], d[0][1], d[0][2], d[0][3],
      d[1][0], d[1][1], d[1][2], d[1][3],
      d[2][0], d[2][1], d[2][2], d[2][3],
      0, 0, 0, 1,
    );
    // `matrixAutoUpdate` is off, so three will not notice the write by itself.
    node.matrixWorldNeedsUpdate = true;
  });

  if (!active || !geometry) return null;

  return (
    <lineSegments ref={lines} geometry={geometry} matrixAutoUpdate={false} renderOrder={29} frustumCulled={false}>
      <lineBasicMaterial color="#fbbf24" depthTest={false} depthWrite={false} transparent opacity={0.9} />
    </lineSegments>
  );
};
