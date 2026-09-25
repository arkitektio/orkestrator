import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Box, Eye, Focus, PencilRuler, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import {
  meshObjectBox,
  useNavigateToMeshBox,
} from "./useNavigateToMeshObject";
import {
  resolveCollectionMatrix,
  type MeshCollectionRef,
  type MeshLayerVariant,
} from "../../platform/model/collectionPlacement";
import type { FabriksObjectEntry } from "./fabriks/fabriksCatalogs";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { useViewerStore, type MeshSelectionState } from "../../platform/stores/viewerStore";
import { formatCount, hueStyle, objectLabel } from "../../platform/model/selectionFormat";
import { useMeshStore } from "./store/meshSlice";
import { useModeStore } from "../../platform/stores/modeStore";
import { useMeshDesignStoreApi } from "../meshDesign/store/meshDesignStore";
import { loadObjectsFromCollection } from "../meshDesign/commit/loadCollection";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

/** Above this many indices the designer declines an edit — a segmentation is not a design. */
const DESIGN_EDIT_MAX_INDICES = 6_000_000;

/**
 * The meshes panel: every object of every mesh layer in the scene, grouped per
 * collection — the annotations sidebar's twin for `MeshLayer`s. Clicking a row
 * selects that instance (highlight + bbox hull, the same selection a probe
 * click makes); the camera moves only through the explicit go-to button, so
 * browsing the list never yanks the view around.
 *
 * The list comes from the collection's OBJECT CATALOG through the layer's
 * registered `FabriksCollectionManager` — the same lazily-loaded index picking
 * and the selection hull resolve from, so opening this tab costs no extra
 * request. That manager exists only while the layer is mounted, which is why a
 * hidden layer offers a "show" button instead of a list.
 *
 * Mesh selection is a scene-wide SINGLETON (`viewerStore.meshSelection`), so a
 * row click replaces the selection rather than accumulating one — the opposite
 * of the annotations panel's multi-select, and the same thing a probe click on
 * the canvas does.
 */

/** A mesh layer paired with its (non-null) collection. */
type MeshLayerRef = { layer: MeshLayerVariant; collection: MeshCollectionRef };

/** Objects rendered at once. A collection can hold hundreds of thousands of
 * them and there is no virtualizer in the tree; the header says what was cut. */
const ROW_CAP = 200;

export const MeshesPanel = ({
  variant = "floating",
}: {
  variant?: "floating" | "sidebar";
}) => {
  const sceneLayers = useSceneStore((s) => s.sceneLayers);
  const meshSelection = useViewerStore((s) => s.meshSelection);
  const setMeshSelection = useViewerStore((s) => s.setMeshSelection);

  const meshLayers = useMemo(
    () =>
      sceneLayers
        .filter(
          (layer): layer is MeshLayerVariant =>
            layer.__typename === "MeshLayer" && !!layer.collection,
        )
        .map((layer) => ({ layer, collection: layer.collection! })),
    [sceneLayers],
  );

  const rootClass =
    variant === "sidebar"
      ? "flex h-full min-h-0 flex-col gap-2 overflow-y-auto p-2"
      : "pointer-events-auto flex max-h-[60vh] w-72 flex-col gap-2 overflow-y-auto rounded-lg border border-black/10 bg-black/40 p-2 backdrop-blur-md";

  return (
    <div className={rootClass}>
      {meshSelection && (
        <section className="flex flex-col gap-2">
          <SelectedMeshCard
            selection={meshSelection}
            layerRef={meshLayers.find((ref) => ref.layer.id === meshSelection.layerId)}
            onIsolate={() =>
              setMeshSelection({ ...meshSelection, isolate: !meshSelection.isolate })
            }
            onClear={() => setMeshSelection(null)}
          />
          <div className="h-px shrink-0 bg-white/10" />
        </section>
      )}

      {meshLayers.length === 0 ? (
        <div className="text-xs text-muted-foreground/60">
          No mesh layers in this scene.
        </div>
      ) : (
        meshLayers.map((ref) => (
          <MeshLayerSection
            key={ref.layer.id}
            layer={ref.layer}
            collection={ref.collection}
          />
        ))
      )}
    </div>
  );
};

/**
 * The scene-wide selection, with the three things only it can do: go to,
 * isolate, clear.
 *
 * The go-to matters most for a selection made by CLICKING A MESH IN THE SCENE
 * — that arrives as a bare ordinal, and the object it names may be nowhere
 * near the list row that would otherwise frame it. The bounds come from the
 * object catalog by ordinal (`identifyOrdinal`, a cache hit once anything has
 * loaded it), because a probe click knows only what the vertex attribute said.
 */
const SelectedMeshCard = ({
  selection,
  layerRef,
  onIsolate,
  onClear,
}: {
  selection: MeshSelectionState;
  layerRef: MeshLayerRef | undefined;
  onIsolate: () => void;
  onClear: () => void;
}) => {
  const manager = useMeshStore((s) => s.meshSystems[selection.layerId]);
  const transformContext = useSceneStore((s) => s.transformContext);
  const navigateToBox = useNavigateToMeshBox();

  const goTo = () => {
    if (!manager || !layerRef) return;
    const matrix = resolveCollectionMatrix(
      layerRef.layer,
      layerRef.collection,
      transformContext,
    );
    void manager
      .identifyOrdinal(selection.ordinal)
      .then((entry) => {
        if (entry) navigateToBox(meshObjectBox(entry, matrix));
      })
      .catch((reason: unknown) =>
        console.warn("[fabriks] cannot locate the selected instance:", reason),
      );
  };

  return (
    <Card className="flex flex-col gap-1.5 px-2 py-2">
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-3 shrink-0 rounded-sm"
          style={hueStyle(selection.ordinal)}
        />
        <CardTitle className="min-w-0 flex-1 truncate text-sm">
          {objectLabel(selection.objectId, selection.ordinal)}
        </CardTitle>
        <Button
          variant="outline"
          size="xs"
          title="Go to mesh"
          disabled={!manager || !layerRef}
          onClick={goTo}
        >
          <Focus className="mr-1 h-3 w-3" />
          Go to
        </Button>
        <Button
          variant={selection.isolate ? "default" : "outline"}
          size="xs"
          title="Show ONLY this instance"
          onClick={onIsolate}
        >
          <Box className="mr-1 h-3 w-3" />
          Isolate
        </Button>
        <Button
          variant="ghost"
          size="xs"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          title="Clear selection"
          onClick={onClear}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">
        {layerRef ? `Mesh ${layerRef.collection.id}` : "Mesh layer"}
        {selection.stats &&
          ` · ${formatCount(selection.stats.vertices)}v · ${formatCount(
            Math.round(selection.stats.indices / 3),
          )}t`}
      </div>
    </Card>
  );
};

/**
 * One collection's list section.
 *
 * A component per layer is what lets each collection await its own catalog:
 * `listObjects()` shares the manager's lazy ordinal index with picking, so the
 * first list load is also what makes the next probe's identity lookup instant.
 */
const MeshLayerSection = ({
  layer,
  collection,
}: {
  layer: MeshLayerVariant;
  collection: MeshCollectionRef;
}) => {
  const manager = useMeshStore((s) => s.meshSystems[layer.id]);
  const setMeshSelection = useViewerStore((s) => s.setMeshSelection);
  const meshSelection = useViewerStore((s) => s.meshSelection);
  const transformContext = useSceneStore((s) => s.transformContext);
  const patchSceneLayer = useSceneStore((s) => s.patchSceneLayer);
  const navigateToBox = useNavigateToMeshBox();
  const setInteractionMode = useModeStore((s) => s.setInteractionMode);
  const displayMode = useModeStore((s) => s.displayMode);
  const designApi = useMeshDesignStoreApi();
  const [loadingDesign, setLoadingDesign] = useState(false);

  const [objects, setObjects] = useState<readonly FabriksObjectEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // The catalog is immutable per (collection, version), so one load per mounted
  // manager — and no synchronous reset when the manager is replaced (a scene
  // remount; a hide/show cycle now keeps the manager alive, so the list simply
  // survives it): the answer cannot have changed, and clearing the list first
  // would only flash "Loading…". A collection without an object catalog
  // REJECTS — the picking callers swallow that, a list has to say so.
  useEffect(() => {
    if (!manager) return;
    let cancelled = false;
    manager
      .listObjects()
      .then((entries) => {
        if (cancelled) return;
        setObjects(entries);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        console.warn(`[fabriks] cannot list objects of ${collection.id}:`, reason);
        setError("This collection carries no readable object catalog.");
      });
    return () => {
      cancelled = true;
    };
  }, [manager, collection.id]);

  const matrix = useMemo(
    () => resolveCollectionMatrix(layer, collection, transformContext),
    [layer, collection, transformContext],
  );

  const matches = useMemo(() => {
    if (!objects) return [];
    const needle = query.trim();
    if (!needle) return objects;
    return objects.filter((entry) => String(entry.objectId).includes(needle));
  }, [objects, query]);

  const select = (entry: FabriksObjectEntry) => {
    // Clicking the selected object deselects — the canvas click does the same.
    if (
      meshSelection?.layerId === layer.id &&
      meshSelection.ordinal === entry.ordinal
    ) {
      setMeshSelection(null);
      return;
    }
    setMeshSelection({
      layerId: layer.id,
      ordinal: entry.ordinal,
      objectId: entry.objectId,
      stats: { vertices: entry.vertexCount, indices: entry.indexCount },
      isolate: meshSelection?.layerId === layer.id ? meshSelection.isolate : false,
    });
  };

  /**
   * The whole collection's world extent — the only fit a mesh layer has, since
   * it registers no trackable for `fitToLayer`.
   *
   * Unioned in VOXEL space and transformed once: a segmentation collection
   * holds 10k–1M objects, and transforming each one's box would allocate three
   * THREE objects and re-bound eight corners per object inside a click
   * handler. The single transform of the union is a superset of the union of
   * the transforms — conservative, which is what framing wants.
   */
  const fitLayer = () => {
    if (!objects || objects.length === 0) return;
    const box = new THREE.Box3();
    const corner = new THREE.Vector3();
    for (const entry of objects) {
      box.expandByPoint(corner.set(...entry.bboxMin));
      box.expandByPoint(corner.set(...entry.bboxMax));
    }
    navigateToBox(box.applyMatrix4(matrix));
  };

  const hidden = layer.visible === false;
  const total = objects?.length ?? null;

  /**
   * Load this collection's objects into the mesh DESIGN session: decode at
   * the finest level, weld, place in world, and switch to DESIGN. Committing
   * the session then writes a NEW collection derived from this one — the
   * prefix itself is never edited (features/meshDesign/commit/loadCollection.ts).
   */
  const editInDesign = async () => {
    if (!manager) return;
    setLoadingDesign(true);
    try {
      await MeshoptDecoder.ready;
      const loaded = await loadObjectsFromCollection(manager.getCollection(), matrix, {
        decoder: MeshoptDecoder,
        maxIndices: DESIGN_EDIT_MAX_INDICES,
      });
      const design = designApi.getState();
      design.reset();
      for (const item of loaded) {
        design.addMesh({
          name: `Object ${item.objectId}`,
          geometry: item.geometry,
          objectId: item.objectId,
          source: { kind: "imported", collectionId: collection.id, objectId: item.objectId },
        });
      }
      design.setOrigin({ collectionId: collection.id, version: collection.version, layerId: layer.id });
      setInteractionMode("DESIGN");
    } catch (reason) {
      console.warn(`[fabriks] cannot load ${collection.id} into the designer:`, reason);
      designApi.getState().setStatus("error", reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoadingDesign(false);
    }
  };

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <span className="min-w-0 flex-1 break-words text-xs font-medium text-muted-foreground">
          {`Mesh ${collection.id}`}
        </span>
        {total !== null && !hidden && (
          <Button
            variant="ghost"
            size="xs"
            className="h-5 w-5 shrink-0 p-0 text-muted-foreground hover:text-foreground"
            title="Frame the whole collection"
            onClick={fitLayer}
          >
            <Focus className="h-3 w-3" />
          </Button>
        )}
        {total !== null && !hidden && displayMode === "3D" && (
          <Button
            variant="ghost"
            size="xs"
            className="h-5 w-5 shrink-0 p-0 text-muted-foreground hover:text-foreground"
            title="Edit in the mesh designer — commits as a new collection derived from this one"
            disabled={loadingDesign}
            onClick={() => void editInDesign()}
          >
            <PencilRuler className="h-3 w-3" />
          </Button>
        )}
        <span className="shrink-0 text-xs text-muted-foreground/60">
          {total !== null ? formatCount(total) : "…"}
        </span>
      </div>

      {hidden ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
          Layer hidden.
          <Button
            variant="outline"
            size="xs"
            onClick={() => patchSceneLayer(layer.id, { visible: true })}
          >
            <Eye className="mr-1 h-3 w-3" />
            Show
          </Button>
        </div>
      ) : error ? (
        <div className="text-xs text-muted-foreground/60">{error}</div>
      ) : !objects ? (
        <div className="text-xs text-muted-foreground/60">Loading objects…</div>
      ) : objects.length === 0 ? (
        <div className="text-xs text-muted-foreground/60">No objects</div>
      ) : (
        <>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by object id"
            className="h-6 w-full rounded-md border border-white/10 bg-black/30 px-2 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-sky-400/40"
          />
          {matches.length > ROW_CAP && (
            <div className="px-0.5 text-[10px] text-muted-foreground/60">
              Showing {ROW_CAP} of {formatCount(matches.length)} — filter to narrow.
            </div>
          )}
          {matches.length === 0 && (
            <div className="text-xs text-muted-foreground/60">No match</div>
          )}
          {matches.slice(0, ROW_CAP).map((entry) => (
            <MeshObjectRow
              key={entry.ordinal}
              entry={entry}
              isSelected={
                meshSelection?.layerId === layer.id &&
                meshSelection.ordinal === entry.ordinal
              }
              onSelect={() => select(entry)}
              onGoTo={() => navigateToBox(meshObjectBox(entry, matrix))}
            />
          ))}
        </>
      )}
    </section>
  );
};

const MeshObjectRow = ({
  entry,
  isSelected,
  onSelect,
  onGoTo,
}: {
  entry: FabriksObjectEntry;
  isSelected: boolean;
  onSelect: () => void;
  onGoTo: () => void;
}) => (
  // One compact line: hue chip, object id, size, go-to pinned right.
  <Card
    className={`group flex flex-row cursor-pointer items-center gap-2 px-2 py-1 transition-colors ${
      isSelected
        ? // Sky — the mesh card's selection color, not the annotations' amber.
          "border-sky-400/40 bg-sky-400/10"
        : "hover:bg-accent/50"
    }`}
    title={isSelected ? "Click to deselect" : "Click to select"}
    onClick={onSelect}
  >
    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={hueStyle(entry.ordinal)} />
    <CardTitle className="shrink-0 text-xs font-medium">#{entry.objectId}</CardTitle>
    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
      {formatCount(entry.vertexCount)}v ·{" "}
      {formatCount(Math.round(entry.indexCount / 3))}t
    </span>
    <Button
      variant="ghost"
      size="xs"
      className="h-6 w-6 shrink-0 p-0 text-muted-foreground hover:text-foreground"
      title="Go to mesh"
      onClick={(event) => {
        event.stopPropagation();
        onGoTo();
      }}
    >
      <Focus className="h-3.5 w-3.5" />
    </Button>
  </Card>
);
