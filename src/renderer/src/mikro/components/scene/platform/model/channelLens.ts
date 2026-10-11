import type { SceneLayerFragment } from "@/mikro/api/graphql";
import {
  pinnedIndex,
  type LensSelection,
  type SliceLike,
} from "@/mikro/lib/lenses/lensSelection";

/**
 * A layer's lens as the BRICK ENGINE should see it.
 *
 * The server names which channel a layer draws through the lens itself: an
 * intensity layer's lens is its dataset with the channel axis sliced to one
 * position, so four channels of one acquisition are four lenses with four ids.
 * The engine does not care. A brick pool holds EVERY channel of its dataset as
 * slabs (`levelGeometry`: slab i = channel i) and the fetch never reads a slice
 * on the channel axis (`computeFixedIndices`), so which channel a layer draws
 * is a shader uniform, exactly as it was when it was an `intensityIndex` field.
 *
 * What does care is pool IDENTITY: `buildSliceSignature` serializes
 * `lens.slices`, and four signatures are four pools — four atlases, the device
 * budget split four ways, four plan traversals and four raymarch passes for
 * one image. So the channel slice is taken OUT of the lens the renderer is
 * handed, once, at the model boundary, and travels as an index instead
 * (`LayerState.channelPin`, `ChannelRenderNode.intensityIndex`). Everything
 * downstream then sees the lens it saw before the channel moved into it.
 */

type PoolLensSource = {
  slices: readonly SliceLike[];
  dataset: { axisNames: readonly string[]; shape: readonly number[] };
};

/**
 * The slices that decide what a brick HOLDS: in dataset axis order, without the
 * channel axis, and without any slice that selects a whole axis.
 *
 * The last rule is defensive. An omitted slice and an explicit `0..extent` are
 * one selection but two spellings, and they would both fork the pool key and
 * move the default frame (`resolveCollapsedSelection` reads an absent slice as
 * index 0 and a full one as the centre). One spelling — the whole lens' own,
 * which has no slices — keeps a channel lens and the whole lens beside it on
 * one pool and one frame, whichever way the server writes them.
 *
 * Returns the INPUT array when nothing changes, so a lens that needs no
 * rewriting keeps its identity.
 */
export function canonicalSlices<S extends SliceLike>(
  lens: { slices: readonly S[]; dataset: PoolLensSource["dataset"] },
  channelAxis: string | null | undefined,
): readonly S[] {
  const { axisNames, shape } = lens.dataset;
  const kept = lens.slices.filter((slice) => {
    if (channelAxis && slice.axis === channelAxis) return false;
    const position = axisNames.indexOf(slice.axis);
    if (position === -1) return true;
    const extent = shape[position] ?? 0;
    const whole =
      (slice.start ?? 0) <= 0 &&
      (slice.stop == null || slice.stop >= extent) &&
      (slice.step ?? 1) === 1;
    return !whole;
  });
  const ordered = [...kept].sort(
    (a, b) => axisNames.indexOf(a.axis) - axisNames.indexOf(b.axis),
  );
  const unchanged =
    ordered.length === lens.slices.length &&
    ordered.every((slice, index) => slice === lens.slices[index]);
  return unchanged ? lens.slices : ordered;
}

const poolLenses = new WeakMap<object, { axis: string | null; lens: object }>();

/**
 * `lens` with its slices reduced to `canonicalSlices`. The same object when
 * there is nothing to reduce, and the same RESULT for the same lens every time:
 * `layerPlanSignature` keys on the lens' identity, so a re-normalization that
 * minted a new one would replan for nothing.
 *
 * Only `slices` differs. The id, the shape, the placement edges and the anchors
 * are the layer's real lens': the affine is composed from them and the layer
 * panel names it by them.
 */
export function poolLensOf<L extends PoolLensSource>(
  lens: L,
  channelAxis: string | null | undefined,
): L {
  const axis = channelAxis ?? null;
  const cached = poolLenses.get(lens);
  if (cached && cached.axis === axis) return cached.lens as L;
  const slices = canonicalSlices(lens, axis);
  const result = slices === lens.slices ? lens : { ...lens, slices };
  poolLenses.set(lens, { axis, lens: result });
  return result;
}

const familyKeys = new WeakMap<object, string>();

/**
 * Which run of layer cards a lens belongs to. Channel lenses of one dataset are
 * one family — the panel heads them once, as it did when they shared a lens id
 * — and a lens that is not an array lens is a family of its own.
 *
 * Asked of a NORMALIZED layer's lens (already a pool lens), so the channel is
 * not part of the answer.
 */
export function lensFamilyKey(lens: {
  id: string;
  slices?: readonly SliceLike[] | null;
  dataset?: { id: string } | null;
}): string {
  if (!lens.dataset || !lens.slices) return lens.id;
  const cached = familyKeys.get(lens);
  if (cached !== undefined) return cached;
  const key = `${lens.dataset.id}|${lens.slices
    .map((slice) => `${slice.axis}:${slice.start ?? ""}:${slice.stop ?? ""}:${slice.step ?? 1}`)
    .join(",")}`;
  familyKeys.set(lens, key);
  return key;
}

/** What `collectSceneLensFacts` reads of a layer, whatever its kind. */
type LensBearingLayer = {
  __typename?: string;
  lens?: {
    id: string;
    slices?: readonly SliceLike[] | null;
    dataset?: { id: string; fullLens?: { id: string } | null } | null;
  } | null;
  redLens?: { id: string; slices: readonly SliceLike[] } | null;
  greenLens?: { id: string; slices: readonly SliceLike[] } | null;
  blueLens?: { id: string; slices: readonly SliceLike[] } | null;
  renderGraph?: { root?: GraphNodeLike | null } | null;
  colorBys?: readonly { lens?: string | null }[] | null;
  filterBys?: readonly { lens?: string | null }[] | null;
  labelRender?: {
    colorBys?: readonly { lens?: string | null }[] | null;
    filterBys?: readonly { lens?: string | null }[] | null;
  } | null;
};

type GraphNodeLike = { lens?: string | null; children?: readonly GraphNodeLike[] | null };

const collectNodeLenses = (node: GraphNodeLike | null | undefined, into: Set<string>) => {
  if (!node) return;
  if (node.lens) into.add(node.lens);
  for (const child of node.children ?? []) collectNodeLenses(child, into);
};

/**
 * Everything a scene payload says about lenses, split by how it says it.
 *
 * `known` are the lenses the payload carries as OBJECTS (a layer's own lens,
 * an rgb layer's three planes, a dataset's whole lens): their selection is
 * already here and costs nothing to keep. `bareIds` are the ones it names by id
 * alone — a render-graph node's channel, a sparse colouring's position — which
 * is the only thing a scene ever has to ask the server about again.
 *
 * This is the one function an inline backend field would change: its lenses
 * move from `bareIds` to `known` and the lookup is never sent.
 */
export function collectSceneLensFacts(layers: readonly SceneLayerFragment[]): {
  known: LensSelection[];
  bareIds: string[];
} {
  const known: LensSelection[] = [];
  const bare = new Set<string>();
  for (const layer of layers as readonly LensBearingLayer[]) {
    const lens = layer.lens;
    const datasetId = lens?.dataset?.id;
    if (lens && datasetId && lens.slices) {
      known.push({ kind: "array", id: lens.id, dataset: datasetId, slices: lens.slices });
      const full = lens.dataset?.fullLens;
      if (full && full.id !== lens.id) {
        known.push({ kind: "array", id: full.id, dataset: datasetId, slices: [] });
      }
      for (const plane of [layer.redLens, layer.greenLens, layer.blueLens]) {
        if (plane) {
          known.push({ kind: "array", id: plane.id, dataset: datasetId, slices: plane.slices });
        }
      }
    }
    collectNodeLenses(layer.renderGraph?.root, bare);
    for (const entries of [
      layer.colorBys,
      layer.filterBys,
      layer.labelRender?.colorBys,
      layer.labelRender?.filterBys,
    ]) {
      for (const entry of entries ?? []) if (entry.lens) bare.add(entry.lens);
    }
  }
  const knownIds = new Set(known.map((selection) => selection.id));
  return { known, bareIds: [...bare].filter((id) => !knownIds.has(id)) };
}

export { pinnedIndex };
