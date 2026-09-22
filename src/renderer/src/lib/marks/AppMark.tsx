/**
 * AppMark.tsx — the live render. One embedding in, one mark out.
 *
 *   <MarkCanvas>
 *     <AppMark name="stardist-node" identifier="live.arkitekt.stardist" />
 *   </MarkCanvas>
 *
 * This is the DETAIL-PAGE path, and only that. Browsers cap live WebGL contexts
 * at roughly 8-16 and silently drop the oldest past that, so a list must never
 * mount one of these per row — it uses `useMarkImage`, which renders each mark
 * once through one shared offscreen context and hands back a PNG.
 *
 * The scene graph itself is not built here: `markNodes()` owns it, so this and
 * the offscreen renderer cannot disagree about where anything sits.
 */
import { Canvas, useThree, type ThreeElements } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { AMBIENT_LIGHT, FILL_LIGHT, KEY_LIGHT, MARK_CAMERA, MATERIAL } from "./constants";
import { geometryFor } from "./geometry";
import { colorFor, markNodes } from "./markNodes";
import { markParams, type MarkInput, type MarkParams } from "./markParams";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

/**
 * Drop this inside a Canvas once. Builds the PMREM environment from
 * RoomEnvironment, so nothing is fetched over the network.
 */
export function MarkStudio({ intensity = 1 }: { intensity?: number }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  React.useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  return (
    <>
      <directionalLight
        position={KEY_LIGHT.position}
        intensity={KEY_LIGHT.intensity * intensity}
        color={KEY_LIGHT.color}
      />
      <directionalLight
        position={FILL_LIGHT.position}
        intensity={FILL_LIGHT.intensity * intensity}
        color={FILL_LIGHT.color}
      />
      <ambientLight intensity={AMBIENT_LIGHT.intensity * intensity} />
    </>
  );
}

type GroupProps = ThreeElements["group"];

export interface AppMarkProps
  extends Omit<GroupProps, "scale" | "ref" | "name">,
    MarkInput {
  /** Drop the orbiting extras. Below ~48px on screen they turn to mush. */
  simple?: boolean;
  /** Override the derived parameters, e.g. to force a symbol in a picker. */
  params?: MarkParams;
  /** Multiplies the built-in framing scale. */
  scale?: number;
}

export const AppMark = React.forwardRef<THREE.Group, AppMarkProps>(function AppMark(
  { name, identifier, embedding, simple = false, params, scale = 1, ...group },
  ref,
) {
  const p = React.useMemo(
    () => params ?? markParams({ name, identifier, embedding }),
    [params, name, identifier, embedding],
  );

  const scene = React.useMemo(() => markNodes(p, { simple, scale }), [p, simple, scale]);

  // Meshes stay declarative rather than being built into a Group and handed to
  // <primitive>: an Object3D has a single parent, and R3F neither reconciles a
  // swapped `object` prop nor leaves its disposal alone. Mapping the nodes lets
  // React own keys, reconciliation and material disposal, and it survives
  // StrictMode's double mount, which manual disposal does not.
  return (
    <group ref={ref} {...group}>
      <group rotation={scene.rotation} scale={scene.scale}>
        {scene.nodes.map((node) => {
          const geometry = geometryFor(node);
          if (!geometry) return null;
          const m = MATERIAL[node.material];
          return (
            <mesh
              key={node.key}
              geometry={geometry}
              position={node.position}
              rotation={node.rotation}
              scale={node.scale}
            >
              <meshStandardMaterial
                color={colorFor(p, node.material)}
                roughness={m.roughness}
                metalness={m.metalness}
                envMapIntensity={m.envMapIntensity}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
});

export interface MarkCanvasProps extends React.ComponentProps<typeof Canvas> {
  children?: React.ReactNode;
}

/**
 * A square canvas with the studio already in it. Long focal length and a fixed
 * 3/4 camera, so a mark reads as an icon rather than as a scene.
 *
 * Defaults to frameloop="demand": a mark is static, so it draws once and then
 * costs nothing. Pass frameloop="always" for a detail view that spins.
 */
export function MarkCanvas({ children, ...props }: MarkCanvasProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
      camera={{
        fov: MARK_CAMERA.fov,
        position: MARK_CAMERA.position,
        near: MARK_CAMERA.near,
        far: MARK_CAMERA.far,
      }}
      {...props}
    >
      <MarkStudio />
      {children}
    </Canvas>
  );
}
