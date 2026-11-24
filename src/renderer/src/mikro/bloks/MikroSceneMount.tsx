import * as React from "react";
import { useThree } from "@react-three/fiber";

import { asStructure } from "@arkitektio/bsx/renderer/bloks/shared/index";
import { useSceneNotice } from "@arkitektio/bsx/renderer/bloks/scene/context";
import { useBlok, useValue, type BlokRenderArgs } from "@arkitektio/bsx/renderer/runtime/index";
import { MountGroup, useMountObject, useMountReady } from "@/core/blok/mount/MountGroup";
import type { MountFrame } from "@/core/blok/mount/frame";
import { useGetSceneQuery } from "@/mikro/api/graphql";
import { Scene } from "@/mikro/components/scene/Scene";
import { SceneHostGuard, useLiveScene } from "@/mikro/components/scene/sceneHost";

import { mikroSceneMountSchema } from "./index";

/** Per canvas, the mount that holds its volume compositor: it takes over the render loop. */
const compositorOwners = new WeakMap<object, string>();

const useCompositorClaim = (id: string): boolean => {
  const gl = useThree((state) => state.gl);
  const [owns, setOwns] = React.useState(false);
  React.useEffect(() => {
    const owner = compositorOwners.get(gl);
    if (owner && owner !== id) return;
    compositorOwners.set(gl, id);
    setOwns(true);
    return () => {
      if (compositorOwners.get(gl) === id) compositorOwners.delete(gl);
      setOwns(false);
    };
  }, [gl, id]);
  return owns;
};

/** The scene's layers, once its stores are built: in the mount's frame, framed by the stage. */
const ReadyScene = () => {
  const frame = useMountObject();
  useMountReady(true);
  return <Scene.Mount frame={frame} />;
};

/**
 * A mikro scene's 3D layers in a `Scene`: its world (axes, units, reference) placed by its
 * mikro-style `transform` onto the stage, viewed by the stage's camera. One per stage.
 */
export const MikroSceneMountRender = ({ component }: BlokRenderArgs) => {
  const blok = useBlok(component, mikroSceneMountSchema);
  const value = asStructure(useValue(blok.value));
  const transform = useValue(blok.transform);
  const output = useValue(blok.output);
  const live = useValue(blok.live) ?? true;
  const webgpu = useThree(
    (state) => (state.gl as unknown as { backend?: { isWebGPUBackend?: boolean } }).backend?.isWebGPUBackend === true,
  );
  const owns = useCompositorClaim(component.id);
  const { data, error } = useGetSceneQuery({
    variables: { id: String(value?.object ?? "") },
    skip: !value,
    // As ScenePage: a layer whose placement cannot condense nulls that field, not the scene.
    errorPolicy: "all",
  });
  const scene = data?.scene ?? null;
  useLiveScene(scene?.id ?? "", live && scene !== null);

  const world = scene?.worldCoordinateSystem ?? null;
  const frame = React.useMemo<MountFrame | null>(
    () =>
      world
        ? {
            reference: world.reference ?? null,
            axes: world.axes.map((axis) => ({ name: axis.name, type: String(axis.type), unit: axis.unit ?? null })),
          }
        : null,
    [world],
  );

  const problem = !value
    ? null
    : !webgpu
      ? "A mikro scene draws with WebGPU, which this browser does not offer."
      : !owns
        ? "A stage holds one mikro scene: this one is not drawn."
        : !data && error
          ? `The scene could not be loaded: ${error.message}`
          : null;
  useSceneNotice(problem ? "A mikro scene cannot be drawn" : null, problem ?? undefined);

  if (!scene || !frame || !webgpu || !owns) return null;
  return (
    <MountGroup id={component.id} frame={frame} transform={transform} output={output}>
      <Scene.Provider scene={scene} brandTheme={false}>
        <SceneHostGuard>
          <ReadyScene />
        </SceneHostGuard>
      </Scene.Provider>
    </MountGroup>
  );
};
