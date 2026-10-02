import { lazy } from "react";

import type { ViewerWidgetProps } from "@/core/smart/display/registry";

// Lazy: the scene renderer (three, WebGPU) is only fetched once a viewer is
// actually mounted, never by registering the module.
const LazyArrayDatasetViewer = lazy(() => import("./ArrayDatasetViewer"));
const LazySceneViewer = lazy(() => import("./SceneViewer"));

export const ArrayDatasetViewer = (props: ViewerWidgetProps) => <LazyArrayDatasetViewer {...props} />;
export const SceneViewer = (props: ViewerWidgetProps) => <LazySceneViewer {...props} />;
