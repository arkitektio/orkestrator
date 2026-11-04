import { useEffect, useMemo, useState } from "react";
import { Box, Focus } from "lucide-react";

import { Button } from "@/core/ui/button";

import {
  resolveCollectionMatrix,
  type MeshCollectionRef,
  type MeshLayerVariant,
} from "../../platform/model/collectionPlacement";
import { formatCount } from "../../platform/model/selectionFormat";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { useViewerStore, type MeshSelectionState } from "../../platform/stores/viewerStore";
import type { FabriksObjectEntry } from "./fabriks/fabriksCatalogs";
import { useMeshStore } from "./store/meshSlice";
import { meshObjectBox, useNavigateToMeshBox } from "./useNavigateToMeshObject";

/** A mesh layer paired with its (non-null) collection. */
export type MeshLayerRef = { layer: MeshLayerVariant; collection: MeshCollectionRef };

/** The scene's mesh layer `layerId` with its collection, or undefined. */
export const useMeshLayerRef = (layerId: string | undefined): MeshLayerRef | undefined => {
  // The layer by identity (stable across unrelated store writes); the pair is
  // built from it, so the selector never returns a fresh object.
  const layer = useSceneStore((s) =>
    layerId ? s.sceneLayers.find((candidate) => candidate.id === layerId) : undefined,
  );
  return useMemo(
    () =>
      layer?.__typename === "MeshLayer" && layer.collection
        ? { layer: layer as MeshLayerVariant, collection: layer.collection }
        : undefined,
    [layer],
  );
};

/**
 * One object's catalog entry, by ordinal: the synchronous peek when the
 * collection's index is loaded (the common case after any pick), else the
 * async lookup. Null until it answers, and when the collection has no
 * readable catalog.
 */
export const useMeshObjectEntry = (layerId: string, ordinal: number): FabriksObjectEntry | null => {
  const manager = useMeshStore((s) => s.meshSystems[layerId]);
  const [entry, setEntry] = useState<FabriksObjectEntry | null>(() => manager?.peekOrdinal(ordinal) ?? null);
  useEffect(() => {
    if (!manager) {
      setEntry(null);
      return;
    }
    const peeked = manager.peekOrdinal(ordinal);
    setEntry(peeked);
    if (peeked) return;
    let cancelled = false;
    manager
      .identifyOrdinal(ordinal)
      .then((found) => {
        if (!cancelled) setEntry(found);
      })
      .catch((reason: unknown) => console.warn("[fabriks] cannot identify the object:", reason));
    return () => {
      cancelled = true;
    };
  }, [manager, ordinal]);
  return entry;
};

/**
 * The two things a selected mesh object can do in place — frame it, show only
 * it — and its size. Shared by the sidebar's selection card and the mesh
 * float.
 *
 * Go-to reads the bounds from the object catalog by ordinal at click time: a
 * probe click knows only what the vertex attribute said.
 */
export const MeshObjectActions = ({
  selection,
  layerRef,
}: {
  selection: MeshSelectionState;
  layerRef: MeshLayerRef | undefined;
}) => {
  const manager = useMeshStore((s) => s.meshSystems[selection.layerId]);
  const transformContext = useSceneStore((s) => s.transformContext);
  const setMeshSelection = useViewerStore((s) => s.setMeshSelection);
  const navigateToBox = useNavigateToMeshBox();

  const goTo = () => {
    if (!manager || !layerRef) return;
    const matrix = resolveCollectionMatrix(layerRef.layer, layerRef.collection, transformContext);
    void manager
      .identifyOrdinal(selection.ordinal)
      .then((entry) => {
        if (entry) navigateToBox(meshObjectBox(entry, matrix));
      })
      .catch((reason: unknown) => console.warn("[fabriks] cannot locate the selected instance:", reason));
  };

  return (
    <>
      <Button variant="outline" size="xs" title="Go to mesh" disabled={!manager || !layerRef} onClick={goTo}>
        <Focus className="mr-1 h-3 w-3" />
        Go to
      </Button>
      <Button
        variant={selection.isolate ? "default" : "outline"}
        size="xs"
        title="Show ONLY this instance"
        onClick={() => setMeshSelection({ ...selection, isolate: !selection.isolate })}
      >
        <Box className="mr-1 h-3 w-3" />
        Isolate
      </Button>
    </>
  );
};

/** "1.2k v · 800 t": the object's size, once its catalog entry is known. */
export const meshObjectSize = (stats: MeshSelectionState["stats"]): string | null =>
  stats ? `${formatCount(stats.vertices)}v · ${formatCount(Math.round(stats.indices / 3))}t` : null;
