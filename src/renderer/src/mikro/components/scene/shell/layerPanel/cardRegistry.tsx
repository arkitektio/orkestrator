import type { ComponentType } from "react";
import type { SceneLayerFragment } from "@/mikro/api/graphql";

import type { LayerState } from "../../platform/stores/sceneStore";
import { AnnotationLayerCard } from "../../features/annotations/AnnotationLayerCard";
import { LabelLayerCard } from "../../features/labels/LabelLayerCard";
import { MeshLayerCard } from "../../features/meshes/MeshLayerCard";
import { NetworkLayerCard } from "../../features/network/NetworkLayerCard";
import { PointLayerCard } from "../../features/points/PointLayerCard";
import { TrackLayerCard } from "../../features/tracks/TrackLayerCard";
import { VectorLayerCard } from "../../features/vectors/VectorLayerCard";
import { FixedShapeLayerCard } from "./FixedShapeLayerCard";
import { ImageLayerCard } from "./ImageLayerCard";
import type { LayerCardProps } from "./cardShell";

export type { LayerCardProps } from "./cardShell";

/**
 * Per-`__typename` CARD dispatch — the sibling of `shell/layerRegistry.ts`,
 * which does the same for renderers. Adding a layer type is one entry in each.
 *
 * This replaces five hard-coded, pre-partitioned per-`__typename` arrays inside
 * `LayerControlPanel`. Nine typenames made that shape untenable; the panel now
 * owns ordering and chrome, and knows nothing about which card is which.
 *
 * ## `source` is load-bearing, not bookkeeping
 *
 * The store keeps layers in TWO lists and they are not interchangeable:
 *
 *  - `sceneStore.layers` — NORMALIZED `LayerState`, every lens-backed layer.
 *    A card for one of these MUST edit these objects, because the renderer
 *    reads them: editing the raw fragment instead would leave the two
 *    disagreeing (`patchSceneLayer` writes only `sceneLayers`), so a picked
 *    colouring would update the card and never reach the material.
 *  - `sceneStore.sceneLayers` — the raw polymorphic fragments. The
 *    table-backed and collection-backed kinds are consumed straight off these;
 *    they never enter the brick path, so they are never normalized.
 *
 * `source` says which list this card's layer comes from, and it is what lets
 * the panel pull from the right one without a per-kind branch.
 *
 * ## `rank` is the block order
 *
 * Cards are grouped into blocks by rank rather than interleaved by the scene's
 * `order`. The two lists are normalized differently, and a stable block order
 * beats a merged one that would reshuffle as either side changes. The chosen
 * order, and why: images and the fixed-shape lens kinds first (the picture),
 * then labels — a mask is almost always read AGAINST one — then the
 * collection- and table-backed kinds, which a scene grows later.
 */
type FragmentOf<K extends SceneLayerFragment["__typename"]> = Extract<
  SceneLayerFragment,
  { __typename: K }
>;

export type LayerCardEntry<K extends SceneLayerFragment["__typename"]> =
  | {
      source: "layerState";
      rank: number;
      Card: ComponentType<LayerCardProps<LayerState>>;
    }
  | {
      source: "fragment";
      rank: number;
      Card: ComponentType<LayerCardProps<FragmentOf<K>>>;
    };

export type LayerCardRegistry = {
  [K in SceneLayerFragment["__typename"]]: LayerCardEntry<K>;
};

export const LAYER_CARDS: LayerCardRegistry = {
  // The picture. `ImageLayer` is the only one that mounts a render-graph
  // editor; the three fixed-shape kinds share one card because what they
  // differ in is which VALUES are editable, not how the card is built.
  ImageLayer: { source: "layerState", rank: 0, Card: ImageLayerCard },
  IntensityLayer: { source: "layerState", rank: 1, Card: FixedShapeLayerCard },
  RgbLayer: { source: "layerState", rank: 1, Card: FixedShapeLayerCard },
  PhasorLayer: { source: "layerState", rank: 1, Card: FixedShapeLayerCard },
  // Off `layers`, NOT `sceneLayers`: a label mask is normalized like an image
  // (it shares the brick path) and the renderer reads it from there.
  LabelLayer: { source: "layerState", rank: 2, Card: LabelLayerCard },
  MeshLayer: { source: "fragment", rank: 3, Card: MeshLayerCard },
  AnnotationLayer: { source: "fragment", rank: 4, Card: AnnotationLayerCard },
  // Neither of the table-backed kinds had a card before: a point cloud or a
  // trajectory could be created and then never touched again.
  PointLayer: { source: "fragment", rank: 5, Card: PointLayerCard },
  TrackLayer: { source: "fragment", rank: 5, Card: TrackLayerCard },
  // Its own block after the table-backed kinds: a network is read alongside a
  // picture but is neither a mask nor a trajectory, and a scene grows it last.
  NetworkLayer: { source: "fragment", rank: 6, Card: NetworkLayerCard },
  // Off `sceneLayers`, not `layers`: lens-backed but never normalized — it
  // skips the brick path (see layerGuards' carve-out), so the raw fragment is
  // what its renderer reads too.
  VectorLayer: { source: "fragment", rank: 2, Card: VectorLayerCard },
};

/**
 * Any registry entry, with its per-typename layer type erased.
 *
 * Indexing the mapped registry with a RUNTIME typename can only yield the union
 * of all nine entries, and a union of `ComponentType`s over different props is
 * not itself callable — component props are contravariant, so no single call
 * signature covers them. This is the honest type for "an entry I looked up by a
 * string", and `renderLayerCard` below is the one place that erasure is spent.
 */
export type AnyLayerCardEntry = LayerCardRegistry[SceneLayerFragment["__typename"]];

/**
 * Render one card, given the entry looked up for its typename.
 *
 * The single cast in this file, and the thing `source` exists to justify: the
 * caller took `layer` from the list `entry.source` names, so the pairing is the
 * REGISTRY's assertion, made once at the definition site where it is checked,
 * rather than a per-typename guess at the call site. That is exactly what the
 * nine hard-coded `.map()`s used to spend instead.
 */
export const renderLayerCard = (
  entry: AnyLayerCardEntry,
  layer: LayerState | SceneLayerFragment,
  props: Omit<LayerCardProps<never>, "layer">,
) => {
  const Card = entry.Card as ComponentType<LayerCardProps<typeof layer>>;
  return <Card layer={layer} {...props} />;
};
