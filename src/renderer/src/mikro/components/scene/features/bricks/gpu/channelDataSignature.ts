import type { LayerState } from "../../../platform/model/layerModel";

/**
 * Value signatures over exactly the layer fields `buildMergedChannelUniformData`
 * (via `buildChannelUniformData`, `writeCursors`, `resolveValueRange` and the
 * caller's `projectionModeOf`) reads — split into the STRUCTURE half (atlas
 * rows, source/phasor params, cursors, slot mapping, member specialization)
 * and the WINDOW half (the per-slot clim/gamma/opacity scalars a contrast
 * drag moves at 60 Hz).
 *
 * The split is what makes drags cheap: the volume layer keys its full
 * `channelData` rebuild — which allocates a colormap atlas plus two
 * DataTextures PER MEMBER — on the structure signature only, and answers
 * window-only changes by writing the fresh scalars into the existing uniform
 * nodes (`updateChannelWindows`), allocation-free.
 *
 * If a new field is consumed by the uniform builders it MUST be added to one
 * of the two (window iff it feeds ONLY the per-slot scalar arrays), or edits
 * to it will silently stop reaching the GPU. Transfer objects are serialized
 * wholesale on the structure side (minus the window scalars), so
 * transfer-level additions are covered automatically. `renderKind` is
 * structural even though it is DERIVED from window fields (an rgb layer's
 * shared window, gamma = 1, plain opacity): when a window edit demotes it,
 * the structure signature must move too — the compiled material's
 * specialization no longer matches.
 */

type SourceLike = NonNullable<ReturnType<typeof sourcesOf>>[number];

const sourcesOf = (layer: LayerState) => layer.sources ?? layer.channels ?? [];

/**
 * The scalar-window inputs of one source — the RAW fields
 * `sourceScalarWindow` (channelUniforms.ts) derives its output from. Raw
 * rather than `effectiveScalarTransfer`'s result (keeps this module free of
 * runtime imports): under a transfer CURVE the effective window ignores raw
 * clim/gamma, so a raw edit there fires a redundant no-op fast-path write —
 * harmless; a curve edit itself is structural and rebuilds.
 */
const windowOf = (source: SourceLike) => {
  const transfer = source.type === "phasor" ? source.transfer.intensity : source.transfer;
  return [
    transfer.climMin ?? null,
    transfer.climMax ?? null,
    transfer.gamma ?? 1,
    transfer.opacity ?? 1,
  ];
};

/** A transfer with the window scalars removed (they live in the window
 * signature); everything else — curve, colormap, invert, cursors — stays. */
const structuralTransfer = (transfer: Record<string, unknown>) => {
  const { climMin: _a, climMax: _b, gamma: _c, opacity: _d, ...rest } = transfer;
  return rest;
};

// Cached per layer OBJECT: layers are replaced immutably (the module's own
// premise — identity IS the edit signal), so every call after the first per
// layer object is a WeakMap hit. During a drag the ~60 Hz key rebuilds in the
// brick layers then restringify only the ONE edited layer.
const structureCache = new WeakMap<LayerState, string>();
const windowCache = new WeakMap<LayerState, string>();

export function buildChannelDataSignature(layer: LayerState | undefined): string {
  if (!layer) return "∅";
  const hit = structureCache.get(layer);
  if (hit !== undefined) return hit;
  const signature = computeChannelDataSignature(layer);
  structureCache.set(layer, signature);
  return signature;
}

function computeChannelDataSignature(layer: LayerState): string {
  try {
    return JSON.stringify({
      kind: layer.renderKind ?? null,
      blend: layer.blend ?? null,
      colormap: layer.colormap ?? null,
      color: layer.color ?? null,
      projection: layer.projection ?? null,
      phasorLens: layer.lens?.phasor ?? null,
      sources: sourcesOf(layer).map((source) =>
        source.type === "phasor"
          ? {
              t: "p",
              v: source.visible,
              h: source.harmonic,
              tr: {
                ...structuralTransfer(source.transfer as unknown as Record<string, unknown>),
                intensity: structuralTransfer(
                  source.transfer.intensity as unknown as Record<string, unknown>,
                ),
              },
            }
          : {
              t: "c",
              v: source.visible,
              i: source.intensityIndex,
              tr: structuralTransfer(source.transfer as unknown as Record<string, unknown>),
            },
      ),
    });
  } catch {
    // Unserializable state (should not happen for store data): fall back to
    // always-rebuild rather than serving stale uniforms.
    return `unserializable:${++unserializableCounter}`;
  }
}

export function buildChannelWindowSignature(layer: LayerState | undefined): string {
  if (!layer) return "∅";
  const hit = windowCache.get(layer);
  if (hit !== undefined) return hit;
  let signature: string;
  try {
    signature = JSON.stringify(sourcesOf(layer).map(windowOf));
  } catch {
    signature = `unserializable:${++unserializableCounter}`;
  }
  windowCache.set(layer, signature);
  return signature;
}

let unserializableCounter = 0;
