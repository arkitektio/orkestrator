import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { useDatalayerEndpoint } from "@/core/connection/arkitekt/host";
import { useMikro } from "@/mikro/api/funcs";
import { useLatestRef } from "@/core/util/hooks/useLatestRef";

import { sceneZExtent } from "../../platform/coords/worldTransform";
import { useModeStore } from "../../platform/stores/modeStore";
import { useSceneStore, type NetworkLayerSessionState } from "../../platform/stores/sceneStore";
import { useViewStoreApi } from "../../platform/stores/viewStore";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";
import {
  type NetworkCollectionRef,
  type NetworkLayerVariant,
} from "../../platform/model/collectionPlacement";
import { useAttributeServiceOrNull } from "@/mikro/lib/attributes/AttributeServiceProvider";
import { makeSparseReader } from "@/mikro/lib/sparse/sparseSource";
import {
  GetTableDatasetDocument,
  type GetTableDatasetQuery,
} from "@/mikro/api/graphql";

import type { KonnektionCollection } from "./konnektion/konnektionCollection";
import { attributeVocabulary } from "./konnektion/konnektionManifest";
import { openNetworkCollection } from "./konnektion/konnektionSource";
import { KonnektionCollectionManager } from "./konnektionManager";
import {
  buildNetworkStyling,
  composeNetworkAppearance,
  identityNetworkStyling,
  type NetworkPickerColorBy,
  type NetworkPickerFilterBy,
  type NodeTableFetcher,
} from "./networkStyling";
import type { NetworkValueAppearance } from "./konnektionManager";
import { useNetworkStoreApi } from "./store/networkSlice";
import { createLeadingThrottle } from "../../platform/perf/leadingThrottle";
import { useActivePickers } from "../../platform/attributes/useActivePickers";
import { usePickerResolution } from "../../platform/attributes/pickerResolution";
import { useCollectionDriver } from "../../platform/collections/useCollectionDriver";
import { useGpuPicker } from "../../platform/draw/useGpuPicker";
import type { GpuPickHit } from "../../platform/draw/gpuPick";
import { perfMonitor } from "../../platform/perf/perfMonitor";
import {
  clickProbeEnabled,
  hoverProbeEnabled,
  type ProbeGateInput,
} from "../../platform/probe/probeGating";
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
 * NetworkLayer renderer: a konnektion collection — a self-describing prefix of
 * Parquet files holding a node/edge graph — placed by its own `pathToWorld`
 * composed through the scene's transform graph, and nothing else
 * (`collectionPlacement.ts`; COORDINATE_SYSTEMS.md "Coordinate conventions").
 *
 * The React layer owns only lifecycle, transform resolution and the settle
 * cadence. Level choice and geometry live in `KonnektionCollectionManager`
 * (imperative — no React re-render per load, OCTREE_RENDERER.md P17), the read
 * plan in `KonnektionCollection`, and the byte contract in `konnektionDecode`.
 *
 * One component for both display modes: in 2D it clips itself to a slab around
 * `currentZ`, exactly as the mesh layer does.
 */

export const NetworkCollectionLayer = ({ layerId }: { layerId: string }) => {
  const layer = useSceneStore((s) =>
    s.sceneLayers.find((candidate) => candidate.id === layerId),
  );
  if (!layer || layer.__typename !== "NetworkLayer") return null;
  if (!layer.collection) return null;
  // `visible: false` stays MOUNTED: the group survives with its manager, so the
  // open footers and byte cache stay warm and a re-show is a cache replay
  // rather than a re-download. The manager stops planning while hidden.
  return <NetworkCollectionGroup layer={layer} collection={layer.collection} />;
};

/** The fragment plus the card's session-local render state. */
type NetworkLayerView = NetworkLayerVariant & NetworkLayerSessionState;

/**
 * The card's detail presets → the planner's pixel-error budget.
 *
 * Looser than the mesh path's on purpose. Choosing a level here swaps the WHOLE
 * collection, and a coarser konnektion level has genuinely fewer branches
 * (Strahler pruning removes twigs; it does not approximate them), so a tight
 * budget that keeps flipping is both more expensive and more visible than it is
 * for a surface.
 */
const DETAIL_BUDGETS = { fine: 2, balanced: 5, fast: 10 } as const;

/** R3F's click rule: a press that travelled further than this is a drag
 *  (an orbit), not a click. */
const CLICK_SLOP_PX = 2;

/** Scratch for the pick's world → voxel transform (never escapes a callback). */
const voxelScratch = new THREE.Vector3();

/** One picked object: its ordinal, and where on it the pointer landed. */
type NetworkHit = {
  ordinal: number;
  voxelIndex: [number, number, number];
  worldPos: [number, number, number];
};

const NetworkCollectionGroup = ({
  layer,
  collection,
}: {
  layer: NetworkLayerView;
  collection: NetworkCollectionRef;
}) => {
  const rawInvalidate = useThree((state) => state.invalidate);
  const transformContext = useSceneStore((s) => s.transformContext);
  const viewApi = useViewStoreApi();
  const networkApi = useNetworkStoreApi();
  // `currentZ` and `worldUnitsPerPixel` are PLATFORM slice members (dimsSlice,
  // viewSlice), so they come off the viewer store directly. The mesh layer
  // reaches them through its own slice hook, which would make
  // `features/network -> features/meshes` an edge for nothing.
  const viewerApi = useViewerStoreApi();
  /**
   * Bumps the volume compositor's input tracker alongside the frame request —
   * the mesh layer's contract, for the same reason: the compositor CACHES its
   * offscreen volume target, so a scene change that reaches that target must
   * move a cache key or the stale composite is served until the camera moves.
   * An opaque network (opacity 1) is a depth-prepass occluder exactly like a
   * mesh, so a plan swap changes the target's occlusion and must move the key.
   */
  const invalidate = useCallback(() => {
    viewerApi.getState().volumeInputs.bump("network-collection");
    rawInvalidate();
  }, [viewerApi, rawInvalidate]);
  const datalayer = useDatalayerEndpoint();
  const client = useMikro();

  // Load-cadence stats → debug-only `networkVersion`, throttled here so the
  // manager stays cadence-blind and the store sees at most ~8 writes/s (P17).
  const statsThrottle = useMemo(
    () =>
      createLeadingThrottle({
        intervalMs: STATS_THROTTLE_MS,
        run: () => networkApi.getState().bumpNetworkVersion(),
      }),
    [networkApi],
  );
  // The hand-rolled version this replaced never cancelled: a stats change
  // within one window of unmount fired a timer into a torn-down scoped store.
  useEffect(() => () => statsThrottle.cancel(), [statsThrottle]);
  const onStatsChanged = statsThrottle.trigger;

  // `inverse` is the hook's scratch matrix, kept current in place — the pick
  // callbacks below read it live.
  const { matrix, inverse } = useCollectionPlacement(layer, collection, transformContext);

  // Opening costs NO S3 round trip: the server mirrors konnektion.json onto the
  // store node. Collections are immutable per version, so the open survives as
  // long as (collection, client, datalayer).
  const [opened, setOpened] = useState<KonnektionCollection | null>(null);
  useEffect(() => {
    if (!datalayer) return; // no endpoint configured: nothing to read from
    let cancelled = false;
    openNetworkCollection(collection, client, datalayer)
      .then((next) => {
        if (!cancelled) setOpened(next);
      })
      .catch((error: unknown) =>
        console.error("[konnektion] failed to open the collection:", error),
      );
    return () => {
      cancelled = true;
    };
  }, [collection, client, datalayer]);

  // Keyed on the OPEN alone. A placement change goes through setVoxelToWorld,
  // never a manager rebuild — rebuilding would refetch the whole level.
  const manager = useMemo(() => {
    if (!opened) return null;
    return new KonnektionCollectionManager({
      collection: opened,
      onInvalidate: invalidate,
      onStatsChanged,
    });
  }, [opened, invalidate, onStatsChanged]);

  useEffect(() => () => manager?.dispose(), [manager]);

  // Registered for the debug panel, and deregistered on unmount so a removed
  // layer does not leave a disposed manager in the store.
  useEffect(() => {
    if (!manager) return;
    networkApi.getState().registerNetworkSystem(layer.id, manager);
    return () => networkApi.getState().registerNetworkSystem(layer.id, null);
  }, [manager, networkApi, layer.id]);

  useEffect(() => {
    manager?.setMaterialConfig({
      color: layer.materialColor,
      opacity: layer.opacity,
      lineWidth: layer.lineWidth,
      // The session override wins over the stored value, so a toggle on the
      // card is immediate and costs no round trip.
      showNodes: layer.showNodesOverride ?? layer.showNodes,
      directed: layer.directedOverride ?? layer.directed,
      colorByInstance: layer.colorByInstance,
      instanceColormap: layer.instanceColormap,
    });
  }, [
    manager,
    layer.materialColor,
    layer.opacity,
    layer.lineWidth,
    layer.showNodes,
    layer.showNodesOverride,
    layer.directed,
    layer.directedOverride,
    layer.colorByInstance,
    layer.instanceColormap,
  ]);

  useEffect(() => {
    manager?.setPlanConfig({
      pixelBudget: DETAIL_BUDGETS[layer.detail ?? "balanced"],
      // `maxLevel` is the layer's BUDGET on detail — a cap, not a choice.
      maxLevel: layer.maxLevel ?? null,
    });
  }, [manager, layer.detail, layer.maxLevel]);

  /**
   * The layer's STORED pickers, resolved to per-node state.
   *
   * The GRAPH entries resolve locally — their values ride the decoded cells —
   * so a layer that only colours by strahler never touches the network. The
   * COLUMN/SPARSE entries are the mesh path: DuckDB over the attribute plans,
   * a sparse slice off the store, then a per-ordinal scatter so the shader
   * keeps one value path (`networkStyling.ts`).
   */
  const attributeService = useAttributeServiceOrNull();

  // The access path for a per-node/per-edge table entry (a stamped `target`):
  // such tables publish no attribute plan — an object id alone cannot address
  // their rows — so the store and the composite key columns come off the
  // table's own detail, one query per table, answered by Apollo's normalized
  // cache after the first round trip.
  const fetchTable = useMemo<NodeTableFetcher | null>(() => {
    if (!client?.query) return null;
    return async (tableId: string) => {
      const result = await client.query({
        query: GetTableDatasetDocument,
        variables: { id: tableId },
      });
      const dataset = (result as { data?: GetTableDatasetQuery }).data?.tableDataset;
      if (!dataset) return null;
      return {
        id: dataset.id,
        store: dataset.store,
        columns: dataset.columns.map((column) => ({
          name: column.name,
          role: column.role,
          order: column.order,
          nodeReferences: column.nodeReferences ?? null,
        })),
      };
    };
  }, [client]);

  // CONTENT keys, and the two-key split: the DATA key re-runs the whole build
  // and re-packs every resident cell, the APPEARANCE key is two uniform writes
  // and a palette refill. `entryKeys.ts` decides what goes where — including
  // why the colormap's qualitative CLASS is data while the colormap is not.
  const {
    colorBy: activeColorBy,
    rules: activeRules,
    dataKey,
    appearanceKey,
  } = useActivePickers<NetworkPickerColorBy, NetworkPickerFilterBy>(layer);
  const systemId = collection.coordinateSystem?.id ?? null;

  /** What the last completed build derived, so an appearance edit can be
   *  recomposed without it. `dataKey` stamps which build it belongs to — the
   *  appearance effect must never recompose over a stale data half. */
  const resolvedStylingRef = useRef<{
    dataKey: string;
    appearance: NetworkValueAppearance;
    qualitative: boolean;
  } | null>(null);

  const resetStyling = useCallback(() => {
    if (!manager) return;
    const identity = identityNetworkStyling();
    resolvedStylingRef.current = {
      dataKey,
      appearance: identity.appearance,
      qualitative: false,
    };
    manager.setStyling(identity.styling);
    manager.setValueAppearance(identity.appearance);
  }, [manager, dataKey]);

  /**
   * The DATA half, through the shared lifecycle
   * (`platform/attributes/pickerResolution.ts`). No `dispose`: this build
   * produces per-node scatter, not a texture, so a superseded one owns
   * nothing to free.
   */
  usePickerResolution<Awaited<ReturnType<typeof buildNetworkStyling>>>(
    manager && opened && (activeColorBy || activeRules.length > 0) ? dataKey : null,
    {
      build: async () => {
        // A GRAPH-kind entry is answered from the manifest's own attribute
        // vocabulary, so it needs neither the object catalog nor a plan.
        const needsObjects =
          (activeColorBy && activeColorBy.kind !== "GRAPH") ||
          activeRules.some((rule) => rule.kind !== "GRAPH");
        const [objects, plans] = await Promise.all([
          needsObjects ? manager!.listObjects() : Promise.resolve(null),
          needsObjects && attributeService && systemId
            ? attributeService.plansFor(systemId)
            : Promise.resolve(null),
        ]);
        return buildNetworkStyling({
          colorBy: activeColorBy,
          rules: activeRules,
          vocabulary: attributeVocabulary(opened!.manifest),
          objects,
          plans,
          engine: attributeService?.engine ?? null,
          readSparse: makeSparseReader(client, datalayer),
          collectionId: collection.id,
          fetchTable,
        });
      },
      apply: (resolved) => {
        if (resolved.skipped.length > 0) {
          console.warn("[konnektion] picker entries that do not render yet:", resolved.skipped);
        }
        resolvedStylingRef.current = {
          dataKey,
          appearance: resolved.appearance,
          qualitative: resolved.qualitative,
        };
        manager!.setStyling(resolved.styling);
        manager!.setValueAppearance(resolved.appearance);
        invalidate();
      },
      reset: resetStyling,
      // Deliberately keeps the last styling on a failed read rather than
      // repainting the whole graph grey for something the next edit retries.
      resetOnError: false,
      onError: (error) => console.warn("[konnektion] could not resolve the picker:", error),
    },
  );

  // The appearance half: colormap and clim edits recompose over the LAST
  // COMPLETED build — two uniform writes and a palette refill, no rebuild, no
  // re-pack. A stale stamp means the data effect is (re)running and will
  // apply the fresh appearance itself when it lands.
  useEffect(() => {
    if (!manager) return;
    const resolved = resolvedStylingRef.current;
    if (!resolved || resolved.dataKey !== dataKey) return;
    const next = composeNetworkAppearance(resolved.appearance, resolved.qualitative, activeColorBy);
    if (next === resolved.appearance) return;
    resolved.appearance = next;
    manager.setValueAppearance(next);
    invalidate();
    // `activeColorBy` is read inside; `appearanceKey` decides re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manager, appearanceKey, dataKey, invalidate]);

  // 2D slab: clip the collection to one z-step around the displayed slice.
  // Thickness comes from the finest image layer's z-step; a scene without one
  // falls back to one collection voxel (the placement matrix's z basis length).
  const displayMode = useModeStore((s) => s.displayMode);
  // A PRIMITIVE selector: `s.layers` churns identity on every brick-layer
  // LOD/visibility write, but the step it yields is a number, so Object.is
  // equality suppresses those re-renders.
  const slabStep = useSceneStore((s) => sceneZExtent(s.layers)?.step);
  const slabThickness = useMemo(
    () => collectionSlabThickness(slabStep, matrix, layer.slabScale),
    [slabStep, matrix, layer.slabScale],
  );

  /**
   * Placement, the plan-on-settle cadence and the z-scrub clip, all on the
   * render plane (`platform/collections/collectionDriver.ts`). The component
   * keeps only what is konnektion's: the manager it built, its material and
   * plan config, and its styling.
   *
   * The return value is unused here on purpose: a `detail` change writes the
   * plan config but does NOT force a replan, so it takes effect at the next
   * camera settle. The mesh layer behaves the same way; changing it would be
   * a behaviour change, not a refactor.
   */
  useCollectionDriver(
    manager,
    { viewApi, viewerApi, invalidate, logTag: "[konnektion]" },
    {
      matrix,
      slab: displayMode === "3D" ? null : { thickness: slabThickness },
      // Visibility rides the driver: `konnektionManager.updatePlan` drops every
      // view while hidden, so the SHOW edge has to replan or the layer stays
      // empty/stale until the next camera settle.
      visible: layer.visible !== false,
    },
  );

  // --- Object picking --------------------------------------------------------
  //
  // GPU only: a network is vertex-pulled from storage buffers, so there is no
  // CPU geometry a raycast could test. The id-buffer pick
  // (`platform/draw/gpuPick.ts`) renders this layer's three draws with their
  // id siblings and answers with the object ordinal and the surface point.
  //
  // The contract it plugs into is the MESH layer's, deliberately: the
  // scene-wide `meshSelection` (layerId-scoped, so the two kinds never cross)
  // drives this layer's highlight/isolate uniforms, and a pick publishes a
  // `strategy: "mesh"` probe whose value is the object id. What does not
  // follow yet: the attribute tracker resolves plans for MESH layers only, so
  // a network probe carries its object id and no attribute rows.
  //
  // Events arrive as DOM listeners on the canvas rather than R3F handlers —
  // an R3F handler would need a raycastable object, which is exactly what a
  // network lacks — so this layer does not take part in R3F's nearest-first
  // stopPropagation routing: a volume layer answering the same move still
  // publishes its own probe. The listeners are attached only while the probe
  // gates say so (P20's gate, applied to attachment exactly as before).
  const picker = useGpuPicker();
  const gl = useThree((state) => state.gl);
  const getThree = useThree((state) => state.get);
  useEffect(() => {
    if (!manager || !picker) return;
    return picker.register(manager.pickSource(layer.id));
  }, [manager, picker, layer.id]);

  // Selection → uniforms, VANILLA-subscribed like the mesh layer: it changes
  // at hover cadence under probe-marking.
  useEffect(() => {
    if (!manager) return;
    const apply = () => {
      const selection = viewerApi.getState().meshSelection;
      if (selection && selection.layerId === layer.id) {
        manager.setSelection(selection.ordinal, selection.isolate);
      } else {
        manager.setSelection(null);
      }
      invalidate();
    };
    apply();
    return viewerApi.subscribe((state, prev) => {
      if (state.meshSelection !== prev.meshSelection) apply();
    });
  }, [manager, viewerApi, layer.id, invalidate]);

  /** ordinal → objectId, loaded once on the first pick. */
  const objectIdsRef = useRef<Map<number, number> | null>(null);
  const objectIdsLoading = useRef<Promise<Map<number, number>> | null>(null);
  useEffect(() => {
    objectIdsRef.current = null;
    objectIdsLoading.current = null;
  }, [manager]);
  const objectIdFor = (ordinal: number): number | null | Promise<number | null> => {
    const known = objectIdsRef.current;
    if (known) return known.get(ordinal) ?? null;
    if (!manager) return null;
    objectIdsLoading.current ??= manager.listObjects().then((entries) => {
      const map = new Map(entries.map((entry) => [entry.ordinal, entry.objectId] as const));
      objectIdsRef.current = map;
      return map;
    });
    return objectIdsLoading.current.then((map) => map.get(ordinal) ?? null);
  };

  const interactionMode = useModeStore((s) => s.interactionMode);
  const probeFollowsCursor = useModeStore((s) => s.probeFollowsCursor);
  // PROBE mode only: `annotateProbes: false` keeps this layer out of ANNOTATE
  // placement (the mesh layer's ANNOTATE arm reads the ROI drawing store,
  // which a network has no business depending on).
  const gate: ProbeGateInput = {
    interactionMode,
    probeFollowsCursor,
    drawingToolActive: false,
    annotateProbes: false,
  };
  const visible = layer.visible !== false;
  const hoverEnabled = visible && hoverProbeEnabled(gate);
  const pickEnabled = visible && clickProbeEnabled(gate) && interactionMode === "PROBE";

  /** Bumped on leave / disarm: a pick answering afterwards is dropped. */
  const hoverGeneration = useRef(0);
  const lastHover = useRef<{ ordinal: number; x: number; y: number; z: number } | null>(null);

  const hitFromGpu = (hit: GpuPickHit | null): NetworkHit | null => {
    if (!hit || hit.key !== layer.id) return null;
    const local = voxelScratch
      .set(hit.worldPos[0], hit.worldPos[1], hit.worldPos[2])
      .applyMatrix4(inverse);
    return {
      ordinal: hit.ordinal,
      voxelIndex: [Math.floor(local.x), Math.floor(local.y), Math.floor(local.z)],
      worldPos: hit.worldPos,
    };
  };

  /** The mesh layer's publish, minus its hull/stats: a probe now, the object
   *  id as soon as the catalog answers. */
  const publishProbe = (hit: NetworkHit, origin: "click" | "hover") => {
    perfMonitor.markProbe();
    const state = viewerApi.getState();
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
    const emit = (objectId: number | null) =>
      viewerApi.getState().setProbedCoordinate({
        layerId: layer.id,
        localPos: [0, 0, 0],
        voxelIndex: hit.voxelIndex,
        worldPos: hit.worldPos,
        strategy: "mesh",
        origin,
        purpose: "readout",
        values: [{ channel: 0, value: objectId }],
        provenance: { source: "exact", level: 0 },
        dtype: "uint32",
        sliceSignature: `network:${collection.version ?? "0"}`,
      });
    const patchSelection = (objectId: number | null) => {
      const current = viewerApi.getState().meshSelection;
      if (current?.layerId === layer.id && current.ordinal === hit.ordinal) {
        viewerApi.getState().setMeshSelection({ ...current, objectId });
      }
    };
    const objectId = objectIdFor(hit.ordinal);
    if (!(objectId instanceof Promise)) {
      emit(objectId);
      patchSelection(objectId);
      return;
    }
    emit(null);
    void objectId
      .then((resolved) => {
        const probe = viewerApi.getState().probedCoordinate;
        if (
          probe?.layerId === layer.id &&
          probe.values[0]?.value == null &&
          probe.voxelIndex.join(",") === hit.voxelIndex.join(",")
        ) {
          emit(resolved);
        }
        patchSelection(resolved);
      })
      .catch((error: unknown) => console.warn("[konnektion] object lookup failed:", error));
  };

  const retractHover = () => {
    lastHover.current = null;
    const state = viewerApi.getState();
    if (
      state.probedCoordinate?.strategy === "mesh" &&
      state.probedCoordinate.layerId === layer.id &&
      state.probedCoordinate.origin === "hover"
    ) {
      state.setProbedCoordinate(null);
    }
  };

  const acceptHover = (hit: NetworkHit) => {
    const [x, y, z] = hit.voxelIndex;
    const last = lastHover.current;
    if (last && last.ordinal === hit.ordinal && last.x === x && last.y === y && last.z === z) {
      return;
    }
    lastHover.current = { ordinal: hit.ordinal, x, y, z };
    publishProbe(hit, "hover");
  };

  const applyClick = (hit: NetworkHit) => {
    const state = viewerApi.getState();
    const previous = state.meshSelection;
    if (previous && previous.layerId === layer.id && previous.ordinal === hit.ordinal) {
      state.setMeshSelection(null);
      if (state.probedCoordinate?.layerId === layer.id) state.setProbedCoordinate(null);
      return;
    }
    state.setMeshSelection({
      layerId: layer.id,
      ordinal: hit.ordinal,
      objectId: null,
      stats: null,
      isolate: previous?.layerId === layer.id ? previous.isolate : false,
    });
    publishProbe(hit, "click");
  };

  // The handlers change identity every render; the listeners read the latest
  // through a ref so arming them depends on the GATES alone.
  const handlersRef = useLatestRef({ acceptHover, retractHover, applyClick, hitFromGpu });

  useEffect(() => {
    if (!manager || !picker || !(hoverEnabled || pickEnabled)) return;
    const element = gl.domElement;
    const request = (event: MouseEvent) => ({
      clientX: event.clientX,
      clientY: event.clientY,
      camera: getThree().camera,
    });

    const onMove = (event: PointerEvent) => {
      if (event.buttons !== 0) return;
      const generation = hoverGeneration.current;
      picker.pick("hover", request(event), (gpuHit) => {
        if (generation !== hoverGeneration.current) return;
        const handlers = handlersRef.current;
        const hit = handlers.hitFromGpu(gpuHit);
        if (hit) handlers.acceptHover(hit);
        else handlers.retractHover();
      });
    };
    const onLeave = () => {
      hoverGeneration.current++;
      handlersRef.current.retractHover();
    };

    let pressedAt: { x: number; y: number } | null = null;
    const onDown = (event: PointerEvent) => {
      pressedAt = event.button === 0 ? { x: event.clientX, y: event.clientY } : null;
    };
    const onClick = (event: MouseEvent) => {
      const from = pressedAt;
      pressedAt = null;
      if (event.button !== 0 || !from) return;
      if (Math.hypot(event.clientX - from.x, event.clientY - from.y) > CLICK_SLOP_PX) return;
      picker.pick("click", request(event), (gpuHit) => {
        const hit = handlersRef.current.hitFromGpu(gpuHit);
        if (hit) handlersRef.current.applyClick(hit);
      });
    };

    if (hoverEnabled) {
      element.addEventListener("pointermove", onMove);
      element.addEventListener("pointerleave", onLeave);
    }
    if (pickEnabled) {
      element.addEventListener("pointerdown", onDown);
      element.addEventListener("click", onClick);
    }
    return () => {
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerleave", onLeave);
      element.removeEventListener("pointerdown", onDown);
      element.removeEventListener("click", onClick);
      // Disarming is a leave: drop in-flight hovers, retract the hover probe.
      hoverGeneration.current++;
      if (hoverEnabled) handlersRef.current.retractHover();
    };
  }, [manager, picker, gl, getThree, hoverEnabled, pickEnabled, handlersRef]);

  if (!manager) return null;
  return <primitive object={manager.group} />;
};
