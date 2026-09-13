import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { RekuestAgent } from "@/linkers";
import { useAgentQuery, useDetailTaskQuery } from "@/rekuest/api/graphql";
import { ChildTaskUpdater } from "@/rekuest/components/updaters/ChildTaskUpdater";
import { GanttTimeline } from "@/rekuest/components/timeline/GanttTimeline";
import { Environment, Float, OrbitControls, useGLTF } from "@react-three/drei";
import type { } from "@react-three/fiber";
import { Canvas } from "@react-three/fiber";
import { createElement, Suspense } from "react";
import Timestamp from "@/components/ui/timestamp";

const toyCarUrl = new URL(
  "../../../../../../resources/Box.glb",
  import.meta.url,
).href;

const ToyCarModel = () => {
  const { scene } = useGLTF(toyCarUrl);

  return createElement(
    Float,
    { speed: 2, rotationIntensity: 0.2, floatIntensity: 0.6 },
    createElement(
      "group",
      { rotation: [0.15, -0.8, 0], position: [0, -0.9, 0] },
      createElement("primitive", { object: scene.clone(), scale: 1.4 }),
    ),
  );
};

const SpaceScene = () => {
  return (
    <div className="relative flex-1 min-h-[340px] overflow-hidden rounded-2xl border border-amber-300/40 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.14),_transparent_35%),linear-gradient(180deg,_rgba(24,24,27,0.2),_rgba(9,9,11,0.92))] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-amber-300/80">
            Task Space
          </div>
          <div className="text-sm text-white/80">
            Delegations are rendered below the active scene.
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background via-background/40 to-transparent" />
      <Canvas camera={{ position: [0, 1.8, 5.8], fov: 36 }}>
        {createElement("color", { attach: "background", args: ["#120f0d"] })}
        {createElement("fog", { attach: "fog", args: ["#120f0d", 6, 16] })}
        {createElement("ambientLight", { intensity: 1.3 })}
        {createElement("directionalLight", {
          position: [6, 8, 4],
          intensity: 2.6,
          color: "#fff7d6",
        })}
        {createElement("directionalLight", {
          position: [-4, 2, -4],
          intensity: 0.8,
          color: "#7dd3fc",
        })}
        {createElement("spotLight", {
          position: [0, 8, 2],
          intensity: 18,
          angle: 0.35,
          penumbra: 0.8,
          color: "#f59e0b",
        })}
        <Suspense fallback={null}>
          <ToyCarModel />
          <Environment preset="sunset" />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={3.5} maxDistance={8} maxPolarAngle={Math.PI / 2.1} minPolarAngle={Math.PI / 3.6} autoRotate autoRotateSpeed={1.4} />
      </Canvas>
    </div>
  );
};

const AgentTaskTimeline = ({ id }: { id: string }) => {
  const { data } = useDetailTaskQuery({
    variables: { id },
  });

  return (
    <GanttTimeline
      task={data?.task}
      className="flex w-full flex-col justify-end text-white @container"
      panelClassName="relative mt-auto flex flex-col gap-2 rounded-2xl border border-white/8 bg-background/75 p-4 shadow-[0_-12px_40px_rgba(0,0,0,0.22)] backdrop-blur-md"
    />
  );
};

export const AgentSpacePage = asDetailQueryRoute(
  useAgentQuery ,
  ({ data, id }) => {

    return (
      <RekuestAgent.ModelPage
        title={
          <div className="flex flex-row gap-2">
            {data?.agent?.name}
            <p className="text-md font-light text-muted-foreground">
              <Timestamp date={data.agent.lastSeen} relative />
            </p>
          </div>
        }
        object={data.agent}
        pageActions={<> </>
        }
      >
        <ChildTaskUpdater taskId={id} />
        <div className="flex h-full min-h-[calc(100vh-12rem)] flex-col gap-4 px-3 pb-3">
          <SpaceScene />
          <AgentTaskTimeline id={id} />
        </div>
      </RekuestAgent.ModelPage>
    );
  }
);


export default AgentSpacePage;
