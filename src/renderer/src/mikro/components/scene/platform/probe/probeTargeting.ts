/**
 * Which layers a probe involves. Two roles, deliberately apart:
 *
 *  - The DATA layer (`viewerStore.dataLayerId`): the one a scene is ABOUT —
 *    the lens a new annotation is cut with, an annotation card's "Run with"
 *    default, the host's select payload, the metadata fallback. One layer,
 *    because a task takes one lens.
 *  - The PROBE layer: whose mesh answers the pointer — where a 3D ray stops,
 *    where design gestures land. Exactly ONE layer reads the pointer at any
 *    time, never "whatever mesh the ray hits first", which made the reading
 *    camera-dependent with stacked layers. The user's probe pin
 *    (`probeLayerId`) chooses it, by default the data layer; a transient pick
 *    (`pickLayerId`) overrides both while it runs.
 *
 * What a probe READS is not a choice: every visible layer is read at the hit
 * point, values and attribute plans alike (`readableLayerIds`, `infoReadings.ts`).
 *
 * The hit mechanism is a decline, not a filter: a layer that is not the hit
 * target must return from its handler WITHOUT calling `event.stopPropagation()`,
 * so R3F carries the same event on to the next intersected object — the
 * target layer — which handles it normally. Stopping propagation first would
 * swallow the event and probe nothing. This covers EVERY probe-shaped gesture,
 * not just PROBE-mode readouts: the DESIGN tools' volume clicks and strokes
 * (trace, seed, carve, lift, bridge) go through the same `layerAnswersProbe`
 * guard, so lifting from a mask means making it the probe layer in the
 * control bar's `LayerTargetPicker`.
 */

type TargetLayerLike = { id: string; visible?: boolean };

/** The pins a resolution reads, as they sit on the viewer store. */
export type ProbeTargetPins = {
  dataLayerId: string | null;
  probeLayerId: string | null;
  pickLayerId: string | null;
};

const firstVisible = (layers: readonly TargetLayerLike[]): string | null =>
  layers.find((layer) => layer.visible !== false)?.id ?? null;

const isVisible = (layers: readonly TargetLayerLike[], id: string | null): id is string =>
  id !== null && layers.some((layer) => layer.id === id && layer.visible !== false);

/**
 * The layer tasks and annotations use. A pin wins while its layer is in the
 * scene, HIDDEN OR NOT — a task reads the lens, not the pixels on screen;
 * otherwise the first visible layer. Null only with no layer to name.
 *
 * A dead pin is deliberately NOT erased here: it heals by derivation (the
 * scene provider drops it when its layer is removed).
 */
export const effectiveDataLayerId = (
  dataLayerId: string | null,
  layers: readonly TargetLayerLike[],
): string | null =>
  dataLayerId !== null && layers.some((layer) => layer.id === dataLayerId)
    ? dataLayerId
    : firstVisible(layers);

/**
 * The layers a probe reads, in store order: every visible one. Only visible
 * layers get node plans, so a hidden one has nothing resident to read.
 */
export const readableLayerIds = (layers: readonly TargetLayerLike[]): string[] =>
  layers.filter((layer) => layer.visible !== false).map((layer) => layer.id);

/**
 * The layer whose handler answers the pointer: a live transient pick, else
 * the visible probe pin, else the data layer while it is visible, else the
 * first visible layer. Null only when no layer can answer at all — a hidden
 * layer draws no mesh.
 *
 * A dead pin is not erased: it resurrects when its layer is shown again.
 */
export const effectiveHitLayerId = (
  pins: ProbeTargetPins,
  layers: readonly TargetLayerLike[],
): string | null => {
  if (isVisible(layers, pins.pickLayerId)) return pins.pickLayerId;
  if (isVisible(layers, pins.probeLayerId)) return pins.probeLayerId;
  const data = effectiveDataLayerId(pins.dataLayerId, layers);
  if (isVisible(layers, data)) return data;
  return firstVisible(layers);
};

export const layerAnswersProbe = (
  /** The resolved target (`effectiveHitLayerId`), or null for "no layer". */
  effectiveLayerId: string | null,
  /** The layer whose handler is deciding whether to act. */
  layerId: string,
): boolean => effectiveLayerId === layerId;

/**
 * The probe to keep after the pin changes. A reading taken from a layer the
 * probe no longer reads is stale the moment the pin moves — leaving it up would
 * show one layer's values under another layer's name until the next click.
 * Resetting to the default (null) keeps whatever is up: this helper cannot see
 * the layer list, so the default target is unknown here — the probe panel's
 * reconciliation drops a reading that mismatches the derived target.
 */
export const probeAfterPinChange = <T extends { layerId: string }>(
  probe: T | null,
  nextProbeLayerId: string | null,
): T | null =>
  nextProbeLayerId !== null && probe?.layerId !== nextProbeLayerId ? null : probe;

/** The shape of a layer this module reads a probe system off (structural). */
export type ProbeSystemLayerLike = {
  lens: {
    dataset: {
      dataArrays: readonly { level: number; coordinateSystem?: { id: string } | null }[];
      intrinsicSystem?: { id: string } | null;
    };
  };
};

/**
 * The system a probe on this layer asks its attribute plans of: the layer's
 * level-0 system — the frame a `voxelIndex` is expressed in (the
 * composeLayerAffine reduction), so a server-resolved plan path starts
 * exactly where the coordinates live — falling back to the dataset's
 * intrinsic system. Null when the layer has neither. Shared by the hover
 * tracker (which executes plans) and the settings picker (which lists them),
 * so both name the same system.
 */
export const probeSystemIdFor = (layer: ProbeSystemLayerLike): string | null => {
  const level0 = layer.lens.dataset.dataArrays.reduce<
    ProbeSystemLayerLike["lens"]["dataset"]["dataArrays"][number] | null
  >((best, da) => (best === null || da.level < best.level ? da : best), null);
  return level0?.coordinateSystem?.id ?? layer.lens.dataset.intrinsicSystem?.id ?? null;
};
