/**
 * Trajectories drawn from a table dataset, grouped by its TRACK_ID column.
 *
 * The last of the layer kinds to graduate out of the old `stubs.tsx` (since
 * deleted, once every kind had a real renderer),
 * which had said all along that "Track is the same data path [as Point] and can
 * follow the same way". It is: one ordered columnar scan of a parquet table,
 * packed into GPU buffers once, then coloured and faded by uniforms alone.
 *
 * WHAT IS DIFFERENT FROM A POINT CLOUD, and why this is not that file with a
 * line material swapped in:
 *
 *  - **Cardinality.** A point layer is one instance per object per value. Here
 *    many ROWS are one trajectory and one instance is one SEGMENT between two
 *    of them, so the row→object map a point layer builds is meaningless and its
 *    `slots.set(id, index)` would collapse each track to its last observation.
 *    Runs, not ids, are the unit (`readTrackPositions`).
 *  - **Order is data.** A point cloud does not care what order its rows arrive
 *    in; a polyline is nothing but the order. The `ORDER BY (track, t)` in the
 *    read is load-bearing, and its absence would draw a scribble through the
 *    very same points with nothing downstream able to notice.
 *  - **Time.** No other layer consumes a per-row time column. This one fades a
 *    tail against the scene's current timepoint, which arrives as
 *    `dimSelections["t"]` and is subscribed to imperatively (see below).
 */
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Line2 } from "three/examples/jsm/lines/webgpu/Line2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";

import { useAttributeServiceOrNull } from "@/mikro/lib/attributes/AttributeServiceProvider";
import {
  placementToSpatialAffine,
  spatialAxisTriple,
} from "@/lib/scene/coords/transformGraph";
import type { SceneLayerFragment } from "@/mikro/api/graphql";
import { affineToMatrix4 } from "../../platform/coords/worldTransform";
import { paletteRowFor, DEFAULT_MEASURE_COLORMAP } from "../../platform/attributes/valueLut";
import { TIME_DIM, type DimExtent } from "../../platform/model/dimExtents";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { usePublishDimExtents } from "../../platform/stores/useLayerDimExtents";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";
import { createTrackMaterial, setTrackPalette } from "./tracksMaterial";
import {
  isTrackLoadError,
  loadTrackGeometry,
  valueSpanOf,
  type TrackGeometry,
} from "./tracksSource";
import { bindField } from "@/lib/scene/stores/bindStore";

/** Tail length in timepoints when the layer has not been told otherwise. */
export const DEFAULT_TAIL_WINDOW = 10;


export const TrackLayerRenderer = ({ layerId }: { layerId: string }) => {
  const layer = useSceneStore((s) => s.sceneLayers.find((candidate) => candidate.id === layerId));
  if (!layer || layer.__typename !== "TrackLayer") return null;
  if (!layer.tableDataset) return null;
  return <TrackLines layer={layer} />;
};

type TrackLayerView = Extract<SceneLayerFragment, { __typename?: "TrackLayer" }>;

const TrackLines = ({ layer }: { layer: TrackLayerView }) => {
  const invalidate = useThree((state) => state.invalidate);
  const service = useAttributeServiceOrNull();

  const [geometry, setGeometry] = useState<TrackGeometry | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);


  // ------------------------------------------------------------------ placement
  const worldSystem = useSceneStore((s) => s.transformContext.worldCoordinateSystem);

  /**
   * The same two-sided reduction the point layer does, and for the same reason:
   * `asAffine` is `M × (N+1)` over NAMED axes, its COLUMNS being the table's own
   * coordinate columns (which of them is x/y/z is this layer's `xColumn` &c.)
   * and its ROWS the world's axes in the world's order. Addressing either side
   * by position transposes the placement.
   */
  const affine = useMemo(
    () =>
      affineToMatrix4(
        placementToSpatialAffine(
          layer.asAffine,
          [layer.xColumn ?? null, layer.yColumn ?? null, layer.zColumn ?? null],
          spatialAxisTriple(worldSystem),
        ),
      ),
    [layer.asAffine, layer.xColumn, layer.yColumn, layer.zColumn, worldSystem],
  );

  // ------------------------------------------------------------------ the read
  useEffect(() => {
    const engine = service?.engine;
    if (!engine || !layer.trackIdColumn || !layer.xColumn || !layer.yColumn) return;
    let cancelled = false;

    void loadTrackGeometry(engine, layer.tableDataset.store as never, {
      trackId: layer.trackIdColumn,
      x: layer.xColumn,
      y: layer.yColumn,
      z: layer.zColumn ?? null,
      t: layer.tColumn ?? null,
      // Read in the SAME scan as the coordinates: a track table has no id
      // column, so a second scan could not be aligned to this one.
      value: layer.colorByColumn ?? null,
    })
      .then((result) => {
        if (cancelled) return;
        if (result === null) {
          setRefusal("this table could not be read column-wise");
          setGeometry(null);
          return;
        }
        if (isTrackLoadError(result)) {
          setRefusal(result.error);
          setGeometry(null);
          return;
        }
        setRefusal(null);
        setGeometry(result);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setRefusal(error instanceof Error ? error.message : String(error));
        setGeometry(null);
      });

    return () => {
      cancelled = true;
    };
  }, [
    service,
    layer.tableDataset.store,
    layer.trackIdColumn,
    layer.xColumn,
    layer.yColumn,
    layer.zColumn,
    layer.tColumn,
    layer.colorByColumn,
  ]);

  useEffect(() => {
    if (refusal) console.warn(`[tracks] not drawn: ${refusal}`);
  }, [refusal]);

  // A world-space `lineWidth` is a well-defined length only from SIMILARITY up.
  // The schema names `lineWidth` explicitly among the scalars this governs.
  useEffect(() => {
    const invariance = layer.placementInvariance;
    if (invariance && invariance !== "ISOMETRY" && invariance !== "SIMILARITY") {
      console.warn(
        `[tracks] this layer's placement is ${invariance}, so 'lineWidth' in scene units is not a well-defined length here`,
      );
    }
  }, [layer.placementInvariance]);

  // ------------------------------------------------------------------ the line
  const bundle = useMemo(
    () =>
      createTrackMaterial({
        lineWidth: layer.lineWidth ?? 1,
        colorize: Boolean(layer.colorByColumn) && Boolean(geometry?.values),
      }),
    // Rebuilt only when the COLOURED-ness changes, not on every width tick —
    // the width itself is a uniform write below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Boolean(layer.colorByColumn) && Boolean(geometry?.values)],
  );

  const lineGeometry = useMemo(() => new LineSegmentsGeometry(), []);
  const line = useMemo(
    () => new Line2(lineGeometry as never, bundle.material as never),
    [lineGeometry, bundle],
  );

  useEffect(
    () => () => {
      lineGeometry.dispose();
      bundle.dispose();
    },
    [lineGeometry, bundle],
  );

  /**
   * Upload in a LAYOUT effect, not a passive one.
   *
   * `platform/draw/Line.tsx` records why: the WGSL vertex layout is derived
   * from the geometry's attributes, so they must exist before the first frame
   * draws. A bare geometry has no `instanceStart`/`instanceEnd` yet, and the
   * missing attribute collapses to a scalar 0.0 in the generated shader rather
   * than failing loudly.
   *
   * `bundle` is a DEPENDENCY even though nothing here reads it. Toggling the
   * colorBy column rebuilds the material and therefore the `Line2`, while the
   * geometry object survives — so without this the new line would be handed a
   * geometry whose attributes were uploaded against the old material's
   * pipeline, and the WebGPU failure mode for that is drawing nothing, with no
   * error. Re-uploading is idempotent; not re-uploading is silent.
   */
  useLayoutEffect(() => {
    if (!geometry || geometry.segmentCount === 0) return;
    lineGeometry.setPositions(geometry.pairs);

    // Per-segment attributes the material reads by name. One value per
    // INSTANCE: the geometry is instanced, so a plain InstancedBufferAttribute
    // is one scalar per segment.
    const times = geometry.times ?? new Float32Array(geometry.segmentCount);
    const values = geometry.values ?? new Float32Array(geometry.segmentCount);
    lineGeometry.setAttribute("instanceT", new THREE.InstancedBufferAttribute(times, 1));
    lineGeometry.setAttribute("instanceValue", new THREE.InstancedBufferAttribute(values, 1));
    lineGeometry.instanceCount = geometry.segmentCount;
    invalidate();
  }, [geometry, lineGeometry, bundle, invalidate]);

  // ------------------------------------------------------------- appearance
  useEffect(() => {
    const span = valueSpanOf(geometry?.values ?? null);
    bundle.nodes.uClimMin.value = span.min;
    bundle.nodes.uClimMax.value = span.max;
    bundle.nodes.uOpacity.value = layer.opacity ?? 1;
    bundle.nodes.uColorize.value = layer.colorByColumn && geometry?.values ? 1 : 0;
    setTrackPalette(
      bundle.nodes,
      paletteRowFor((layer.colormap ?? DEFAULT_MEASURE_COLORMAP) as never),
    );
    bundle.material.linewidth = layer.lineWidth ?? 1;
    invalidate();
  }, [bundle, geometry, layer.opacity, layer.colormap, layer.colorByColumn, layer.lineWidth, invalidate]);

  // ------------------------------------------------------------------- time
  const tailWindow = useSceneStore(
    (s) => s.trackTailWindows[layer.id] ?? DEFAULT_TAIL_WINDOW,
  );

  /**
   * The current timepoint, bound IMPERATIVELY.
   *
   * P17 (`ARCHITECTURE.md`): React-subscribed store fields may only change at UI
   * cadence, and `dimSelections` does not — `AnimationPlayer` writes
   * `setDimSelection` from inside `useFrame` while a camera tour plays, so a
   * `useViewerStore((s) => s.dimSelections)` selector here would re-render this
   * layer at frame rate.
   *
   * The latch is on THIS layer's timepoint, not on the `dimSelections` object.
   * It used to be the object: a fresh one is allocated on every real change,
   * so scrubbing an unrelated dim (a `c` slider in a scene that also holds
   * tracks) rewrote both uniforms and requested a frame for nothing. The point
   * layer, which this was copied from, already compared `[TIME_DIM]`.
   */
  const viewerApi = useViewerStoreApi();
  useEffect(() => {
    // Both the segment times and the slider are INDICES into this timeline —
    // see `TrackGeometry.timeline` for why the raw t values are resolved away.
    const maxIndex = geometry?.timeline ? geometry.timeline.length - 1 : null;
    return bindField(
      viewerApi,
      (state) => state.dimSelections[TIME_DIM],
      (selected) => {
        // No t column means no tail: a non-positive window is the material's
        // "draw the trajectory whole" sentinel.
        bundle.nodes.uTailWindow.value = maxIndex === null ? 0 : tailWindow;
        if (maxIndex === null) return;
        // Absent selection = the end of the data, so a scene with no T slider
        // still draws the full trajectories rather than an empty viewport.
        bundle.nodes.uCurrentT.value =
          selected === undefined ? maxIndex : Math.max(0, Math.min(maxIndex, Math.round(selected)));
        invalidate();
      },
    );
  }, [bundle, geometry, tailWindow, invalidate, viewerApi]);

  /**
   * Publish the observed time span so a T slider can exist at all.
   *
   * A track layer has no lens: its time is a parquet COLUMN, and its timeline is
   * unknowable until the scan returns — which is why this is published rather
   * than derived from the fragment the way a lens-backed layer's dims are.
   * Without it a scene containing only tracks shows no T slider and the tail
   * cannot be scrubbed.
   *
   * The default index is the END of the timeline, not 0: a track with no
   * selection draws its whole trajectory, and opening a scene on an empty
   * viewport reads as a broken layer. Stating it here is what keeps that out of
   * the panel as a special case.
   *
   * Null while hidden — a hidden layer must not keep a slider alive.
   */
  const timeExtents = useMemo((): DimExtent[] | null => {
    const timeline = geometry?.timeline ?? null;
    if (!timeline || layer.visible === false) return null;
    const maxIndex = timeline.length - 1;
    return [{ dim: TIME_DIM, maxIndex, defaultIndex: maxIndex }];
  }, [geometry, layer.visible]);
  usePublishDimExtents(layer.id, timeExtents);

  if (layer.visible === false) return null;
  // Never mount a Line2 whose geometry has no segments: the shader would be
  // built against a geometry with no instanceStart/instanceEnd.
  if (!geometry || geometry.segmentCount === 0) return null;

  return (
    <group matrix={affine} matrixAutoUpdate={false}>
      {/* renderOrder 3: the scene-data band is 0-2 (image 1, mask 2), and a
          trajectory reads as drawn OVER its image. Above that, 4-11, is UI
          furniture, which this is not. */}
      <primitive object={line} renderOrder={3} />
    </group>
  );
};
