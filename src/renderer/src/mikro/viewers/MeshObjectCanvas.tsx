import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { computeSphereFitPose } from "@/core/data/scene/camera/fitPose";
import { asNavControls } from "@/core/data/scene/camera/keyboardNavigation";
import { NAVIGATE_BUTTONS_3D } from "@/core/data/scene/camera/navigateButtons";
import { createWebGPURendererFactory } from "@/core/data/scene/gpu/createWebGPURenderer";
import { useKeepTabLive } from "@/core/tabs/keepLive";
import { useTabVisible } from "@/core/tabs/TabVisibilityContext";
import type { MeshObjectGeometry } from "./meshObjectGeometry";

/**
 * One mesh, orbitable, in a box of its own: the morphology mini viewer's rig
 * (`MorphologyCanvas`) around a single surface. `frameloop="demand"` — nothing
 * draws at rest — and parked at `"never"` while the tab is hidden. No window
 * keys: the host owns those.
 */

const rendererFactory = createWebGPURendererFactory({ label: "mesh-object" });

const FOV = 34;
const SURFACE = "#c9ced8";

/** Frames the mesh once it lands, keeping the view direction. */
const FitOnLoad = ({ sphere }: { sphere: THREE.Sphere }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const ctrl = asNavControls(controls);
    if (!ctrl) return;
    const pose = computeSphereFitPose(sphere.center, Math.max(sphere.radius, 1e-3), {
      fov: camera.fov,
      aspect: size.width / Math.max(size.height, 1),
      viewDirection: camera.position.clone().sub(ctrl.target),
    });
    camera.position.copy(pose.position);
    camera.near = pose.near;
    camera.far = pose.far;
    camera.updateProjectionMatrix();
    ctrl.target.copy(pose.target);
    ctrl.update();
    invalidate();
    // Size is read, not a trigger: a resize keeps the user's framing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sphere, controls, camera, invalidate]);

  return null;
};

export const MeshObjectCanvas = ({ geometry }: { geometry: MeshObjectGeometry }) => {
  const visible = useTabVisible();
  // A frozen tab would drop the GPU context and its uploads: stay live hidden.
  useKeepTabLive();

  const built = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(geometry.positions, 3));
    g.setIndex(new THREE.BufferAttribute(geometry.indices, 1));
    if (geometry.normals) g.setAttribute("normal", new THREE.BufferAttribute(geometry.normals, 3));
    else g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }, [geometry]);
  useEffect(() => () => built.dispose(), [built]);
  const sphere = useMemo(() => built.boundingSphere ?? new THREE.Sphere(), [built]);

  return (
    <Canvas frameloop={visible ? "demand" : "never"} gl={rendererFactory} camera={{ fov: FOV, position: [0, 0, 5] }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 50, 20]} intensity={1.2} />
      <directionalLight position={[-20, -30, -10]} intensity={0.35} />
      <OrbitControls makeDefault mouseButtons={NAVIGATE_BUTTONS_3D} />
      <FitOnLoad sphere={sphere} />
      <mesh geometry={built} frustumCulled={false}>
        <meshStandardMaterial color={SURFACE} roughness={0.6} metalness={0.05} side={THREE.DoubleSide} />
      </mesh>
    </Canvas>
  );
};

export default MeshObjectCanvas;
