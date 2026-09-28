import type { DimSliceFragment, SceneLayerFragment } from "@/mikro/api/graphql";
import { buildSliceMap, resolveCollapsedSelection } from "../coords/selection";
import { isVectorLayer } from "./layerGuards";

/**
 * The dim a TIME axis scrubs under, scene-wide.
 *
 * One constant, one home. A track's time and an image's `t` are the same
 * timeline and must scrub together, which is only true if every layer names the
 * dim identically — this used to be declared separately in the panel and in the
 * tracks renderer, which is precisely the kind of pair that drifts.
 */
export const TIME_DIM = "t";

/**
 * ONE dim a layer offers to the scene-wide scrubbers.
 *
 * This is the whole protocol between a layer and `DimSliderPanel`. Before it
 * there were two: brick layers were derived from a lens, and a track layer got
 * a bespoke store record folded in under a hardcoded `'t'`. Every
 * further layer kind carrying a scrubbable dim would have needed its own fold,
 * and the panel would have grown a branch per kind.
 *
 * A layer states three things and nothing else:
 *  - `dim`     the axis NAME, because selections are scene-wide by name
 *              (`viewerStore.dimSelections`) — a track's `t` and an image's `t`
 *              are one timeline and must scrub together.
 *  - `maxIndex` how far it runs. The slider's range is 0…maxIndex.
 *  - `defaultIndex` what renders when no selection exists. NOT always 0, and
 *              that is exactly why the publisher states it: a lens-backed layer
 *              wants its slice's collapsed default (the centre of the selected
 *              span), while a track with no selection must draw its WHOLE
 *              trajectory, so its default is the END of its timeline — opening
 *              a scene on an empty viewport reads as a broken layer.
 */
export type DimExtent = {
  dim: string;
  /** Slider range: 0 … maxIndex. A dim with maxIndex < 1 has nothing to scrub. */
  maxIndex: number;
  /** What renders when `dimSelections` carries no entry for this dim. */
  defaultIndex: number;
};

/**
 * The dims of a lens that collapse to ONE index: everything not RENDERED, with
 * more than one sample.
 *
 * Split out of `sliceSignature.collapsibleDims` so it can be asked of a raw
 * lens fragment rather than only of a normalized brick `LayerState` — a
 * `VectorLayer` is a lens over an array exactly as an image is (see the
 * `NonBrickLensTypename` carve-out in `layerGuards.ts`), but it never reaches
 * `sceneStore.layers`, so its `t` axis was invisible to the sliders.
 *
 * `rendered` is the caller's business because what counts as rendered differs
 * by layer kind, and only the caller knows: x/y/z are always rendered, but the
 * fifth axis is a channel slab for an image, a reduced phasor bin range for a
 * FLIM layer, and a displacement component triple for a vector layer. All three
 * are consumed WHOLESALE — there is no single index to pin and nothing for a
 * slider to scrub — which is the one property this function needs from them.
 * Nulls are accepted and ignored so callers can splat optional axis fields in.
 */
export function collapsibleLensDims(
  lens: { axisNames: readonly string[]; shape: readonly number[] },
  rendered: Iterable<string | null | undefined>,
): string[] {
  const renderedSet = new Set<string>();
  for (const axis of rendered) if (axis) renderedSet.add(axis);
  return lens.axisNames.filter((dim, position) => {
    if (renderedSet.has(dim)) return false;
    return (lens.shape[position] ?? 1) > 1;
  });
}

/**
 * What a lens-backed layer offers the scrubbers, stated in the shared protocol.
 *
 * The default index is the lens slice's COLLAPSED default — the centre of the
 * selected span — matching what the brick pool pins when no selection exists
 * (`resolveFixedDimIndex`), so a layer renders the same frame whether or not a
 * slider has been touched.
 */
export function lensDimExtents(
  lens: {
    axisNames: readonly string[];
    shape: readonly number[];
    slices: readonly DimSliceFragment[];
  },
  rendered: Iterable<string | null | undefined>,
): DimExtent[] {
  const sliceMap = buildSliceMap(lens.slices);
  return collapsibleLensDims(lens, rendered).map((dim) => {
    const extent = lens.shape[lens.axisNames.indexOf(dim)] ?? 1;
    return {
      dim,
      maxIndex: extent - 1,
      defaultIndex: resolveCollapsedSelection(sliceMap[dim], extent),
    };
  });
}

/**
 * What a lens-backed layer OFF the brick path declares, straight from its
 * fragment. Returns `[]` for every kind that has no lens.
 *
 * The brick kinds are deliberately not handled here: their intensity and phasor
 * axes are resolved from the RENDER GRAPH during normalization
 * (`resolveIntensityAxis` / `resolvePhasorAxis`), and re-deriving them from
 * `renderAxes` would silently disagree with the pool the layer actually built.
 * The panel asks them of their `LayerState` instead. This function covers the
 * kinds that never reach `sceneStore.layers` at all.
 *
 * A VECTOR axis counts as RENDERED, exactly as a phasor axis does and for the
 * same reason: the read consumes every one of its components to build one
 * glyph's displacement, so there is no single index to pin and nothing for a
 * slider to scrub. Getting this wrong would offer a "v" slider that scrubs
 * between the x, y and z components of a flow field, which is meaningless.
 */
export function declaredDimExtents(layer: SceneLayerFragment): DimExtent[] {
  if (!isVectorLayer(layer)) return [];
  const { renderAxes } = layer.lens;
  return lensDimExtents(layer.lens, [
    renderAxes.x,
    renderAxes.y,
    renderAxes.z,
    renderAxes.intensity,
    renderAxes.phasor,
    layer.vectorAxis,
  ]);
}

/**
 * Value equality over a published extent list.
 *
 * The store's setter guards on this rather than on reference identity: extents
 * are republished from an effect on every geometry reload, and a fresh array of
 * identical entries would re-run every selector reading the record (P17).
 */
export function sameDimExtents(a: readonly DimExtent[], b: readonly DimExtent[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((entry, index) => {
    const other = b[index];
    return (
      entry.dim === other.dim &&
      entry.maxIndex === other.maxIndex &&
      entry.defaultIndex === other.defaultIndex
    );
  });
}

/** The `maxIndex` a layer published for one dim, or undefined. A SCALAR read,
 * which is what a card may subscribe to — never the array. */
export function publishedMaxIndex(
  extents: readonly DimExtent[] | undefined,
  dim: string,
): number | undefined {
  return extents?.find((entry) => entry.dim === dim)?.maxIndex;
}

/** One layer's offer to the scrubbers. */
export type DimContribution = {
  layerId: string;
  extents: readonly DimExtent[];
  /**
   * True when the extents come from a FRAGMENT rather than from data. Only used
   * to break ties on `defaultIndex` — see `foldDimExtents`.
   */
  declared: boolean;
};

/** One scrubber: a dim, its merged range, and what each contributing layer shows. */
export type DimScrubber = DimExtent & {
  perLayer: { id: string; index: number; maxIndex: number }[];
};

/**
 * Merge every layer's offer into one scrubber per dim NAME.
 *
 * Merging by name is the point: a track's `t` and the image it was tracked on
 * share one timeline, and two sliders both labelled `t` would be a lie about
 * that. The range widens to the longest contributor — `resolveFixedDimIndex`
 * clamps per layer, so a shorter layer pinned at its own last index keeps the
 * SAME slice signature across the out-of-range steps and never re-flushes.
 *
 * `defaultIndex` takes the first DECLARED contributor, falling back to an
 * observed one only when no declared source offered the dim. Adding a track
 * layer to an image scene must not move the image's default frame; but a scene
 * of only tracks still opens on the end of its timeline (drawing whole
 * trajectories) rather than on an empty first frame.
 */
export function foldDimExtents(
  contributions: readonly DimContribution[],
  dimSelections: Readonly<Record<string, number>>,
): DimScrubber[] {
  const byDim = new Map<string, DimScrubber & { defaultIsDeclared: boolean }>();

  for (const { layerId, extents, declared } of contributions) {
    for (const extent of extents) {
      // Nothing to scrub: a single-sample dim is not a slider, it is a fact.
      if (extent.maxIndex < 1) continue;
      const selected = dimSelections[extent.dim];
      const shown =
        selected !== undefined
          ? Math.max(0, Math.min(extent.maxIndex, Math.round(selected)))
          : extent.defaultIndex;
      const entry = { id: layerId, index: shown, maxIndex: extent.maxIndex };

      const existing = byDim.get(extent.dim);
      if (!existing) {
        byDim.set(extent.dim, {
          ...extent,
          defaultIsDeclared: declared,
          perLayer: [entry],
        });
        continue;
      }
      existing.maxIndex = Math.max(existing.maxIndex, extent.maxIndex);
      if (declared && !existing.defaultIsDeclared) {
        existing.defaultIndex = extent.defaultIndex;
        existing.defaultIsDeclared = true;
      }
      existing.perLayer.push(entry);
    }
  }

  return [...byDim.values()]
    .map(({ defaultIsDeclared: _ignored, ...scrubber }) => scrubber)
    .sort((a, b) => a.dim.localeCompare(b.dim));
}
