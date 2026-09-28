import { type ReactNode } from "react";
import { SceneFragment } from "@/mikro/api/graphql";
import {
  SceneColumn,
  SceneColumnPanels,
  SceneColumnTrigger,
} from "./shell/SceneColumn";
import { SceneDock } from "./shell/SceneDock";
import { SceneProvider } from "./shell/SceneProvider";
import { DefaultScenePanels, SceneViewport } from "./shell/SceneViewport";
import { sceneHasMeshLayer } from "./platform/model/collectionPlacement";
import { AnimationPanel } from "./features/animation/AnimationPanel";
import { DimSliderPanel } from "./shell/chrome/DimSliderPanel";
import {
  SceneAnimationsSidebar,
  SceneAnnotationsSidebar,
  SceneLayersSidebar,
  SceneMeshesSidebar,
} from "./shell/chrome/sceneSidebarTabs";
import { ZSliderPanel } from "./shell/chrome/ZSliderPanel";

/**
 * All-in-one scene renderer: provider + viewport in one element, for hosts
 * that render the scene inside their content area and nowhere else. A page
 * that also composes scene panels OUTSIDE the viewport (the ModelPage
 * right-rail Layers tab) uses the pieces directly instead:
 *
 *   <Scene.Provider scene={scene}>          // wraps the whole ModelPage
 *     <ModelPage additionalSidebars={<Sidebars.Tab label="Layers"><Scene.LayersSidebar /></Sidebars.Tab>}>
 *       <Scene.Viewport />                  // in the content area
 *     </ModelPage>
 *   </Scene.Provider>
 */
const SceneRoot = (props: {
  scene: SceneFragment;
  children?: ReactNode;
  /** Host R3F content mounted inside the canvas — see `SceneViewport`. */
  inCanvas?: ReactNode;
}) => (
  <SceneProvider scene={props.scene}>
    <SceneViewport inCanvas={props.inCanvas}>{props.children}</SceneViewport>
  </SceneProvider>
);

/**
 * Composable scene renderer.
 *
 * `<Scene scene={scene} />` gives the default panel stack. To compose, pass
 * children — they render inside the scene's stores, so every panel below works
 * with no props:
 *
 *   <Scene scene={scene}>
 *     <Scene.Column side="left">
 *       <Scene.Trigger />
 *       <Scene.Panels>
 *         <MyOwnCard />
 *       </Scene.Panels>
 *     </Scene.Column>
 *     <Scene.Dock side="bottom">
 *       <Scene.ZSlider />
 *       <Scene.DimSliders />
 *     </Scene.Dock>
 *   </Scene>
 *
 * A dock's side decides its sliders' orientation, so moving a scrubber to
 * another edge is a one-word change. The layer list is not a floating panel
 * any more — it is `Scene.LayersSidebar`, a ModelPage sidebar tab — and neither
 * are the view settings, which are a gear in the viewport's own bottom-right
 * HUD. `Scene.Column` is therefore empty scaffolding until a host puts a panel
 * of its own in it.
 */
export const Scene = Object.assign(SceneRoot, {
  Provider: SceneProvider,
  Viewport: SceneViewport,
  Column: SceneColumn,
  Trigger: SceneColumnTrigger,
  Panels: SceneColumnPanels,
  DefaultPanels: DefaultScenePanels,
  // No `Controls` and no `Probe`: the view settings and the probe readout both
  // dock bottom-right with the mode controls, rendered by the viewport itself
  // rather than composed into a column.
  Animations: AnimationPanel,
  Dock: SceneDock,
  ZSlider: ZSliderPanel,
  DimSliders: DimSliderPanel,
  LayersSidebar: SceneLayersSidebar,
  AnimationsSidebar: SceneAnimationsSidebar,
  AnnotationsSidebar: SceneAnnotationsSidebar,
  // Conditional by design: hosts pair it with `Scene.hasMeshLayer(scene)`, so
  // a scene without meshes carries no dead tab.
  MeshesSidebar: SceneMeshesSidebar,
  hasMeshLayer: sceneHasMeshLayer,
});
