import type { ReactNode } from "react";
import { ExperimentSceneProvider } from "./shell/ExperimentSceneProvider";
import { ExperimentViewport } from "./shell/ExperimentViewport";
import {
  ExperimentAnnotationsSidebar,
  ExperimentLayersSidebar,
} from "./shell/chrome/experimentSidebarTabs";
import type { ExperimentSceneFragment } from "@/elektro/api/graphql";

/**
 * The experiment renderer's PUBLIC API — what a host renders.
 *
 * The ONLY module allowed to import `shell/` (enforced by `architecture.test.ts`),
 * exactly as mikro's `Scene.tsx` is. Everything a page composes comes through this
 * namespace object:
 *
 *     <ExperimentScene.Provider experiment={…} placementErrors={…}>
 *       <Model.ModelPage additionalSidebars={<Tab><ExperimentScene.LayersSidebar/></Tab>}>
 *         <ExperimentScene.Viewport />
 *       </Model.ModelPage>
 *     </ExperimentScene.Provider>
 *
 * The Provider wraps the WHOLE page, because the right rail is a sibling of the
 * content area and must reach the same stores.
 *
 * What a workflow built OVER the experiment may do and know is `experimentHost.ts`,
 * not this file.
 */

const ExperimentSceneRoot = ({
  experiment,
  children,
}: {
  experiment: ExperimentSceneFragment | null | undefined;
  children?: ReactNode;
}) => (
  <ExperimentSceneProvider experiment={experiment}>
    <ExperimentViewport />
    {children}
  </ExperimentSceneProvider>
);

/** True when the experiment has an annotation layer — so an Annotations tab is not dead. */
export const experimentHasAnnotationLayer = (
  experiment: Pick<ExperimentSceneFragment, "layers"> | null | undefined,
): boolean => (experiment?.layers ?? []).some((layer) => layer.__typename === "AnnotationLayer");

export const ExperimentScene = Object.assign(ExperimentSceneRoot, {
  Provider: ExperimentSceneProvider,
  Viewport: ExperimentViewport,
  LayersSidebar: ExperimentLayersSidebar,
  AnnotationsSidebar: ExperimentAnnotationsSidebar,
  hasAnnotationLayer: experimentHasAnnotationLayer,
});
