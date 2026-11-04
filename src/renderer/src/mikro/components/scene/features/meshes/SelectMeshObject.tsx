import { useEffect, useRef } from "react";

import { SceneGuard } from "../../platform/stores/sceneScope";
import { resolveCollectionMatrix } from "../../platform/model/collectionPlacement";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { useViewerStore } from "../../platform/stores/viewerStore";
import { useMeshStore } from "./store/meshSlice";
import { meshObjectBox, useNavigateToMeshBox } from "./useNavigateToMeshObject";

/**
 * Select one mesh of a collection, and frame it, once the scene can: a mesh
 * object's page opens its collection's scene with the mesh already picked out
 * (`pages/MeshObjectPage`).
 *
 * Waits for what it needs — the scene's layer over the collection, that
 * layer's catalog (the object's ordinal and box come from it) — and does it
 * once per object: picking another mesh by hand afterwards is the user's.
 * Renders nothing; a no-op where the scene draws no layer of the collection.
 */
export const SelectMeshObject = (props: { collectionId: string; objectId: number }) => (
  <SceneGuard>
    <Select {...props} />
  </SceneGuard>
);

const Select = ({ collectionId, objectId }: { collectionId: string; objectId: number }) => {
  const layer = useSceneStore((s) =>
    s.sceneLayers.find((candidate) => candidate.__typename === "MeshLayer" && candidate.collection?.id === collectionId),
  );
  const transformContext = useSceneStore((s) => s.transformContext);
  const manager = useMeshStore((s) => (layer ? s.meshSystems[layer.id] : undefined));
  const setMeshSelection = useViewerStore((s) => s.setMeshSelection);
  const navigateToBox = useNavigateToMeshBox();
  const done = useRef<string | null>(null);

  useEffect(() => {
    const key = `${collectionId}:${objectId}`;
    if (!layer || layer.__typename !== "MeshLayer" || !layer.collection || !manager || done.current === key) return;
    let cancelled = false;
    manager
      .listObjects()
      .then((entries) => {
        if (cancelled) return;
        const entry = entries.find((candidate) => candidate.objectId === objectId);
        if (!entry) return;
        done.current = key;
        setMeshSelection({
          layerId: layer.id,
          ordinal: entry.ordinal,
          objectId: entry.objectId,
          stats: { vertices: entry.vertexCount, indices: entry.indexCount },
          isolate: false,
        });
        navigateToBox(meshObjectBox(entry, resolveCollectionMatrix(layer, layer.collection!, transformContext)));
      })
      .catch((reason: unknown) => console.warn("[mesh object] cannot find the object in its collection:", reason));
    return () => {
      cancelled = true;
    };
  }, [collectionId, objectId, layer, manager, transformContext, setMeshSelection, navigateToBox]);

  return null;
};
