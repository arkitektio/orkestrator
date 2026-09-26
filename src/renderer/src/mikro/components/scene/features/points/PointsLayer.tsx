/**
 * A point cloud drawn from a table dataset.
 *
 * The layer kind the backend has had all along and nothing drew: `PointLayerRenderer` was
 * `() => null` in the old `stubs.tsx` (since deleted), registered so that implementing it
 * later would be a
 * one-component change. This is that change.
 *
 * It is also the third and last way a sparse dataset gets drawn. Its object axis is identified
 * by a `DATASET` (a mask -> the label layer), a `MESH_COLLECTION` (-> the mesh layer) or a
 * `TABLE` -- and a table's rows have positions and nothing else, so until now they had no
 * renderer. See `docs/visualising-a-sparse-dataset.md`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

import { useDatalayerEndpoint } from "@/core/connection/arkitekt/host";
import { useMikro } from "@/mikro/api/funcs";
import { useAttributeServiceOrNull } from "@/mikro/lib/attributes/AttributeServiceProvider";
import { loadSparseSource } from "@/mikro/lib/sparse/sparseSource";
import { readColumnByObjectIdBatchedCached } from "../../platform/attributes/columnValueCache";
import { accessForTable } from "../../platform/attributes/columnLut";
import { paletteRowFor, DEFAULT_MEASURE_COLORMAP } from "../../platform/attributes/valueLut";
import { isColumnColorBy } from "../../platform/layerui/columnOptions";
import type { SceneLayerFragment } from "@/mikro/api/graphql";
import { TIME_DIM, type DimExtent } from "../../platform/model/dimExtents";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { usePublishDimExtents } from "../../platform/stores/useLayerDimExtents";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";
import { useViewStoreApi } from "../../platform/stores/viewStore";
import type { FrustumClipCoordinateSystem } from "../../platform/visibility/frustumClip";
import { placementToSpatialAffine, spatialAxisTriple } from "@/core/data/scene/coords/transformGraph";
import { affineToMatrix4 } from "../../platform/coords/worldTransform";
import { StorageInstancedBufferAttribute } from "three/webgpu";
import { createPointMaterial, setPointValues, type PointMaterialBundle } from "./pointsMaterial";
import {
  createCullPass,
  createScatterPass,
  loadScatterPairs,
  storageAttributeReleaser,
  VERTICES_PER_POINT,
  type PointCull,
  type PointScatter,
} from "./pointsCompute";
import {
  pointCullBox,
  pointDataBounds,
  sameCullBox,
  UNBOUNDED_CULL_BOX,
  type CullBox,
} from "./pointsCullBounds";
import { fillPointFilterMask } from "./pointsFilterMask";
import { loadPointGeometry, scatterPointValues, type PointGeometry } from "./pointsSource";
import { valueWindowOf } from "../../platform/attributes/valueWindow";
import { bindField } from "@/core/data/scene/stores/bindStore";
import { useActivePickers } from "../../platform/attributes/useActivePickers";

export const PointLayerRenderer = ({ layerId }: { layerId: string }) => {
  const layer = useSceneStore((s) => s.sceneLayers.find((candidate) => candidate.id === layerId));
  if (!layer || layer.__typename !== "PointLayer") return null;
  if (!layer.tableDataset) return null;
  return <PointCloud layer={layer} />;
};

type PointLayerView = Extract<SceneLayerFragment, { __typename?: "PointLayer" }>;

const PointCloud = ({ layer }: { layer: PointLayerView }) => {
  const invalidate = useThree((state) => state.invalidate);
  // The WebGPU renderer, for the compute dispatches. `computeAsync` is the documented entry.
  const renderer = useThree((state) => state.gl) as unknown as {
    computeAsync: (node: unknown) => Promise<void>;
  };
  // The live camera, read at cull time rather than subscribed to.
  const getThree = useThree((state) => state.get);
  const service = useAttributeServiceOrNull();
  const client = useMikro();
  const datalayer = useDatalayerEndpoint();

  const [geometry, setGeometry] = useState<PointGeometry | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const bundleRef = useRef<PointMaterialBundle | null>(null);
  const cullRef = useRef<PointCull | null>(null);
  const scatterRef = useRef<PointScatter | null>(null);
  const [bundle, setBundle] = useState<PointMaterialBundle | null>(null);
  /** The layer's group: its `matrixWorld` is what carries the frustum into data space. */
  const groupRef = useRef<THREE.Group | null>(null);
  /** The box the cull uniforms currently hold, so a camera emission that does not move it
   *  costs no dispatch. */
  const appliedBoxRef = useRef<CullBox | null>(null);

  // The world's own axis order, needed to read `asAffine`'s ROWS. Not the
  // scene's spatial unit — the names, which mikro writes with x last.
  const worldSystem = useSceneStore((s) => s.transformContext.worldCoordinateSystem);

  /**
   * `asAffine` is `M × (N+1)` over NAMED axes, and both sides need naming
   * separately here:
   *  - COLUMNS are the table's coordinate columns (`TableDataset.coordinateSystem`
   *    — "its axes are the table's coordinate columns"), and which of them is
   *    x/y/z is this layer's own `xColumn`/`yColumn`/`zColumn`. That is also
   *    the order `loadPointGeometry` writes the position buffer in.
   *  - ROWS are the world's axes, in the world's order, and only the ones the
   *    registration constrains.
   * Addressing either side by POSITION transposes the placement, and clamping
   * the translation to column 3 drops it into the z basis on a 2D layer, where
   * z=0 multiplies it away.
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

  const { colorBy, rules: activeRules } = useActivePickers(layer);

  // ------------------------------------------------------------------ positions
  // Read ONCE per table. Positions do not change with a colouring, and re-reading them on every
  // gene switch is the cost this split exists to avoid.
  useEffect(() => {
    const engine = service?.engine;
    if (!engine || !layer.xColumn || !layer.yColumn || !layer.idColumn) return;
    let cancelled = false;
    void loadPointGeometry(engine, layer.tableDataset.store as never, {
      key: layer.idColumn,
      x: layer.xColumn,
      y: layer.yColumn,
      z: layer.zColumn ?? null,
      t: layer.tColumn ?? null,
    })
      .then((read) => {
        if (cancelled || !read) return;
        if ("error" in read) {
          setSkipped([read.error]);
          return;
        }
        setSkipped([]);
        setGeometry(read);
      })
      .catch((error: unknown) => {
        if (!cancelled) console.warn("[points] could not read the positions:", error);
      });
    return () => {
      cancelled = true;
    };
  }, [
    service,
    layer.tableDataset.store,
    layer.xColumn,
    layer.yColumn,
    layer.zColumn,
    layer.tColumn,
    layer.idColumn,
  ]);

  // ------------------------------------------------------------------ the mesh
  useEffect(() => {
    if (!geometry) return;
    // The cull pass first: the material reads through its survivor list, so the two are built
    // together or the draw indexes the wrong points. ONE position buffer, read by both — the
    // layer owns it and frees it below; neither the pass nor the material does.
    const positions = new StorageInstancedBufferAttribute(geometry.positions, geometry.stride);
    const times = geometry.times ? new StorageInstancedBufferAttribute(geometry.times, 1) : null;
    const culling = createCullPass(positions, geometry.count, geometry.stride, times);
    const made = createPointMaterial(
      positions,
      new Float32Array(geometry.count),
      geometry.stride,
      { attribute: culling.visible, count: geometry.count },
      culling.mask,
    );
    // Capacity is the point count: the worst slice a dataset can produce mentions every object,
    // and a buffer sized for the common case would refuse exactly the dense genes.
    const scattering = createScatterPass(made.values, geometry.count, geometry.count);
    bundleRef.current = made;
    cullRef.current = culling;
    scatterRef.current = scattering;
    appliedBoxRef.current = null;
    setBundle(made);
    return () => {
      // Three frees none of these storage buffers on its own (see `storageAttributeReleaser`),
      // so without this every geometry change leaked a full set of them.
      const release = storageAttributeReleaser(renderer);
      scattering.dispose(release);
      culling.dispose(release);
      made.dispose(release);
      release(positions);
      if (times) release(times);
      bundleRef.current = null;
      cullRef.current = null;
      scatterRef.current = null;
      appliedBoxRef.current = null;
      setBundle(null);
    };
    // `renderer` is the canvas's for the component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry]);

  // ------------------------------------------------------------------ the colouring
  // Keyed on what the colouring READS, not on how it is drawn — the appearance effect below is
  // the one that runs when a colormap or a window moves.
  const dataKey = useMemo(
    () =>
      JSON.stringify(
        colorBy && {
          table: (colorBy as { table?: string }).table ?? null,
          column: (colorBy as { column?: string }).column ?? null,
          dataset: (colorBy as { dataset?: string }).dataset ?? null,
          at: (colorBy as { at?: unknown }).at ?? null,
        },
      ),
    [colorBy],
  );

  useEffect(() => {
    const engine = service?.engine;
    const current = bundleRef.current;
    if (!engine || !geometry || !current) return;
    let cancelled = false;

    void (async () => {
      if (!colorBy) {
        setPointValues(current, new Float32Array(geometry.count), { valueMin: 0, valueMax: 1 });
        current.nodes.uColorize.value = 0;
        invalidate();
        return;
      }

      let byId: Map<number, unknown> = new Map();
      if (isColumnColorBy(colorBy)) {
        // A point layer's objects ARE rows of its own table, so the value is read from it
        // directly — no FIELD edge and no attribute plan, which is the whole difference from
        // a mask or a collection.
        const access =
          (colorBy as { table?: string }).table === layer.tableDataset.id
            ? { store: layer.tableDataset.store as never, keyColumn: layer.idColumn as string }
            : accessForTable([], (colorBy as { table: string }).table, { kind: "mesh" });
        if (!access) return;
        byId = await readColumnByObjectIdBatchedCached(engine, access, (colorBy as { column: string }).column);
      } else if (datalayer) {
        const sparse = await loadSparseSource(client, datalayer, (colorBy as { dataset: string }).dataset);
        const read = await sparse.read(
          sparse.source,
          ((colorBy as { at?: { axis: string; value: number }[] }).at ?? []).map((position) => ({
            axis: position.axis,
            value: position.value,
          })),
        );
        byId = read.values as Map<number, unknown>;
      }
      if (cancelled) return;

      const window = valueWindowOf(byId, colorBy as never);
      const scattering = scatterRef.current;
      if (scattering) {
        // The GPU path: upload only the pairs the colouring actually carries and let a compute
        // pass write them. JS never allocates or fills a per-point array, which at a million
        // points is the difference between a switch and a stall.
        const pairs: [number, number][] = [];
        for (const [objectId, raw] of byId) {
          const slot = geometry.slotOf(objectId);
          const value = Number(raw);
          if (slot >= 0 && Number.isFinite(value)) pairs.push([slot, value]);
        }
        if (loadScatterPairs(scattering, pairs, window.valueMin)) {
          void renderer.computeAsync(scattering.node as never);
          current.nodes.uValueMin.value = window.valueMin;
          current.nodes.uValueMax.value = window.valueMax;
          current.nodes.uColorize.value = 1;
          invalidate();
          return;
        }
      }
      // Fallback: a slice larger than the scatter capacity, or no pass built. Correct, just
      // paid for on the CPU.
      const painted = scatterPointValues(geometry, byId, colorBy as never);
      setPointValues(current, painted.values, painted);
      current.nodes.uColorize.value = 1;
      invalidate();
    })().catch((error: unknown) => {
      if (!cancelled) console.warn("[points] could not resolve the colouring:", error);
    });

    return () => {
      cancelled = true;
    };
    // `colorBy` is read inside; `dataKey` decides whether this re-runs, and `client`/`datalayer`
    // are infrastructure that would otherwise rebuild on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, geometry, bundle, dataKey, invalidate]);

  // ------------------------------------------------------------------ appearance
  // Two uniform writes and a 1 KB palette row. Never touches a buffer.
  useEffect(() => {
    const current = bundleRef.current;
    if (!current) return;
    const colormap = ((colorBy as { colormap?: string } | null)?.colormap ??
      layer.colormap ??
      DEFAULT_MEASURE_COLORMAP) as never;
    current.setPalette(paletteRowFor(colormap));
    current.nodes.uClimMin.value =
      (colorBy as { min?: number | null } | null)?.min ?? Number.NEGATIVE_INFINITY;
    current.nodes.uClimMax.value =
      (colorBy as { max?: number | null } | null)?.max ?? Number.POSITIVE_INFINITY;
    current.nodes.uPointSize.value = layer.pointSize ?? 3;
    current.nodes.uOpacity.value = layer.opacity ?? 1;
    invalidate();
  }, [bundle, colorBy, layer.colormap, layer.pointSize, layer.opacity, invalidate]);

  // ------------------------------------------------------------------ culling
  const dataBounds = useMemo(
    () => (geometry ? pointDataBounds(geometry.positions, geometry.stride, geometry.count) : null),
    [geometry],
  );
  const viewApi = useViewStoreApi();
  // Read at cull time, so a size change needs a re-cull but no new callback.
  const pointSizeRef = useRef(layer.pointSize ?? 3);
  pointSizeRef.current = layer.pointSize ?? 3;
  const viewProjectionRef = useRef(new THREE.Matrix4());

  /**
   * The box the cull should hold NOW, in the data's own space (`pointsCullBounds.ts`).
   * Unbounded while the camera is flagged moving: emissions are throttled, so a tight box
   * would trail the view by up to a throttle interval and pop points in at the edges exactly
   * while the user watches them. Culling is for the view at rest. Also unbounded before the
   * group has mounted — nothing to place the frustum against yet.
   */
  const viewCullBox = useCallback((): CullBox => {
    const group = groupRef.current;
    if (!group || viewApi.getState().cameraMoving) return UNBOUNDED_CULL_BOX;
    const camera = getThree().camera;
    group.updateWorldMatrix(true, false);
    return pointCullBox({
      viewProjection: viewProjectionRef.current.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      ),
      model: group.matrixWorld,
      dataBounds,
      pointSize: pointSizeRef.current,
      coordinateSystem: camera.coordinateSystem as FrustumClipCoordinateSystem,
    });
  }, [viewApi, getThree, dataBounds]);

  /** Writes the box into the cull uniforms; true when it moved. */
  const applyCullBox = useCallback(
    (culling: PointCull, box: CullBox): boolean => {
      if (sameCullBox(appliedBoxRef.current, box)) return false;
      // Mutate the uniform vectors in place: assigning a NEW object to a
      // uniform's `.value` makes the backend re-resolve the binding on every
      // cull (view move / time scrub).
      const min = culling.bounds.min.value as THREE.Vector3 | undefined;
      if (min && typeof min.set === "function") min.set(box.min[0], box.min[1], box.min[2]);
      else culling.bounds.min.value = new THREE.Vector3(box.min[0], box.min[1], box.min[2]);
      const max = culling.bounds.max.value as THREE.Vector3 | undefined;
      if (max && typeof max.set === "function") max.set(box.max[0], box.max[1], box.max[2]);
      else culling.bounds.max.value = new THREE.Vector3(box.max[0], box.max[1], box.max[2]);
      appliedBoxRef.current = box;
      return true;
    },
    [],
  );

  /**
   * Re-dispatch the cull pass. Called when the time scrubber or a filter moves — which change
   * which points survive whatever the box — and refreshes the box on the way.
   */
  const runCull = useCallback(() => {
    const culling = cullRef.current;
    if (!culling) return;
    applyCullBox(culling, viewCullBox());
    void renderer.computeAsync(culling.node as never).then(() => invalidate());
  }, [renderer, invalidate, applyCullBox, viewCullBox]);

  // ------------------------------------------------------------------ filters
  // The stored `filterBys`, applied at last: resolved to a per-point uint mask
  // (`pointsFilterMask.ts`) the cull pass ANDs into its predicate. A rule
  // change is one O(N) CPU refill, a buffer update and one cull dispatch — no
  // geometry rebuild, no re-scatter; the columns ride the same batched cache
  // the colouring reads through. A CONTENT key, for the reason `dataKey` is.
  const filterKey = useMemo(() => JSON.stringify(activeRules), [activeRules]);

  useEffect(() => {
    const culling = cullRef.current;
    if (!geometry || !culling) return;
    const mask = culling.mask.array as Uint32Array;
    if (activeRules.length === 0) {
      mask.fill(1);
      culling.mask.needsUpdate = true;
      runCull();
      return;
    }
    let cancelled = false;
    void (async () => {
      const notApplied: string[] = [];
      const ruleValues = await Promise.all(
        activeRules.map(async (rule): Promise<Map<number, unknown> | null> => {
          // A SPARSE rule reads one slice of a matrix — no SQL in that path.
          if (rule.dataset != null) {
            if (!datalayer) {
              notApplied.push(`rule over matrix ${rule.dataset}: no datalayer connection`);
              return null;
            }
            try {
              const source = await loadSparseSource(client, datalayer, rule.dataset);
              const read = await source.read(
                source.source,
                (rule.at ?? []).map((position) => ({ axis: position.axis, value: position.value })),
              );
              return read.values as Map<number, unknown>;
            } catch (error) {
              notApplied.push(
                `rule over matrix ${rule.dataset}: ${error instanceof Error ? error.message : String(error)}`,
              );
              return null;
            }
          }
          // A point layer's objects ARE rows of its own table — the same
          // direct access the colouring takes, and the same limitation: a
          // rule over another table or through a join has no plan to reach it.
          const engine = service?.engine;
          if (
            !engine ||
            !rule.column ||
            rule.table !== layer.tableDataset.id ||
            (rule.joinPath?.length ?? 0) > 0
          ) {
            notApplied.push(
              `rule over ${rule.column ?? "?"}: only this table's own columns are readable here`,
            );
            return null;
          }
          try {
            return await readColumnByObjectIdBatchedCached(
              engine,
              { store: layer.tableDataset.store as never, keyColumn: layer.idColumn as string },
              rule.column,
            );
          } catch (error) {
            notApplied.push(
              `rule over ${rule.column}: ${error instanceof Error ? error.message : String(error)}`,
            );
            return null;
          }
        }),
      );
      // The cancel check comes BEFORE the mask write: a superseded build must
      // not overwrite the bytes the live dispatch reads.
      if (cancelled) return;
      if (notApplied.length > 0) {
        console.warn("[points] rules that do not apply yet:", notApplied);
      }
      fillPointFilterMask(mask, geometry.count, activeRules, ruleValues, geometry.slotOf);
      culling.mask.needsUpdate = true;
      runCull();
      invalidate();
    })().catch((error: unknown) => {
      if (!cancelled) console.warn("[points] could not resolve the filters:", error);
    });
    return () => {
      cancelled = true;
    };
    // `activeRules` is read inside; `filterKey` decides re-runs. `client` and
    // `datalayer` are infrastructure, per the colouring effect's note.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, geometry, bundle, filterKey, runCull, invalidate]);

  // Re-run when the placement or the point size moves (both change the box), and once the
  // group has mounted so the first box is a real one.
  useEffect(() => {
    if (!geometry) return;
    runCull();
    // `runCull` is stable infrastructure; these are what re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry, bundle, affine, layer.pointSize, layer.visible]);

  // Re-run when the view moves, not every frame: on the view store's throttled camera
  // emissions, and only when the box they imply actually moved — a dispatch per frame would
  // spend more than the culling saves at the sizes this layer is capped to. A plain store
  // subscription, so a camera gesture never re-renders this layer.
  useEffect(() => {
    if (!bundle) return;
    let lastMatrix = viewApi.getState().viewProjectionMatrix;
    let lastMoving = viewApi.getState().cameraMoving;
    return viewApi.subscribe((state) => {
      if (state.viewProjectionMatrix === lastMatrix && state.cameraMoving === lastMoving) return;
      lastMatrix = state.viewProjectionMatrix;
      lastMoving = state.cameraMoving;
      const culling = cullRef.current;
      if (!culling || !applyCullBox(culling, viewCullBox())) return;
      void renderer.computeAsync(culling.node as never).then(() => invalidate());
    });
  }, [bundle, viewApi, applyCullBox, viewCullBox, renderer, invalidate]);

  /**
   * The timepoint, read IMPERATIVELY, exactly as the tracks layer reads it.
   *
   * P17 (`ARCHITECTURE.md`): `AnimationPlayer` writes `setDimSelection` from
   * inside `useFrame` while a camera tour plays, so a
   * `useViewerStore((s) => s.dimSelections)` selector here would re-render this
   * layer at frame rate. `bindField` latches on THIS layer's timepoint and
   * writes the uniforms imperatively, touching React not at all.
   *
   * The window is ONE timepoint wide: a point cloud is a snapshot, not a
   * trajectory, so there is no tail to fade the way a track has one. With no
   * selection every timepoint is shown — a layer whose slider has never moved
   * must not open empty.
   */
  const viewerApi = useViewerStoreApi();
  useEffect(() => {
    const culling = cullRef.current;
    const timeline = geometry?.timeline ?? null;
    if (!culling || !timeline) return;
    const maxIndex = timeline.length - 1;

    return bindField(
      viewerApi,
      (state) => state.dimSelections[TIME_DIM],
      (selected) => {
        if (selected === undefined) {
          culling.time.min.value = -Infinity;
          culling.time.max.value = Infinity;
        } else {
          const index = Math.max(0, Math.min(maxIndex, Math.round(selected)));
          culling.time.min.value = index;
          culling.time.max.value = index;
        }
        runCull();
      },
    );
  }, [geometry, bundle, viewerApi, runCull]);

  /**
   * Publish the observed timeline so a T slider can exist at all — the same rail
   * the tracks layer publishes on, and for the same reason: a point table's time
   * is a COLUMN, and its timeline is unknowable until the scan returns.
   *
   * Unlike a track, the default is index 0 rather than the end: with no selection
   * the cull window is unbounded and every timepoint draws, so the default only
   * says where a slider first lands.
   */
  const timeExtents = useMemo((): DimExtent[] | null => {
    const timeline = geometry?.timeline ?? null;
    if (!timeline || layer.visible === false) return null;
    return [{ dim: TIME_DIM, maxIndex: timeline.length - 1, defaultIndex: 0 }];
  }, [geometry, layer.visible]);
  usePublishDimExtents(layer.id, timeExtents);

  useEffect(() => {
    if (skipped.length > 0) console.warn("[points] not drawn:", skipped);
  }, [skipped]);

  // A world-space point size is a well-defined length only from SIMILARITY up; below it the
  // number still draws but means nothing, so say so rather than implying a scale.
  useEffect(() => {
    const invariance = layer.placementInvariance;
    if (invariance && invariance !== "ISOMETRY" && invariance !== "SIMILARITY") {
      console.warn(
        `[points] this layer's placement is ${invariance}, so 'pointSize' in scene units is not a well-defined length here`,
      );
    }
  }, [layer.placementInvariance]);

  if (layer.visible === false || !bundle || !geometry) return null;

  return (
    <group ref={groupRef} matrix={affine} matrixAutoUpdate={false}>
      <mesh
        frustumCulled={false}
        // Six vertices per instance, one instance per point. The geometry carries no
        // attributes: the corner comes from `vertexIndex` and the position from a storage
        // buffer indexed by `instanceIndex`.
        args={[undefined, bundle.material]}
      >
        <bufferGeometry
          ref={(node) => {
            if (!node) return;
            node.setDrawRange(0, VERTICES_PER_POINT);
            // The cull pass writes `instanceCount` into the indirect buffer, so the GPU decides
            // how many points to draw. `instanceCount` here is only the ceiling.
            const culling = cullRef.current;
            if (culling) node.setIndirect(culling.indirect);
            (node as unknown as { instanceCount: number }).instanceCount = bundle.count;
          }}
        />
      </mesh>
    </group>
  );
};
