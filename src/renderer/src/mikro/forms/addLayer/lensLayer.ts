import {
  CreateIntensityLayerDocument,
  CreateLabelLayerDocument,
  CreatePhasorLayerDocument,
  CreateRgbLayerDocument,
  CreateVectorLayerDocument,
  CreateVolumeLayerDocument,
  ProjectionMode,
  PhasorColorMode,
  type Blending,
  type ColorMap,
  type CreateIntensityLayerMutationVariables,
  type CreateLabelLayerMutationVariables,
  type CreatePhasorLayerMutationVariables,
  type CreateRgbLayerMutationVariables,
  type CreateVectorLayerMutationVariables,
  type CreateVolumeLayerMutationVariables,
} from "@/mikro/api/graphql";
import type { LensRegistry } from "@/mikro/lib/lenses/lensRegistry";

import type { LensCandidate } from "./candidates";
import { extentOf, type LayerDefaults, type LayerKind } from "./engine";

/**
 * How a layer over an array lens is asked for, kind by kind: the one recipe
 * the Add Layer form submits and the scene's auto-add (`useStageLens`) runs,
 * so a layer added either way is the same layer.
 */

/** What the person may still say about the layer; the engine's defaults otherwise. */
export type LensLayerChoices = {
  /** VOLUME: how the volume is projected. */
  mode?: ProjectionMode;
  /** PHASOR: which harmonic, and how it is coloured. */
  harmonic?: number;
  phasorMode?: PhasorColorMode;
};

/** The lenses a layer of `kind` draws: one channel, or three planes for RGB. */
export type LensLayerLenses = {
  channel: string;
  planes: { redLens: string; greenLens: string; blueLens: string } | null;
};

/**
 * The lens that is ONE channel of `lens`: what an intensity, volume or phasor
 * layer is made from, and each plane of an rgb one. A lens with no channel
 * axis, or one that already keeps a single channel, is that lens. Otherwise
 * it is the lens' selection with the channel axis at `index` (a dataset
 * index), found or made by the session registry.
 */
export const channelLensOf = (
  registry: Pick<LensRegistry, "ensureChannelLens">,
  lens: LensCandidate,
  index: number,
): Promise<string> => {
  const axis = lens.renderAxes?.intensity;
  if (!axis || extentOf(lens, axis) <= 1) return Promise.resolve(lens.id);
  return registry.ensureChannelLens(lens.dataset.id, lens.slices, axis, index);
};

/**
 * Which lenses the layer is made from. The kinds that draw one channel are
 * made from a single-channel lens rather than from the row's; an RGB layer
 * keeps the row's lens and names its three planes.
 */
export const resolveLensLayerLenses = async (
  registry: Pick<LensRegistry, "ensureChannelLens">,
  kind: LayerKind,
  lens: LensCandidate,
  defaults: LayerDefaults,
): Promise<LensLayerLenses> => {
  const channelIndex =
    kind === "PHASOR" ? (defaults.phasor?.intensityIndex ?? 0) : (defaults.intensity?.intensityIndex ?? 0);
  const channel =
    kind === "INTENSITY" || kind === "VOLUME" || kind === "PHASOR"
      ? await channelLensOf(registry, lens, channelIndex)
      : lens.id;
  if (kind !== "RGB" || !defaults.rgb) return { channel, planes: null };
  const [redLens, greenLens, blueLens] = await Promise.all([
    channelLensOf(registry, lens, defaults.rgb.redIndex),
    channelLensOf(registry, lens, defaults.rgb.greenIndex),
    channelLensOf(registry, lens, defaults.rgb.blueIndex),
  ]);
  return { channel, planes: { redLens, greenLens, blueLens } };
};

export type LensLayerRequest =
  | { kind: "INTENSITY"; document: typeof CreateIntensityLayerDocument; variables: CreateIntensityLayerMutationVariables }
  | { kind: "RGB"; document: typeof CreateRgbLayerDocument; variables: CreateRgbLayerMutationVariables }
  | { kind: "VOLUME"; document: typeof CreateVolumeLayerDocument; variables: CreateVolumeLayerMutationVariables }
  | { kind: "LABEL"; document: typeof CreateLabelLayerDocument; variables: CreateLabelLayerMutationVariables }
  | { kind: "VECTOR"; document: typeof CreateVectorLayerDocument; variables: CreateVectorLayerMutationVariables }
  | { kind: "PHASOR"; document: typeof CreatePhasorLayerDocument; variables: CreatePhasorLayerMutationVariables };

const intensityInput = (defaults: LayerDefaults) => {
  const intensity = defaults.intensity;
  if (!intensity) return {};
  return {
    colormap: intensity.colormap as ColorMap,
    blending: intensity.blending as Blending,
    climMin: intensity.climMin ?? undefined,
    climMax: intensity.climMax ?? undefined,
    gamma: intensity.gamma ?? undefined,
  };
};

/**
 * The mutation that makes a layer of `kind` over `lens` in `scene`. Null when
 * the kind needs what the engine did not answer (RGB without its planes, a
 * phasor without its axis).
 */
export const lensLayerRequest = (input: {
  kind: LayerKind;
  scene: string;
  lens: string;
  lenses: LensLayerLenses;
  defaults: LayerDefaults;
  choices?: LensLayerChoices;
}): LensLayerRequest | null => {
  const { kind, defaults, lenses } = input;
  const choices = input.choices ?? {};
  const base = { lens: input.lens, scene: input.scene };
  switch (kind) {
    case "INTENSITY":
      return {
        kind,
        document: CreateIntensityLayerDocument,
        variables: { input: { ...base, lens: lenses.channel, ...intensityInput(defaults) } },
      };
    case "RGB":
      // The layer's own lens stays the row's: the three planes are crops of it.
      if (!lenses.planes) return null;
      return { kind, document: CreateRgbLayerDocument, variables: { input: { ...base, ...lenses.planes } } };
    case "VOLUME":
      return {
        kind,
        document: CreateVolumeLayerDocument,
        variables: {
          input: {
            ...base,
            lens: lenses.channel,
            ...intensityInput(defaults),
            mode: choices.mode ?? ProjectionMode.Mip,
          },
        },
      };
    case "LABEL":
      return { kind, document: CreateLabelLayerDocument, variables: { input: base } };
    case "VECTOR":
      // Which axis carries the components is not asked: the server derives it
      // from the lens' DISPLACEMENT axis, the way point coordinates come from
      // the table's declared roles.
      return { kind, document: CreateVectorLayerDocument, variables: { input: base } };
    case "PHASOR": {
      const phasor = defaults.phasor;
      if (!phasor) return null;
      return {
        kind,
        document: CreatePhasorLayerDocument,
        variables: {
          input: {
            ...base,
            // The channel whose photons are counted, as its lens.
            lens: lenses.channel,
            phasorAxis: phasor.phasorAxis,
            harmonic: choices.harmonic ?? phasor.harmonic,
            blending: phasor.blending as Blending,
            transfer: {
              colormap: phasor.colormap as ColorMap,
              mode: choices.phasorMode ?? (phasor.mode as PhasorColorMode),
              weightByIntensity: phasor.weightByIntensity,
            },
          },
        },
      };
    }
  }
};
