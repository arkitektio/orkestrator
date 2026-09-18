import { memo, type FC } from "react";
import { AnnotationMarksLayer } from "../features/annotations/AnnotationMarksLayer";
import { EventsLayer } from "../features/events/EventsLayer";
import { SpikesLayer } from "../features/spikes/SpikesLayer";
import { TraceLayer } from "../features/traces/TraceLayer";

/**
 * Which component draws which layer kind. REGISTRY 1 of 2.
 *
 * An exhaustive `Record` over the layer typenames, so a fifth kind is a compile
 * error until it is registered here — the same guarantee mikro's
 * `layerRegistry.ts` gives.
 *
 * ONE `Layer`, not `{Layer2D, Layer3D}`: a timeline has one display mode. The axis
 * of variation mikro spends on 2D/3D, elektro spends on the layout mode, which is
 * a matrix on each line — not a component swap. Do not add a dead `Layer3D` slot.
 *
 * `memo()` is applied HERE, once. Props are exactly `{ layerId }`, stable for a
 * layer's lifetime, so the shallow compare blocks every parent-driven re-render
 * and each layer re-renders only from its own subscriptions (the two-plane
 * contract).
 */

export type LayerTypename = "TraceLayer" | "SpikesLayer" | "EventsLayer" | "AnnotationLayer";

export type LayerRendererProps = { layerId: string };
export type LayerRenderers = { Layer: FC<LayerRendererProps> | null };

const memoized = (component: FC<LayerRendererProps>) =>
  memo(component) as FC<LayerRendererProps>;

export const LAYER_RENDERERS: Record<LayerTypename, LayerRenderers> = {
  TraceLayer: { Layer: memoized(TraceLayer) },
  SpikesLayer: { Layer: memoized(SpikesLayer) },
  EventsLayer: { Layer: memoized(EventsLayer) },
  AnnotationLayer: { Layer: memoized(AnnotationMarksLayer) },
};

export const isLayerTypename = (typename: string): typename is LayerTypename =>
  typename in LAYER_RENDERERS;
