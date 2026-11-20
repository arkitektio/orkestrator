import { lazy } from "react";

import type { ViewerWidgetProps } from "@/core/smart/display/registry";

// Lazy: the scene renderer (three, WebGPU) is only fetched once a viewer is
// actually mounted, never by registering the module.
const LazyArrayDatasetViewer = lazy(() => import("./ArrayDatasetViewer"));
const LazyArrayLensViewer = lazy(() => import("./ArrayLensViewer"));
const LazySceneViewer = lazy(() => import("./SceneViewer"));
const LazyMeshObjectViewer = lazy(() => import("./MeshObjectViewer"));
const LazyTableDatasetViewer = lazy(() => import("./TableDatasetViewer"));
const LazyTableLensViewer = lazy(() => import("./TableLensViewer"));

export const ArrayDatasetViewer = (props: ViewerWidgetProps) => <LazyArrayDatasetViewer {...props} />;
export const ArrayLensViewer = (props: ViewerWidgetProps) => <LazyArrayLensViewer {...props} />;
export const SceneViewer = (props: ViewerWidgetProps) => <LazySceneViewer {...props} />;
export const MeshObjectViewer = (props: ViewerWidgetProps) => <LazyMeshObjectViewer {...props} />;
export const TableDatasetViewer = (props: ViewerWidgetProps) => <LazyTableDatasetViewer {...props} />;
export const TableLensViewer = (props: ViewerWidgetProps) => <LazyTableLensViewer {...props} />;
