import { collapsibleLensDims } from "./dimExtents";
import type { LayerState } from "./layerModel";

/**
 * Identity of a layer's non-spatial selection (extra dim slices, axis
 * mapping, scene-wide dim-slider selections). A signature change means every
 * cached brick shows different data — the residency manager flushes the
 * layer wholesale on mismatch.
 *
 * currentZ is deliberately NOT part of the signature: z is a spatial axis of
 * the brick address (page tables hold every slab), so bricks of other slabs
 * stay valid across z-scrubs — flushing on z change would refetch the whole
 * working set on every slider step (legacy ChunkPlane semantics, where
 * textures had no z identity).
 */

/**
 * The dims of this layer that collapse to ONE index at pool creation:
 * everything except the render axes (x/y/z spatial, intensity channel-slab,
 * and a phasor axis) with more than one sample. These are the dims the
 * scene-wide sliders (`viewerStore.dimSelections`) can scrub. Shared with
 * `DimSliderPanel`.
 *
 * A phasor axis counts as RENDERED even though it maps to no screen axis: the
 * repack consumes every one of its bins to produce the layer's g/s/intensity
 * slabs, so there is no single index to pin and nothing for a slider to scrub.
 *
 * The rule itself lives in `dimExtents.collapsibleLensDims`, which asks it of a
 * raw lens; this states which axes a normalized BRICK layer renders. The two
 * must not drift — a lens layer off the brick path (a vector field) answers the
 * same question through the same function, with its own rendered set.
 */
export function collapsibleDims(layer: LayerState): string[] {
  return collapsibleLensDims(layer.lens, [
    layer.xAxis,
    layer.yAxis,
    layer.zAxis,
    layer.intensityAxis,
    layer.phasorAxis,
  ]);
}

export function buildSliceSignature(
  layer: LayerState,
  dimSelections: Record<string, number> = {},
): string {
  // Only the layer's OWN collapsible dims enter the signature: a tau-slider
  // change must not flush a layer without tau, and x/y/z/intensity selections
  // can never leak in (z scrubbing stays flush-free).
  const selections: Record<string, number> = {};
  for (const dim of collapsibleDims(layer)) {
    const selected = dimSelections[dim];
    if (selected !== undefined) selections[dim] = selected;
  }
  return JSON.stringify({
    xAxis: layer.xAxis ?? null,
    yAxis: layer.yAxis ?? null,
    zAxis: layer.zAxis ?? null,
    intensityAxis: layer.intensityAxis ?? null,
    // The phasor reduction is BAKED INTO the bricks (g/s/intensity slabs), so
    // the axis it runs over, the harmonic it runs at, and the channel whose
    // photons it counts all change what every cached brick holds — each must
    // flush the pool. Everything else about a phasor node (colormap, mode,
    // range, cursors) is a shader uniform and must NOT appear here.
    phasorAxis: layer.phasorAxis ?? null,
    phasors: (layer.phasors ?? []).map((phasor) => ({
      harmonic: phasor.harmonic,
      intensityIndex: phasor.intensityIndex,
    })),
    selections,
    slices: layer.lens.slices.map((slice) => ({
      dim: slice.axis,
      start: slice.start ?? null,
      stop: slice.stop ?? null,
      step: slice.step ?? null,
    })),
  });
}
