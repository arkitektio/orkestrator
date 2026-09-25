import { FC, memo } from "react";
import { SceneLayerFragment } from "@/mikro/api/graphql";
import { ImagePlaneLayer } from "../features/volume/ImagePlaneLayer";
import { ImageVolumeLayer } from "../features/volume/ImageVolumeLayer";
import { FabriksCollectionLayer } from "../features/meshes/FabriksCollectionLayer";
import { AnnotationLayerRenderer } from "../features/annotations/layer/AnnotationLayerRenderer";
import { LabelPlaneLayer, LabelVolumeLayer } from "../features/labels/LabelPlaneLayer";
import { TrackLayerRenderer } from "../features/tracks/TracksLayer";
import { PointLayerRenderer } from "../features/points/PointsLayer";
import { NetworkCollectionLayer } from "../features/network/NetworkCollectionLayer";
import { VectorLayerRenderer } from "../features/vectors/VectorsLayer";

export type LayerRendererProps = { layerId: string };

export type LayerRenderers = {
  Layer2D: FC<LayerRendererProps> | null;
  Layer3D: FC<LayerRendererProps> | null;
};

/**
 * Every registered renderer is `memo()`-wrapped HERE, once, rather than in
 * fifteen component files: props are exactly `{ layerId: string }` (stable
 * for a layer's lifetime), so the shallow compare blocks every parent-driven
 * re-render — a card edit that republishes the store arrays must not re-diff
 * N bridge subtrees. Each bridge still re-renders from its OWN store
 * subscriptions, which is precisely the two-plane contract (P17): the store
 * decides, never the parent.
 */
const memoized = (component: FC<LayerRendererProps>): FC<LayerRendererProps> =>
  memo(component) as unknown as FC<LayerRendererProps>;

const registered = {
  ImagePlaneLayer: memoized(ImagePlaneLayer),
  ImageVolumeLayer: memoized(ImageVolumeLayer),
  LabelPlaneLayer: memoized(LabelPlaneLayer),
  LabelVolumeLayer: memoized(LabelVolumeLayer),
  AnnotationLayerRenderer: memoized(AnnotationLayerRenderer),
  PointLayerRenderer: memoized(PointLayerRenderer),
  TrackLayerRenderer: memoized(TrackLayerRenderer),
  FabriksCollectionLayer: memoized(FabriksCollectionLayer),
  NetworkCollectionLayer: memoized(NetworkCollectionLayer),
  VectorLayerRenderer: memoized(VectorLayerRenderer),
};

/**
 * Per-`__typename` render dispatch. Adding a new layer type = one entry here +
 * one component (wrapped in `registered` above so it is memoized like the
 * rest). The image path (`ImagePlaneLayer`/`ImageVolumeLayer`) is never
 * touched when adding other types.
 */
export const LAYER_RENDERERS: Record<SceneLayerFragment["__typename"], LayerRenderers> = {
  ImageLayer: { Layer2D: registered.ImagePlaneLayer, Layer3D: registered.ImageVolumeLayer },
  // The three FIXED-SHAPE lens kinds. They normalize into the same `LayerState`
  // as an image (one channel, three tinted planes, one phasor source), so they
  // ride the same components and the same brick engine — what their declared
  // shape buys is on the material side, where `LayerState.renderKind` lets a
  // specialised compositor be compiled instead of the general 16-slot one.
  IntensityLayer: { Layer2D: registered.ImagePlaneLayer, Layer3D: registered.ImageVolumeLayer },
  RgbLayer: { Layer2D: registered.ImagePlaneLayer, Layer3D: registered.ImageVolumeLayer },
  PhasorLayer: { Layer2D: registered.ImagePlaneLayer, Layer3D: registered.ImageVolumeLayer },
  // 2D fills (or outlines, with `contour`); 3D marches to FIRST HIT — MIP over
  // object ids would keep the largest, which is an arbitrary object. See
  // `createLabelVolumeNodeMaterial`.
  LabelLayer: { Layer2D: registered.LabelPlaneLayer, Layer3D: registered.LabelVolumeLayer },
  AnnotationLayer: { Layer2D: registered.AnnotationLayerRenderer, Layer3D: registered.AnnotationLayerRenderer },
  PointLayer: { Layer2D: registered.PointLayerRenderer, Layer3D: registered.PointLayerRenderer },
  TrackLayer: { Layer2D: registered.TrackLayerRenderer, Layer3D: registered.TrackLayerRenderer },
  // One component for both modes: in 2D it clips itself to a slab around
  // currentZ (see FabriksCollectionLayer's slab effect).
  MeshLayer: { Layer2D: registered.FabriksCollectionLayer, Layer3D: registered.FabriksCollectionLayer },
  // A konnektion node/edge graph. Same one-component-both-modes shape as the
  // mesh layer, and the same reason. Its segments are camera-facing QUADS
  // rather than GL lines — the only way a width in scene units means anything,
  // since `lineWidth > 1` on a line primitive has been a no-op for years.
  NetworkLayer: { Layer2D: registered.NetworkCollectionLayer, Layer3D: registered.NetworkCollectionLayer },
  // Lens-backed but NOT on the brick path (the layerGuards carve-out): one
  // strided CPU read into instanced glyphs, one component for both modes.
  VectorLayer: { Layer2D: registered.VectorLayerRenderer, Layer3D: registered.VectorLayerRenderer },
};
