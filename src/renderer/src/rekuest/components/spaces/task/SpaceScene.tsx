import { useSettings } from "@/core/settings/store/SettingsContext";
import { useSpaceViewStore } from "./store";
import { Suspense, useMemo } from "react";
import { CameraMatrixSync } from "./syncs/CameraMatrixSync";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { AgentPanel } from "./panels/AgentPanel";
import { SpaceGroupObject } from "./elements/SpaceGroupObject";
import { CallingPathTubes } from "./elements/CallingPathTubes";
import { Bug, Orbit } from "lucide-react";
import { Button } from "@/core/ui/button";
import { TimeSlider } from "./panels/TimeSlider";
import { SpaceGroup } from "./types";
import { computeBrandColors } from "./elements/brandColors";


/** A single space rendered in its own Canvas. */
const SpaceCanvas = ({ group }: { group: SpaceGroup }) => {
  const { settings } = useSettings();
  const brandHue = settings.brandHue ?? 267.256;
  const brandColors = useMemo(() => computeBrandColors(brandHue), [brandHue]);

  return (
    <div className="h-full w-full flex-grow relative min-w-0 rounded-t-2xl overflow-hidden">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [2, 2.8, 5], fov: 38 }}
        shadows
        className="!absolute inset-0"
      >
        <CameraMatrixSync />
        <color attach="background" args={["#08080c"]} />
        <fog attach="fog" args={["#08080c", 8, 20]} />
        <ambientLight intensity={0.3} />
        <spotLight
          position={[0, 8, 0]}
          intensity={40}
          angle={0.5}
          penumbra={1}
          color="#c4b5fd"
          castShadow
        />
        <spotLight
          position={[-4, 5, 3]}
          intensity={15}
          angle={0.4}
          penumbra={0.8}
          color="#818cf8"
        />
        <spotLight
          position={[4, 5, -2]}
          intensity={10}
          angle={0.4}
          penumbra={0.8}
          color="#38bdf8"
        />
        <spotLight
          position={[0, 6, 4]}
          intensity={25}
          angle={0.6}
          penumbra={0.9}
          color="#e0e0e0"
          castShadow
        />
        <directionalLight
          position={[5, 3, 5]}
          intensity={0.4}
          color="#fde68a"
        />
        <Suspense fallback={null}>
          <SpaceGroupObject
            group={group}
            offset={[0, 0, 0]}
            brandColors={brandColors}
          />
          <CallingPathTubes group={group} brandColors={brandColors} />
          <Environment preset="night" />
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={2}
          maxDistance={14}
          maxPolarAngle={Math.PI / 2.05}
          minPolarAngle={Math.PI / 6}
        />
      </Canvas>
      <AgentPanel placements={group.placements} />
    </div>
  );
};

export const TaskSpaceScene = () => {
  const spaceGroups = useSpaceViewStore((s) => s.spaceGroups);
  const debugWireframe = useSpaceViewStore((s) => s.debugWireframe);
  const toggleDebugWireframe = useSpaceViewStore((s) => s.toggleDebugWireframe);
  const layoutMode = useSpaceViewStore((s) => s.layoutMode);
  const toggleLayoutMode = useSpaceViewStore((s) => s.toggleLayoutMode);

  if (spaceGroups.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center rounded-2xl border border-dashed border-border/60 text-sm text-muted-foreground">
        No spaces found for resolved agents
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-w-0 overflow-hidden gap-2 relative">
      <div className="flex-grow flex flex-row gap-2 min-h-0">
        {spaceGroups.map((group) => (
          <SpaceCanvas key={group.spaceId} group={group} />
        ))}
      </div>

      <div className="absolute w-full transform top-2 z-20">
        <Button
          variant={layoutMode === "radial" ? "default" : "ghost"}
          size="icon"
          className="absolute top-1 right-12 z-30 h-7 w-7"
          onClick={toggleLayoutMode}
          title={layoutMode === "space" ? "Switch to radial layout" : "Switch to space layout"}
        >
          <Orbit className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={debugWireframe ? "default" : "ghost"}
          size="icon"
          className="absolute top-1 right-2 z-30 h-7 w-7"
          onClick={toggleDebugWireframe}
          title="Toggle debug wireframe"
        >
          <Bug className="h-3.5 w-3.5" />
        </Button>
        </div>
      <div className="absolute w-full transform bottom-2 z-20">
        <TimeSlider />

      </div>
    </div>
  );
};
