import type { FC } from "react";
import type { DisplayMode } from "../../../platform/stores/modeStore";
import {
  isEnhanceableTool,
  type AnnotateTool,
  type AnnotationEnhancerId,
} from "../roiDrawingStore";
import { VectorEnhancerPanel } from "./paths/vectorTrace/VectorEnhancerPanel";
import { BrushSkeletonPanel } from "./paths/brushSkeleton/BrushSkeletonPanel";
import { SmoothBlobPanel } from "./meshes/smoothBlob/SmoothBlobPanel";

/**
 * The annotation enhancers: tools-adjacent features that turn a gesture into
 * something richer than its raw geometry. One registry so the toolbar never
 * hard-codes a panel again — adding an enhancer = one entry here + its panel
 * component (the `shell/layerRegistry.ts` idiom).
 *
 * `appliesTo` decides when the enhancer's panel is offered, from the same
 * (tool, displayMode) pair `modeCompat` gates tools with. The enhancer's own
 * on/off and parameters live in stores (`roiDrawingStore.enhancersOn`, plus
 * whatever state the enhancer owns) — the registry is deliberately stateless.
 */
export type EnhancerContext = {
  tool: AnnotateTool | null;
  displayMode: DisplayMode;
};

export type AnnotationEnhancer = {
  id: AnnotationEnhancerId;
  title: string;
  appliesTo: (ctx: EnhancerContext) => boolean;
  ParamsPanel: FC;
};

export const ANNOTATION_ENHANCERS: readonly AnnotationEnhancer[] = [
  {
    id: "vector-trace",
    title: "Vector enhancer",
    // Click-per-vertex tools: each edge is a candidate for tracing through
    // the data (`features/annotations/enhancers/paths/vectorTrace/`). Works in 2D and 3D alike.
    appliesTo: ({ tool }) => isEnhanceableTool(tool),
    ParamsPanel: VectorEnhancerPanel,
  },
  {
    id: "intensity-skeleton",
    title: "Skeleton brush",
    // The brush gesture is probe-driven, so 3D only (`modeCompat` already
    // hides the BRUSH tool in 2D; the display-mode check keeps the registry
    // honest on its own).
    appliesTo: ({ tool, displayMode }) =>
      tool === "BRUSH" && displayMode === "3D",
    ParamsPanel: BrushSkeletonPanel,
  },
  {
    id: "smooth-blob",
    title: "Smooth blob",
    // Click a probed point, grow a smoothed surface around it — 3D only,
    // same reasoning as the brush.
    appliesTo: ({ tool, displayMode }) =>
      tool === "BLOB" && displayMode === "3D",
    ParamsPanel: SmoothBlobPanel,
  },
];

export const applicableEnhancers = (
  ctx: EnhancerContext,
): AnnotationEnhancer[] =>
  ANNOTATION_ENHANCERS.filter((enhancer) => enhancer.appliesTo(ctx));
