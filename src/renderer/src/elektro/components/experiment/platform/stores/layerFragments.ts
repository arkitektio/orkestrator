import type {
  ExpAnnotationLayerFragment,
  ExpEventsLayerFragment,
  ExpSpikesLayerFragment,
  ExpTraceLayerFragment,
} from "@/elektro/api/graphql";

/**
 * The raw layer fragments, typed by kind.
 *
 * `platform/model` folds the scene fragment structurally (it runs in node, with
 * no generated types), so what it hands the store is untyped. The STORE is where
 * the type comes back: one map from typename to fragment, and one accessor that
 * narrows by `__typename` — instead of a cast at every reading site.
 */
export type LayerFragments = {
  TraceLayer: ExpTraceLayerFragment;
  SpikesLayer: ExpSpikesLayerFragment;
  EventsLayer: ExpEventsLayerFragment;
  AnnotationLayer: ExpAnnotationLayerFragment;
};

export type LayerTypenameOf = keyof LayerFragments;

export type ExperimentLayerFragment = LayerFragments[LayerTypenameOf];

/** The fragment of one kind, or undefined when the id holds another kind. */
export const rawLayerOf = <K extends LayerTypenameOf>(
  rawLayers: Record<string, ExperimentLayerFragment>,
  id: string,
  typename: K,
): LayerFragments[K] | undefined => {
  const raw = rawLayers[id];
  return raw && raw.__typename === typename ? (raw as LayerFragments[K]) : undefined;
};
