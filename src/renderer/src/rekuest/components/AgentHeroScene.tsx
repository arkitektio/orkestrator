import { WithMediaUrl } from "@/rekuest/datalayer/rekuestAccess";
import { Center, Environment, Html, OrbitControls, Stage, useGLTF } from "@react-three/drei";
import { Canvas, type ThreeElements } from "@react-three/fiber";
import {
  Bloom,
  ChromaticAberration,
  EffectComposer
} from "@react-three/postprocessing";
import { Suspense, useRef } from "react";
import type { Group } from "three";
import { Vector2 } from "three";
import { AgentPlacementFragment } from "../api/graphql";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

const AGENT_SCENE_URL = "https://files.catbox.moe/sgdtnt.gltf";

const AgentModel = (props: { url: string }) => {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(props.url);

  return (
      <group ref={groupRef}>
        <Center>
          <primitive object={scene} />
        </Center>
      </group>
  );
};

const AgentSceneFallback = () => {
  return (
    <Html center>
      <div className="text-muted-foreground backdrop-blur-sm">
        Loading scene...
      </div>
    </Html>
  );
};

export const AgentHeroScene = (props: { placement: AgentPlacementFragment }) => {
  return (
    <div className="absolute inset-y-0 right-0 w-[40%] overflow-hidden rounded-lg bg-black">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-full bg-[linear-gradient(90deg,rgba(0,0,0,0.96)_0%,rgba(0,0,0,0.78)_18%,rgba(0,0,0,0.38)_38%,rgba(0,0,0,0.10)_56%,transparent_76%)]" />


      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(255,255,255,0.16),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_46%,rgba(0,0,0,0.22)_100%)]" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_38%,rgba(0,0,0,0.08)_56%,rgba(0,0,0,0.22)_76%,rgba(0,0,0,0.46)_100%)]" />

      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: [0, 0.15, 6.6], fov: 28 }}
        gl={{ antialias: false, alpha: true }}
        className="!absolute inset-0"
      >
        <color attach="background" args={["#000000"]} />
        <fog attach="fog" args={["#434343", 7.5, 13]} />

        <Suspense fallback={<AgentSceneFallback />}>
          <Environment preset="studio" />
          <Stage intensity={1} environment={null} shadows="contact" adjustCamera={false} preset="portrait">
            <WithMediaUrl media={props.placement.model?.file}>
              {(url) => (
                  <AgentModel url={url} />
              )}
            </WithMediaUrl>
          </Stage>
        </Suspense>

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          target={[0, 0.1, 0]}
        />

        <EffectComposer>
          <Bloom luminanceThreshold={0.18} luminanceSmoothing={0.8} intensity={0.4} />
          <ChromaticAberration
            offset={new Vector2(0.0014, 0.001)}
            radialModulation={false}
            modulationOffset={0}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

useGLTF.preload(AGENT_SCENE_URL);
