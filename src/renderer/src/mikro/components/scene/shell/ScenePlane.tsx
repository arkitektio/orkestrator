import { LayerRenderer } from "./LayerRenderer";

// 2D layer content is dispatched per layer __typename by the render registry.
export const ScenePlane = () => <LayerRenderer mode="2D" />;
