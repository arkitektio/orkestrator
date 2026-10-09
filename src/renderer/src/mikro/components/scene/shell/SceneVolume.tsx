import { SceneProbedPoint } from "./SceneProbedPoint";
import { SceneProbePoints } from "../features/probe/SceneProbePoints";
import { LayerRenderer } from "./LayerRenderer";

// 3D layer content is dispatched per layer __typename by the render registry;
// the image entry (ImageVolumeLayer) applies the visibility + LOD-key logic.
export const SceneVolume = () => (
  <group>
    <LayerRenderer mode="3D" />
    <SceneProbedPoint />
    <SceneProbePoints />
  </group>
);
