/**
 * What a scene event hands a host, as plain data: structure references
 * (`{__identifier, object}`, the rekuest wire shape) that slot straight into an
 * action's ports, ids, and coordinates. Never a store, a fragment or a three.js
 * object (the `sceneHost.ts` rule).
 *
 * Pure, so the mapping is tested without a scene.
 */
import type { JSONObject } from "@/core/types";
import type { SceneDrawnEvent } from "./sceneEvents";

export type StructureRef = { __identifier: string; object: string };

const ANNOTATION = "@mikro/annotation";
const ARRAY_LENS = "@mikro/arraylens";

const ref = (identifier: string, id: string): StructureRef => ({ __identifier: identifier, object: id });

/** The parts of a scene layer the payloads read. */
export type PayloadLayer = {
  id: string;
  __typename?: string;
  visible?: boolean | null;
  lens?: { id?: string | null; dataset?: { id?: string | null } | null } | null;
};

/** The array lens a layer draws, as a reference; null for any other kind. */
export const lensOfLayer = (layers: readonly PayloadLayer[], layerId: string | null | undefined): StructureRef | null => {
  const layer = layerId ? layers.find((entry) => entry.id === layerId) : undefined;
  return layer?.lens?.id && layer.lens.dataset ? ref(ARRAY_LENS, layer.lens.id) : null;
};

/** The lens a host should read "under the probe": the pinned layer's, else the first visible array layer's. */
export const probeLens = (layers: readonly PayloadLayer[], pinnedLayerId: string | null | undefined): StructureRef | null =>
  lensOfLayer(layers, pinnedLayerId) ??
  lensOfLayer(layers, layers.find((layer) => layer.visible !== false && layer.lens?.dataset)?.id);

export type SceneAnnotationPayload = {
  annotation: StructureRef;
  kind: string;
  lens: StructureRef | null;
  descriptors: JSONObject | null;
};

export const drawnPayload = (event: SceneDrawnEvent): SceneAnnotationPayload => ({
  annotation: ref(ANNOTATION, event.annotation),
  kind: event.kind,
  lens: event.lens ? ref(ARRAY_LENS, event.lens) : null,
  descriptors: event.descriptors ?? null,
});

export type SceneSelectPayload = {
  /** The first selected shape, or null when nothing is selected. */
  annotation: StructureRef | null;
  annotations: StructureRef[];
  lens: StructureRef | null;
};

export const selectionPayload = (annotationIds: readonly string[], lens: StructureRef | null): SceneSelectPayload => ({
  annotation: annotationIds[0] ? ref(ANNOTATION, annotationIds[0]) : null,
  annotations: annotationIds.map((id) => ref(ANNOTATION, id)),
  lens,
});

export type ScenePickPayload = {
  layer: string;
  world: [number, number, number] | null;
  /** Base-level voxel index, in the layer's own axis order as the probe states it. */
  voxel: [number, number, number];
  lens: StructureRef | null;
};

/** A probe result that is a deliberate pick: a click, for reading, not one placing a vertex. */
export type PickLike = {
  layerId: string;
  origin: string;
  purpose: string;
  worldPos: [number, number, number] | null;
  voxelIndex: [number, number, number];
};

export const isPick = (probe: PickLike | null | undefined): probe is PickLike =>
  !!probe && probe.origin === "click" && probe.purpose === "readout";

export const pickPayload = (probe: PickLike, layers: readonly PayloadLayer[]): ScenePickPayload => ({
  layer: probe.layerId,
  world: probe.worldPos ? [...probe.worldPos] : null,
  voxel: [...probe.voxelIndex],
  lens: lensOfLayer(layers, probe.layerId),
});

export type SceneLayersPayload = {
  layers: { layer: string; kind: string; lens: StructureRef | null }[];
  /** Layers that were not there at the previous event: tells a host its own run's layers from the rest. */
  added: string[];
};

/** Moves only when a layer comes, goes or draws another lens: not on contrast or visibility ticks. */
export const layersKey = (layers: readonly PayloadLayer[]): string =>
  layers.map((layer) => `${layer.id}:${layer.lens?.id ?? ""}`).join(",");

export const layersPayload = (layers: readonly PayloadLayer[], previousIds: ReadonlySet<string>): SceneLayersPayload => ({
  layers: layers.map((layer) => ({
    layer: layer.id,
    kind: layer.__typename ?? "Layer",
    lens: lensOfLayer(layers, layer.id),
  })),
  added: layers.filter((layer) => !previousIds.has(layer.id)).map((layer) => layer.id),
});
