import { effectiveFlatNormals } from "./meshLayerDefaults";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/** Scratch for the per-pointer-move hit transform (never escapes the handler). */
const hitScratch = new THREE.Vector3();
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

import { useDatalayerEndpoint, useMikro } from "@/app/Arkitekt";

import { createRafCoalescer } from "../../platform/perf/rafCoalesce";
import { sceneZExtent } from "../../platform/coords/worldTransform";
import { useModeStore } from "../../platform/stores/modeStore";
import { isDrawingTool, useRoiDrawingStore } from "../annotations/roiDrawingStore";
import { perfMonitor } from "../../platform/perf/perfMonitor";
import {
  clickProbeEnabled,
  hoverProbeEnabled,
  type ProbeGateInput,
} from "../../platform/probe/probeGating";
import { useSceneStore, type MeshLayerSessionState } from "../../platform/stores/sceneStore";

import { useViewStoreApi } from "../../platform/stores/viewStore";
import { FabriksCollection } from "./fabriks/fabriksCollection";
import { FabriksCollectionManager } from "./fabriks/fabriksManager";
import { openFabriksCollection } from "./fabriks/fabriksSource";
import { buildColorLut, composeMeshLutAppearance } from "./fabriks/fabriksColorLut";
import type { ValueLutArena, ValueLutWindow } from "../../platform/attributes/valueLut";
import { loadSparseSource, makeSparseReader } from "@/mikro-next/lib/sparse/sparseSource";
import { useAttributeServiceOrNull } from "@/mikro-next/lib/attributes/AttributeServiceProvider";
import {
  type MeshCollectionRef,
  type MeshLayerVariant,
} from "../../platform/model/collectionPlacement";
import { useMeshStoreApi } from "./store/meshSlice";
import { createLeadingThrottle } from "../../platform/perf/leadingThrottle";
import { useActivePickers } from "../../platform/attributes/useActivePickers";
import { usePickerResolution } from "../../platform/attributes/pickerResolution";
import { useCollectionDriver } from "../../platform/collections/useCollectionDriver";
import {
  collectionSlabThickness,
  useCollectionPlacement,
} from "../../platform/collections/useCollectionPlacement";


/**
 * How long the streaming stats bump is held back. Matches the network layer's
 * (and vice versa): both publish a debug-only version counter from the same
 * kind of load loop, and a shared number is one fewer thing to wonder about.
 */
const STATS_THROTTLE_MS = 120;

/**
 * MeshLayer renderer: a fabriks collection — a self-describing prefix of
 * Parquet files — streamed by row group and placed by its own `pathToWorld`
 * composed through the scene's transform graph, nothing else
 * (`collectionPlacement.ts`; COORDINATE_SYSTEMS.md "Coordinate conventions").
 *
 * The React layer owns only lifecycle, transform resolution and the settle
 * cadence. Planning and streaming live in `FabriksCollectionManager`
 * (imperative — no React re-render per batch, OCTREE_RENDERER.md P17), the
 * read plan in `FabriksCollection`, and the byte contract in `fabriksDecode`.
 */

export const FabriksCollectionLayer = ({ layerId }: { layerId: string }) => {
  const layer = useSceneStore((s) =>
    s.sceneLayers.find((candidate) => candidate.id === layerId),
  );
  if (!layer || layer.__typename !== "MeshLayer") return null;
  if (!layer.collection) return null;
  // `visible: false` stays MOUNTED: the group survives with its manager, so
  // the open footers, byte cache and geometry LRU are all still warm and a
  // re-show is a cache replay, not a re-download. (It used to unmount here,
  // which disposed everything and made hide/show the most expensive toggle on
  // the card.) The manager stops planning while hidden — see `setVisible`.
  return <FabriksCollectionGroup layer={layer} collection={layer.collection} />;
};

/** The fragment plus the card's session-local render state. */
type MeshLayerView = MeshLayerVariant & MeshLayerSessionState;

/**
 * The card's LOD presets → the planner's pixel-error budget.
 *
 * Deliberately loose: mesh surfaces read fine at 2-4 px of screen-space error,
 * and every extra pixel of tolerance settles regions coarser — fewer cells
 * fetched, fewer indices resident. "fine" is for close inspection, not the
 * default; layers without an explicit preset get "balanced".
 */
const DETAIL_BUDGETS = { fine: 2, balanced: 4, fast: 8 } as const;

const FabriksCollectionGroup = ({
  layer,
  collection,
}: {
  layer: MeshLayerView;
  collection: MeshCollectionRef;
}) => {
  const rawInvalidate = useThree((state) => state.invalidate);
  const transformContext = useSceneStore((s) => s.transformContext);
  const viewApi = useViewStoreApi();
  const viewerApi = useMeshStoreApi();
  /**
   * Every manager-driven change goes through here — a landed LOD cell, a
   * material flip, the slab clip, visibility.
   *
   * The bump is NOT optional bookkeeping: an OPAQUE fabriks mesh is a volume
   * OCCLUDER (`platform/visibility/passVisibility.ts`), so its depth feeds the
   * compositor's offscreen depth prepass, and that target is CACHED. A frame
   * request alone leaves `decideVolumeFrame` on "cached" and the volume keeps
   * the stale occlusion until the camera moves — the "I have to pan for it to
   * update" symptom.
   *
   * `buildVolumeStructureKey` now folds the occluder SET, which catches a
   * layer appearing or disappearing; this catches everything inside an
   * unchanged set — cells mounting into the same BatchedMesh under the same
   * material. Same contract as every uniform-write site (OCTREE_RENDERER.md
   * §7 R1).
   */
  const invalidate = useCallback(() => {
    viewerApi.getState().volumeInputs.bump("mesh-collection");
    rawInvalidate();
  }, [viewerApi, rawInvalidate]);
  const datalayer = useDatalayerEndpoint();
  const client = useMikro();

  // Streaming-cadence stats → debug-only `meshVersion`, throttled here so the
  // manager stays cadence-blind and the store sees at most ~8 writes/s (P17).
  const statsThrottle = useMemo(
    () =>
      createLeadingThrottle({
        intervalMs: STATS_THROTTLE_MS,
        run: () => viewerApi.getState().bumpMeshVersion(),
      }),
    [viewerApi],
  );
  // The hand-rolled version this replaced never cancelled: a stats change
  // within one window of unmount fired a timer into a torn-down scoped store.
  useEffect(() => () => statsThrottle.cancel(), [statsThrottle]);
  const onStatsChanged = statsThrottle.trigger;

  // `inverse` is the hook's own scratch matrix, kept current in place: the
  // same object across renders, so the pick closure below reads it live.
  const { matrix, inverse } = useCollectionPlacement(
    layer,
    collection,
    transformContext,
  );

  // Opening reads fabriks.json and nothing else; the catalogs come with the
  // first plan. Collections are immutable per version, so the open survives as
  // long as (collection, version).
  const [opened, setOpened] = useState<FabriksCollection | null>(null);
  useEffect(() => {
    if (!datalayer) return; // no endpoint configured: nothing to read from
    let cancelled = false;
    openFabriksCollection(collection, client, datalayer)
      .then((next) => {
        if (!cancelled) setOpened(next);
      })
      .catch((error) => console.error(`[fabriks] cannot open collection ${collection.id}:`, error));
    return () => {
      cancelled = true;
    };
  }, [collection, client, datalayer]);

  // Keyed on the OPEN alone. A placement change goes through
  // `setVoxelToWorld` below — index rebuild and replan, caches untouched —
  // never through a manager rebuild, which would refetch everything.
  const manager = useMemo(() => {
    if (!opened) return null;
    return new FabriksCollectionManager({
      collection: opened,
      loadDecoder: async () => {
        await MeshoptDecoder.ready;
        return MeshoptDecoder;
      },
      onInvalidate: invalidate,
      onStatsChanged,
    });
  }, [opened, invalidate, onStatsChanged]);

  useEffect(() => () => manager?.dispose(), [manager]);

  // Placement, applied before the first plan (effects run in order) and again
  // on any real change. Value-equal matrices are a no-op inside the manager.
  // Debug registration: DebugPanel reads stats and steers the planner through
  // this handle — the mesh twin of registerBrickSystem.
  useEffect(() => {
    if (!manager) return;
    const { registerMeshSystem, bumpMeshVersion } = viewerApi.getState();
    registerMeshSystem(layer.id, manager);
    bumpMeshVersion();
    return () => {
      viewerApi.getState().registerMeshSystem(layer.id, null);
    };
  }, [manager, viewerApi, layer.id]);

  useEffect(() => {
    manager?.setMaterialConfig({
      color: layer.materialColor,
      wireframe: layer.wireframe,
      opacity: layer.opacity,
      instanceColormap: layer.instanceColormap,
      colorByInstance: layer.colorByInstance,
      doubleSided: layer.doubleSided,
    });
    invalidate();
  }, [
    manager,
    layer.materialColor,
    layer.wireframe,
    layer.opacity,
    layer.instanceColormap,
    layer.colorByInstance,
    layer.doubleSided,
    invalidate,
  ]);

  /**
   * The layer's STORED pickers, resolved to pixels.
   *
   * `colorBys` / `filterBys` are what the layer offers and the two active
   * indices are the choice; everything below the choice — which table, which
   * column, which rows — is data this API never returns. It is read out of the
   * table's parquet with the same DuckDB and the same grants the attribute
   * probe uses, baked into an ordinal-indexed texture
   * (`fabriksColorLut.ts`), and handed to the material as one bind.
   *
   * Nothing active means no LUT at all, not an all-white one: the placeholder
   * is already the identity, and skipping the read is what keeps a layer with
   * no colouring exactly as cheap as it was before any of this existed.
   */
  const attributeService = useAttributeServiceOrNull();
  // Both arms render: a SPARSE colouring names a matrix and a position rather
  // than a table and a column, and is answered from the store directly.
  const {
    colorBy,
    rules: activeRules,
    sparseDatasetId,
    dataKey: lutKey,
    appearanceKey,
  } = useActivePickers(layer);
  const systemId = collection.coordinateSystem?.id ?? null;

  /** The reused table arena, and what the last completed paint derived — the
   *  appearance effect recomposes over it. `dataKey` stamps which build it
   *  belongs to, so a recompose never rides a stale data half. */
  const lutArenaRef = useRef<ValueLutArena | null>(null);
  const lutPaintRef = useRef<{
    dataKey: string;
    window: ValueLutWindow;
    qualitative: boolean;
  } | null>(null);

  const resetLut = useCallback(() => {
    // The manager disposes the bound texture on the way to null, so the arena
    // must not be offered for reuse again.
    lutArenaRef.current = null;
    lutPaintRef.current = null;
    manager?.setColorLut(null, { colorize: false, filter: false });
  }, [manager]);

  /**
   * The DATA half, through the shared lifecycle
   * (`platform/attributes/pickerResolution.ts`). No `dispose`: a prepared
   * build owns no texture — it allocates one only when `paint` runs, which
   * happens inside `apply` and therefore only for the winner.
   */
  usePickerResolution<Awaited<ReturnType<typeof buildColorLut>>>(
    manager && attributeService && systemId && (colorBy || activeRules.length > 0)
      ? `${lutKey}|${sparseDatasetId ?? ""}`
      : null,
    {
      build: async () => {
        // The object catalog is shared with picking, so this is free once
        // anything has resolved an ordinal — and vice versa.
        const [objects, plans] = await Promise.all([
          manager!.listObjects(),
          attributeService!.plansFor(systemId!),
        ]);
        // Fetched here rather than in the builder, so the builder stays free
        // of Apollo — the same seam `readColumn` uses on the column side.
        const sparse =
          sparseDatasetId && datalayer
            ? await loadSparseSource(client, datalayer, sparseDatasetId)
            : null;
        return buildColorLut({
          objects,
          colorBy,
          sparse,
          readSparse: makeSparseReader(client, datalayer),
          filterBys: activeRules,
          plans,
          engine: attributeService!.engine,
        });
      },
      apply: (prepared) => {
        if (prepared.skipped.length > 0) {
          console.warn("[mesh] picker entries that do not render yet:", prepared.skipped);
        }
        // The paint happens HERE, not in `build`, and that placement is the
        // point: it writes into the shared arena, so only a build that is
        // still wanted may run it.
        const { arena, window, qualitative } = prepared.paint(lutArenaRef.current);
        lutArenaRef.current = arena;
        lutPaintRef.current = { dataKey: lutKey, window, qualitative };
        manager!.setColorLut(
          {
            texture: arena.texture,
            width: arena.lut.width,
            height: arena.lut.height,
            window,
          },
          { colorize: colorBy !== null, filter: activeRules.length > 0 },
        );
        manager!.setColorAppearance(composeMeshLutAppearance(colorBy, { window, qualitative }));
        invalidate();
      },
      reset: resetLut,
      onError: (error) => console.warn("[mesh] could not build the colour lookup:", error),
    },
  );

  // The appearance half: colormap and clim edits recompose over the LAST
  // COMPLETED paint — two uniform writes and a palette refill, no re-read, no
  // repaint. A stale stamp means the data effect is (re)running and will
  // apply the fresh appearance itself when it lands.
  useEffect(() => {
    if (!manager) return;
    const paint = lutPaintRef.current;
    if (!paint || paint.dataKey !== lutKey) return;
    manager.setColorAppearance(
      composeMeshLutAppearance(colorBy, { window: paint.window, qualitative: paint.qualitative }),
    );
    invalidate();
    // `colorBy` is read inside; `appearanceKey` decides re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manager, appearanceKey, lutKey, invalidate]);

  // Per-layer LOD preset: replans immediately against the last settle.
  useEffect(() => {
    manager?.setPlanConfig({ pixelBudget: DETAIL_BUDGETS[layer.detail ?? "balanced"] });
  }, [manager, layer.detail]);

  // Visibility rides the driver (`inputs.visible` below): it must also REPLAN
  // on the show edge, which the driver owns for both collection formats.
  const visible = layer.visible !== false;

  const flatNormals = effectiveFlatNormals(layer);
  useEffect(() => {
    manager?.setFlatNormals(flatNormals);
    invalidate();
  }, [manager, flatNormals, invalidate]);

  // The scene-wide picked instance, pushed into this layer's shader uniforms
  // (highlight/isolate) — uniform writes only, never a recompile. A VANILLA
  // subscription (the plan effect's idiom): selection changes at hover cadence
  // under probe-marking, and a render subscription re-rendered this whole
  // group — placement memo, lutKey stringify, fresh handler closures — per
  // hovered instance.
  useEffect(() => {
    if (!manager) return;
    const apply = () => {
      const selection = viewerApi.getState().meshSelection;
      manager.setSelection(
        selection && selection.layerId === layer.id
          ? { ordinal: selection.ordinal, isolate: selection.isolate }
          : null,
      );
      invalidate();
    };
    apply();
    return viewerApi.subscribe((state, prev) => {
      if (state.meshSelection !== prev.meshSelection) apply();
    });
  }, [manager, viewerApi, layer.id, invalidate]);

  // 2D slab: clip the collection to one z-step around the displayed slice
  // (the annotation layer's slab convention). Thickness comes from the finest
  // image layer's z-step; a scene without one falls back to one mesh voxel
  // (the placement matrix's z basis length). Z-scrub mutates only the plane
  // constants — no replan, no pipeline rebuild.
  const displayMode = useModeStore((s) => s.displayMode);
  // A PRIMITIVE selector: `s.layers` churns identity on every brick-layer
  // LOD/visibility write, but the step it yields is a number — Object.is
  // equality suppresses the re-render this group used to pay for each of them.
  const slabStep = useSceneStore((s) => sceneZExtent(s.layers)?.step);
  const slabThickness = useMemo(
    () => collectionSlabThickness(slabStep, matrix, layer.slabScale),
    [slabStep, matrix, layer.slabScale],
  );

  /**
   * Placement, the plan-on-settle cadence and the z-scrub clip, all on the
   * render plane (`platform/collections/collectionDriver.ts`). What stays in
   * this component is what is fabriks': the manager, its material and plan
   * config, its colour LUT, and — below — the picking, which the network
   * layer has none of.
   *
   * The return value is unused: a `detail` change writes the plan config but
   * takes effect at the next camera settle, which is what it did before.
   */
  useCollectionDriver(
    manager,
    { viewApi, viewerApi, invalidate, logTag: "[fabriks]" },
    {
      matrix,
      slab: displayMode === "3D" ? null : { thickness: slabThickness },
      visible,
    },
  );

  // --- Instance picking: click (PROBE) + debounced hover (PROBE follow /
  // ANNOTATE drawing tools — the brick layers' etiquette). Reads the hit's
  // per-vertex ordinal; BatchedMesh raycast windows the SHARED merged buffers
  // via drawRange, so `face.a` addresses the batch attribute on both paths.
  const interactionMode = useModeStore((s) => s.interactionMode);
  const probeFollowsCursor = useModeStore((s) => s.probeFollowsCursor);
  // A RENDER subscription: the handler PROPS below are the raycast gate, and
  // for this layer that gate is the whole point. `manager.group` holds a
  // BatchedMesh of every mounted cell, so an unconditionally-attached
  // onPointerMove costs a full per-instance raycast on every pointer move in
  // EVERY mode — NAVIGATE included, where none of these handlers can act. The
  // click-class props matter just as much: R3F does not filter those by
  // handler kind, so an unarmed onClick bought that same raycast at the start
  // of every orbit drag. See platform/probe/probeGating.ts (P20).
  const activeTool = useRoiDrawingStore((s) => s.activeTool);
  const gate: ProbeGateInput = {
    interactionMode,
    probeFollowsCursor,
    drawingToolActive: isDrawingTool(activeTool),
    annotateProbes: true,
  };
  // A hidden layer must not raycast either — `visible` gates the handler
  // props the same way the probe gates do.
  const hoverEnabled = visible && hoverProbeEnabled(gate);
  // Picking a mesh instance is a PROBE-mode act only: in ANNOTATE the click
  // belongs to the shape being drawn.
  const pickEnabled = visible && clickProbeEnabled(gate) && interactionMode === "PROBE";
  const hoverCoalescer = useMemo(() => createRafCoalescer<() => void>((run) => run()), []);
  useEffect(() => () => hoverCoalescer.cancel(), [hoverCoalescer]);
  // Last published hover, compared numerically (no per-move string key).
  const lastHover = useRef<{ ordinal: number; x: number; y: number; z: number } | null>(null);

  /** The picked ordinal + frame, or null when the event isn't a usable hit. */
  const resolveMeshHit = (event: ThreeEvent<MouseEvent | PointerEvent>) => {
    const face = event.face;
    const attr = (event.object as THREE.Mesh).geometry?.getAttribute("objectOrdinal");
    if (!face || !attr) return null;
    const ordinal = attr.getX(face.a);
    // Mesh-local IS collection voxel space (corner-anchored), so the hit
    // point through the inverse placement is the voxel coordinate.
    const worldPos: [number, number, number] = [event.point.x, event.point.y, event.point.z];
    // Scratch vector: this runs on every pointer move, before the dedupe.
    const local = hitScratch.copy(event.point).applyMatrix4(inverse);
    const voxelIndex: [number, number, number] = [
      Math.floor(local.x),
      Math.floor(local.y),
      Math.floor(local.z),
    ];
    return { ordinal, voxelIndex, worldPos };
  };

  /**
   * Publish a pick as a first-class PROBE — SYNCHRONOUSLY. The cursor-tracking
   * contract: the probe (and the gated highlight) move with the pointer; only
   * the table LOOKUP settles behind the tracker's debounce. The ordinal is
   * known instantly from the vertex attribute; the objectId answers from the
   * synchronous catalog peek (the common case after the first pick). Only the
   * very first pick — catalog still loading — emits a value-less probe (the
   * tracker skips those) and re-publishes when identity lands.
   *
   * Clicks always select (highlight/hull); hovers select only under the debug
   * page's "marked boundary" setting, mirroring the reverse-sync gate.
   */
  const publishMeshProbe = (
    hit: { ordinal: number; voxelIndex: [number, number, number]; worldPos: [number, number, number] },
    origin: "click" | "hover",
  ) => {
    if (!manager) return;
    perfMonitor.markProbe(); // no-op unless a perf recording is armed
    const state = viewerApi.getState();

    // Instant highlight by ordinal — no catalog involved (the hull resolves
    // itself asynchronously inside the manager).
    if (origin === "hover" && state.markProbedInstances) {
      const current = state.meshSelection;
      if (!(current?.layerId === layer.id && current.ordinal === hit.ordinal)) {
        state.setMeshSelection({
          layerId: layer.id,
          ordinal: hit.ordinal,
          objectId: null,
          stats: null,
          isolate: current?.layerId === layer.id ? current.isolate : false,
        });
      }
    }

    const emitProbe = (objectId: number | null) =>
      viewerApi.getState().setProbedCoordinate({
        layerId: layer.id,
        localPos: [0, 0, 0], // meshes carry no unit-box frame; worldPos is truth
        voxelIndex: hit.voxelIndex,
        worldPos: hit.worldPos,
        strategy: "mesh",
        origin,
        purpose: interactionMode === "ANNOTATE" ? "placement" : "readout",
        values: [{ channel: 0, value: objectId }],
        provenance: { source: "exact", level: 0 },
        dtype: "uint32",
        sliceSignature: `mesh:${collection.version ?? "0"}`,
      });

    const patchSelection = (entry: NonNullable<ReturnType<typeof manager.peekOrdinal>>) => {
      const current = viewerApi.getState().meshSelection;
      if (current?.layerId === layer.id && current.ordinal === hit.ordinal) {
        viewerApi.getState().setMeshSelection({
          ...current,
          objectId: entry.objectId,
          stats: { vertices: entry.vertexCount, indices: entry.indexCount },
        });
      }
    };

    const peeked = manager.peekOrdinal(hit.ordinal);
    if (peeked) {
      emitProbe(peeked.objectId); // fully synchronous — the hot path
      patchSelection(peeked);
      return;
    }
    emitProbe(null); // instant pending readout ("#…"); no lookup yet
    void manager
      .identifyOrdinal(hit.ordinal)
      .then((entry) => {
        if (!entry) return;
        // Re-publish only if this pick is still the one on display.
        const probe = viewerApi.getState().probedCoordinate;
        if (
          probe?.strategy === "mesh" &&
          probe.layerId === layer.id &&
          probe.values[0]?.value == null &&
          probe.voxelIndex.join(",") === hit.voxelIndex.join(",")
        ) {
          emitProbe(entry.objectId);
        }
        patchSelection(entry);
      })
      .catch((error) => console.warn("[fabriks] object identification failed:", error));
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (interactionMode !== "PROBE" || !manager) return;
    const hit = resolveMeshHit(event);
    if (!hit) return;
    event.stopPropagation();

    const state = viewerApi.getState();
    const previous = state.meshSelection;
    if (previous && previous.layerId === layer.id && previous.ordinal === hit.ordinal) {
      state.setMeshSelection(null); // clicking the selected object deselects
      if (
        state.probedCoordinate?.strategy === "mesh" &&
        state.probedCoordinate.layerId === layer.id
      ) {
        state.setProbedCoordinate(null); // and retracts its probe
      }
      return;
    }
    // Immediate highlight (ordinal known); identity patches in async.
    const isolate = previous?.layerId === layer.id ? previous.isolate : false;
    state.setMeshSelection({
      layerId: layer.id,
      ordinal: hit.ordinal,
      objectId: null,
      stats: null,
      isolate,
    });
    publishMeshProbe(hit, "click");
  };

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (event.buttons !== 0 || !manager) return;
    const hit = resolveMeshHit(event);
    if (!hit) return;
    event.stopPropagation();
    // Dedupe: same instance at the same voxel republishes nothing; the
    // tracker's 150 ms debounce (and its instant path) do the rest.
    const [vx, vy, vz] = hit.voxelIndex;
    const last = lastHover.current;
    if (last && last.ordinal === hit.ordinal && last.x === vx && last.y === vy && last.z === vz) {
      return;
    }
    if (last) {
      last.ordinal = hit.ordinal;
      last.x = vx;
      last.y = vy;
      last.z = vz;
    } else {
      lastHover.current = { ordinal: hit.ordinal, x: vx, y: vy, z: vz };
    }
    hoverCoalescer.schedule(() => publishMeshProbe(hit, "hover"));
  };

  const handlePointerOut = () => {
    hoverCoalescer.cancel();
    lastHover.current = null;
    const state = viewerApi.getState();
    // Only hover probes retract on leave — a clicked probe stays pinned.
    if (
      state.probedCoordinate?.strategy === "mesh" &&
      state.probedCoordinate.layerId === layer.id &&
      state.probedCoordinate.origin === "hover"
    ) {
      state.setProbedCoordinate(null);
    }
  };

  if (!manager) return null;
  return (
    <primitive
      object={manager.group}
      onClick={pickEnabled ? handleClick : undefined}
      onPointerMove={hoverEnabled ? handlePointerMove : undefined}
      onPointerOut={hoverEnabled ? handlePointerOut : undefined}
    />
  );
};
