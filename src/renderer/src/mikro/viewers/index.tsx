import { preloadable } from "@/core/util/preloadable";

import type { ViewerWidgetProps } from "@/core/smart/display/registry";

// Own chunks, loaded before the window's first render (`preloadAll`), never
// by importing the module: the offline blok-catalog export reads mikro's
// module entry, and plain node cannot load the scene (three, WebGPU).
const LazyArrayDatasetViewer = preloadable(() => import("./ArrayDatasetViewer"));
const LazyArrayLensViewer = preloadable(() => import("./ArrayLensViewer"));
const LazySceneViewer = preloadable(() => import("./SceneViewer"));
const LazyMeshObjectViewer = preloadable(() => import("./MeshObjectViewer"));
const LazyTableDatasetViewer = preloadable(() => import("./TableDatasetViewer"));
const LazyTableLensViewer = preloadable(() => import("./TableLensViewer"));

export const ArrayDatasetViewer = (props: ViewerWidgetProps) => <LazyArrayDatasetViewer {...props} />;
export const ArrayLensViewer = (props: ViewerWidgetProps) => <LazyArrayLensViewer {...props} />;
export const SceneViewer = (props: ViewerWidgetProps) => <LazySceneViewer {...props} />;
export const MeshObjectViewer = (props: ViewerWidgetProps) => <LazyMeshObjectViewer {...props} />;
export const TableDatasetViewer = (props: ViewerWidgetProps) => <LazyTableDatasetViewer {...props} />;
export const TableLensViewer = (props: ViewerWidgetProps) => <LazyTableLensViewer {...props} />;
