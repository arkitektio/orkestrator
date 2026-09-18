import type { ComponentType } from "react";
import { AnnotationLayerCard } from "../../features/annotations/AnnotationLayerCard";
import { EventsLayerCard } from "../../features/events/EventsLayerCard";
import { SpikesLayerCard } from "../../features/spikes/SpikesLayerCard";
import { TraceLayerCard } from "../../features/traces/TraceLayerCard";
import type { LayerState } from "../../platform/model/layerModel";
import type { LayerCardProps } from "../../platform/layerui/cardShell";
import type { LayerTypename } from "../layerRegistry";

/**
 * Which card shows which layer kind. REGISTRY 2 of 2.
 *
 * `source` is load-bearing, not bookkeeping — the same field mikro's card registry
 * carries, for the same reason:
 *  - `"layerState"` cards read the NORMALIZED layer: clim, pyramid readout,
 *    placement verdict. That is what the renderer draws from, and a card reading
 *    anything else would disagree with the line on screen.
 *  - `"fragment"` cards (also) read the RAW fragment: an annotation layer is drawn
 *    straight from its collection, and a picker editor edits the picker list as
 *    the server holds it.
 *
 * Exhaustive over the typenames, so a new kind is a compile error here as well as
 * in `layerRegistry.ts`. Cards appear in the layers' own `order` — the draw order,
 * which the panel edits.
 */
export type LayerCardEntry = {
  source: "layerState" | "fragment";
  Card: ComponentType<LayerCardProps<LayerState>>;
};

export const LAYER_CARDS: Record<LayerTypename, LayerCardEntry> = {
  TraceLayer: { source: "layerState", Card: TraceLayerCard },
  SpikesLayer: { source: "fragment", Card: SpikesLayerCard },
  EventsLayer: { source: "fragment", Card: EventsLayerCard },
  AnnotationLayer: { source: "fragment", Card: AnnotationLayerCard },
};
