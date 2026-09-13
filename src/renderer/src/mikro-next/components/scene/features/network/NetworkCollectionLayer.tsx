import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useDatalayerEndpoint, useMikro } from "@/app/Arkitekt";

import { sceneZExtent } from "../../platform/coords/worldTransform";
import { useModeStore } from "../../platform/stores/modeStore";
import { useSceneStore, type NetworkLayerSessionState } from "../../platform/stores/sceneStore";
import { useViewStoreApi } from "../../platform/stores/viewStore";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";
import {
  type NetworkCollectionRef,
  type NetworkLayerVariant,
} from "../../platform/model/collectionPlacement";
import { useAttributeServiceOrNull } from "@/mikro-next/lib/attributes/AttributeServiceProvider";
import { makeSparseReader } from "@/mikro-next/lib/sparse/sparseSource";
import {
  GetTableDatasetDocument,
  type GetTableDatasetQuery,
} from "@/mikro-next/api/graphql";

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
   * Konnektion segments are transparent today and so never occlude, but that
   * is a material flag, not a structural fact — keeping both collection
   * layers on one contract is what stops it from becoming a silent
   * regression.
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

  const { matrix } = useCollectionPlacement(layer, collection, transformContext);

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

  if (!manager) return null;
  // No pointer handlers attached at all: picking is not wired for this layer
  // yet, and P20 is explicit that ATTACHMENT is the raycast gate — an
  // unconditional handler would cost a full raycast per pointer move in every
  // mode, for nothing.
  return <primitive object={manager.group} />;
};
