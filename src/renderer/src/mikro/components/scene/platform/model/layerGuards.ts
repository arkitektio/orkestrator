import { SceneLayerFragment } from "@/mikro/api/graphql";

/**
 * `Scene.layers` is a polymorphic `Layer` interface. The generated
 * `SceneLayerFragment` is a `__typename`-discriminated union of the concrete
 * layer variants. This extracts the variant types and provides type guards so
 * consumers can narrow before reading variant-only fields (e.g. `lens`,
 * `renderGraph` on ImageLayer, `labelRender` on LabelLayer).
 */
export type ImageLayerFragment = Extract<
  SceneLayerFragment,
  { __typename: "ImageLayer" }
>;

export type LabelLayerFragment = Extract<
  SceneLayerFragment,
  { __typename: "LabelLayer" }
>;

/**
 * The three FIXED-SHAPE lens layers. Each states its whole rendering as flat
 * fields — one scalar source, three colour planes, one phasor reduction — rather
 * than as a render graph that could contain anything. They are Lenses over an
 * array exactly as an image is, so they take the same data path; what the fixed
 * shape buys is on the OTHER side, in `layerModel`'s normalizers (no graph walk)
 * and in the material (see `renderKind`).
 */
export type IntensityLayerFragment = Extract<
  SceneLayerFragment,
  { __typename: "IntensityLayer" }
>;

export type RgbLayerFragment = Extract<
  SceneLayerFragment,
  { __typename: "RgbLayer" }
>;

export type PhasorLayerFragment = Extract<
  SceneLayerFragment,
  { __typename: "PhasorLayer" }
>;

export const isImageLayer = (
  layer: SceneLayerFragment,
): layer is ImageLayerFragment => layer.__typename === "ImageLayer";

export const isLabelLayer = (
  layer: SceneLayerFragment,
): layer is LabelLayerFragment => layer.__typename === "LabelLayer";

export const isIntensityLayer = (
  layer: SceneLayerFragment,
): layer is IntensityLayerFragment => layer.__typename === "IntensityLayer";

export const isRgbLayer = (
  layer: SceneLayerFragment,
): layer is RgbLayerFragment => layer.__typename === "RgbLayer";

export const isPhasorLayer = (
  layer: SceneLayerFragment,
): layer is PhasorLayerFragment => layer.__typename === "PhasorLayer";

/**
 * The sixth lens-backed kind — and deliberately NOT a brick layer, which makes
 * it the first member of a new category this file must name rather than imply.
 *
 * A vector layer is a Lens over an array exactly as the five brick kinds are,
 * but it does not ride the brick engine: the brick path samples a resident
 * atlas and emits COLOUR, where a vector layer reads a strided region once and
 * emits GEOMETRY (instanced glyphs). Sending it through `zarrSources` /
 * `lodPlanning` would open stores the octree planner then plans raster bricks
 * for, and nothing would ever draw them.
 */
export type VectorLayerFragment = Extract<
  SceneLayerFragment,
  { __typename: "VectorLayer" }
>;

export const isVectorLayer = (
  layer: SceneLayerFragment,
): layer is VectorLayerFragment => layer.__typename === "VectorLayer";

/**
 * Layers backed by a BRICK POOL: every layer that is a Lens over an array.
 *
 * This — not `isImageLayer` — is the guard the data path wants. All five of
 * these are a Lens over an array, so they want the same zarr stores opened, the
 * same octree planning, the same brick residency and the same probe. What
 * differs is only how a sampled value becomes colour, which is the material's
 * business and nothing the data path knows about.
 *
 * Named for the invariant every downstream site actually depends on. The ones
 * that gate on it are those where a layer being absent means it never loads at
 * all: `platform/sources/zarrSources.ts` (opening the arrays),
 * `platform/stores/sceneStore.ts` (normalizing into `layers`, and the `isImage`
 * predicate `reconcileSceneLayers` folds by) and `platform/quality/lodPlanning.ts`
 * (typed on this union).
 *
 * ADDING A LENS LAYER TYPE MEANS ADDING IT HERE. A typename missing from this
 * union renders NOTHING — silently, with no error anywhere, because every stage
 * that would have complained was never reached.
 *
 * `isImageLayer` stays, and is still the right question wherever the answer
 * really is "a layer with a composable render graph": the render-graph editor
 * and `AddLayerForm`. The fixed-shape kinds have no graph to edit.
 */
export type BrickLayerFragment =
  | ImageLayerFragment
  | LabelLayerFragment
  | IntensityLayerFragment
  | RgbLayerFragment
  | PhasorLayerFragment;

export const isBrickLayer = (
  layer: SceneLayerFragment,
): layer is BrickLayerFragment =>
  layer.__typename === "ImageLayer" ||
  layer.__typename === "LabelLayer" ||
  layer.__typename === "IntensityLayer" ||
  layer.__typename === "RgbLayer" ||
  layer.__typename === "PhasorLayer";

/**
 * COMPILE-TIME exhaustiveness for the union above.
 *
 * `isBrickLayer` is the one dispatch in this file the compiler cannot check on
 * its own: `shell/layerRegistry.ts` and `shell/layerPanel/cardRegistry.ts` are
 * exhaustive `Record`s and so a new typename breaks them loudly, but a guard is
 * just a boolean expression — a lens layer missing from it compiles perfectly
 * and renders NOTHING, silently, because no zarr store is ever opened for it.
 *
 * So state the invariant as a type: every arm of `SceneLayerFragment` that has
 * a `lens` (i.e. is a view over an array) must be in `BrickLayerFragment`. Add
 * a lens layer to the schema, regenerate, and this line is the error that tells
 * you which one — before the blank viewport does.
 */
type LensBackedTypename = Extract<
  SceneLayerFragment,
  { lens: unknown }
>["__typename"];

/**
 * Lens-backed typenames EXCLUDED from the brick path, each by name and with
 * its reason — a TYPED carve-out, never an omission. A typename listed here is
 * this file asserting "this layer has a lens and its renderer owns its own
 * data path"; a typename in neither place is still the error below.
 *
 * - `VectorLayer`: emits geometry, not samples — see `isVectorLayer` above.
 *   Its renderer (`features/vectors/VectorsLayer.tsx`) opens its own store and
 *   does one strided CPU read; there is no atlas residency to plan.
 */
type NonBrickLensTypename = "VectorLayer";

type MissingFromBrickLayers = Exclude<
  LensBackedTypename,
  BrickLayerFragment["__typename"] | NonBrickLensTypename
>;

// If this errors, the named typename has a `lens` but is in neither
// `BrickLayerFragment` / `isBrickLayer` nor the named `NonBrickLensTypename`
// carve-out. Add it to one of them — deliberately, with a reason.
const _assertEveryLensLayerIsABrickLayer: MissingFromBrickLayers extends never
  ? true
  : never = true;
void _assertEveryLensLayerIsABrickLayer;
