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

import { useDatalayerEndpoint, useMikro } from "@/app/Arkitekt";
import { useAttributeServiceOrNull } from "@/mikro-next/lib/attributes/AttributeServiceProvider";
import { loadSparseSource } from "@/mikro-next/lib/sparse/sparseSource";
import { readColumnByObjectIdBatchedCached } from "../../platform/attributes/columnValueCache";
import { accessForTable } from "../../platform/attributes/columnLut";
import { paletteRowFor, DEFAULT_MEASURE_COLORMAP } from "../../platform/attributes/valueLut";
import { isColumnColorBy } from "../../platform/layerui/columnOptions";
import type { SceneLayerFragment } from "@/mikro-next/api/graphql";
import { TIME_DIM, type DimExtent } from "../../platform/model/dimExtents";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { usePublishDimExtents } from "../../platform/stores/useLayerDimExtents";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";
import { placementToSpatialAffine, spatialAxisTriple } from "@/mikro-next/lib/coords/transformGraph";
import { affineToMatrix4 } from "../../platform/coords/worldTransform";
import { StorageInstancedBufferAttribute } from "three/webgpu";
import { createPointMaterial, setPointValues, type PointMaterialBundle } from "./pointsMaterial";
import {
  createCullPass,
  createScatterPass,
  loadScatterPairs,
  VERTICES_PER_POINT,
  type PointCull,
  type PointScatter,
} from "./pointsCompute";
import { fillPointFilterMask } from "./pointsFilterMask";
import { loadPointGeometry, scatterPointValues, type PointGeometry } from "./pointsSource";
import { valueWindowOf } from "../../platform/attributes/valueWindow";
import { bindField } from "../../platform/stores/bindStore";
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
  const service = useAttributeServiceOrNull();
  const client = useMikro();
  const datalayer = useDatalayerEndpoint();

  const [geometry, setGeometry] = useState<PointGeometry | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const bundleRef = useRef<PointMaterialBundle | null>(null);
  const cullRef = useRef<PointCull | null>(null);
  const scatterRef = useRef<PointScatter | null>(null);
  const [bundle, setBundle] = useState<PointMaterialBundle | null>(null);


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
    // together or the draw indexes the wrong points.
    const culling = createCullPass(
      // The material owns the position buffer, so it is created first and handed over.
      new StorageInstancedBufferAttribute(geometry.positions, geometry.stride),
      geometry.count,
      geometry.stride,
      geometry.times ? new StorageInstancedBufferAttribute(geometry.times, 1) : null,
    );
    const made = createPointMaterial(
      geometry.positions,
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
    setBundle(made);
    return () => {
      made.dispose();
      bundleRef.current = null;
      cullRef.current = null;
      scatterRef.current = null;
      setBundle(null);
    };
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
  /**
   * Re-dispatch the cull pass. Called when the view moves and when the time
   * scrubber moves — both change which points survive, neither changes a buffer.
   */
  const runCull = useCallback(() => {
    const culling = cullRef.current;
    if (!culling) return;
    // The box is in the DATA's own space, because the layer's affine sits between it and the
    // world -- testing in world space would need the inverse per point. Unbounded until a
    // viewport box is threaded through, at which point this is the one place to set it.
    // Mutate the uniform vectors in place: assigning a NEW object to a
    // uniform's `.value` makes the backend re-resolve the binding on every
    // cull (view move / time scrub), and these are constants.
    const min = culling.bounds.min.value as THREE.Vector3 | undefined;
    if (min && typeof min.set === "function") min.set(-Infinity, -Infinity, -Infinity);
    else culling.bounds.min.value = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    const max = culling.bounds.max.value as THREE.Vector3 | undefined;
    if (max && typeof max.set === "function") max.set(Infinity, Infinity, Infinity);
    else culling.bounds.max.value = new THREE.Vector3(Infinity, Infinity, Infinity);
    void renderer.computeAsync(culling.node as never).then(() => invalidate());
  }, [renderer, invalidate]);

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

  // Re-run when the view moves, not every frame: the survivor list is only wrong once the
  // camera has actually changed what is on screen, and a dispatch per frame would spend more
  // than the culling saves at the sizes this layer is capped to.
  const cullBounds = useSceneStore((s) => s.transformContext);
  useEffect(() => {
    if (!geometry) return;
    runCull();
    // `runCull` is stable infrastructure; the view is what re-runs this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry, bundle, cullBounds]);

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
    <group matrix={affine} matrixAutoUpdate={false}>
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
