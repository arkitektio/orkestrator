import type { FC } from "react";
import type { DisplayMode } from "../../../platform/stores/modeStore";
import {
  traceEnhancerFor,
  useRoiDrawingStore,
  type AnnotateTool,
  type AnnotationEnhancerId,
} from "../roiDrawingStore";
import {
  OutlineEnhancerPanel,
  VectorEnhancerPanel,
} from "./paths/vectorTrace/VectorEnhancerPanel";
import { BrushSkeletonPanel } from "./paths/brushSkeleton/BrushSkeletonPanel";
import { useBrushSkeletonStore } from "./brushSkeletonStore";

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
 *
 * The toolbar has one Enhancers button; it opens the applicable enhancers'
 * `ParamsPanel`s in a popover, each a flat list of illustrated choices.
 * `useIndicator` is read by that button: `on` lights it, `attention` holds the
 * popover open while the enhancer waits on a verdict only its panel can give.
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
  useIndicator: () => { on: boolean; attention: boolean };
};

export const ANNOTATION_ENHANCERS: readonly AnnotationEnhancer[] = [
  {
    id: "vector-trace",
    title: "Line & path tracing",
    // The open click-per-vertex tools: each edge is a candidate for tracing
    // through the data (`features/annotations/enhancers/paths/vectorTrace/`).
    // Works in 2D and 3D alike.
    appliesTo: ({ tool }) => traceEnhancerFor(tool) === "vector-trace",
    ParamsPanel: VectorEnhancerPanel,
    useIndicator: () => ({
      on: useRoiDrawingStore((s) => s.enhancersOn["vector-trace"] ?? false),
      attention: false,
    }),
  },
  {
    id: "outline-trace",
    title: "Polygon outline",
    // The same tracer, for the closed POLYGON: its own switch, weights
    // (boundary-first) and choices — see `traceEnhancerFor`.
    appliesTo: ({ tool }) => traceEnhancerFor(tool) === "outline-trace",
    ParamsPanel: OutlineEnhancerPanel,
    useIndicator: () => ({
      on: useRoiDrawingStore((s) => s.enhancersOn["outline-trace"] ?? false),
      attention: false,
    }),
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
    // The brush is always on while armed; an extracted centerline waits for
    // Save / Discard, which live in the panel.
    useIndicator: () => ({
      on: true,
      attention: useBrushSkeletonStore(
        (s) => s.status === "preview" || s.status === "saving" || s.status === "error",
      ),
    }),
  },
];

export const applicableEnhancers = (
  ctx: EnhancerContext,
): AnnotationEnhancer[] =>
  ANNOTATION_ENHANCERS.filter((enhancer) => enhancer.appliesTo(ctx));
