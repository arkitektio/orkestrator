import { useCallback, useEffect, useMemo, useState } from "react";
import { EllipsisIcon, XIcon } from "lucide-react";

import { MikroMeshCollection, MikroMeshObject } from "@/core/linkers";
import { Button } from "@/core/ui/button";

import { projectScreenRect } from "../../platform/float/projectScreenRect";
import { SceneFloat, type FloatView } from "../../platform/float/SceneFloat";
import {
  meshFloatOwner,
  useSceneFloatStore,
  useSceneFloatStoreApi,
  type FloatTarget,
} from "../../platform/float/floatStore";
import { FloatStagingFooter, useFloatStaging } from "../staging/FloatStaging";
import { FloatStagingScope } from "../staging/StageToggle";
import { resolveCollectionMatrix } from "../../platform/model/collectionPlacement";
import { hueStyle, objectLabel } from "../../platform/model/selectionFormat";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { useViewerStore } from "../../platform/stores/viewerStore";
import { MeshObjectActions, meshObjectSize, useMeshLayerRef, useMeshObjectEntry, type MeshLayerRef } from "./MeshObjectSummary";
import { MeshObjectInfoCard } from "./MeshObjectInfoCard";
import { meshObjectBox } from "./useNavigateToMeshObject";
import { useRoiSelectionStoreApi } from "../annotations/roiSelectionStore";

/**
 * The float of a mesh object clicked in the scene: the annotation card's twin
 * (`platform/float/SceneFloat`), beside the object's box on screen, never
 * over it.
 *
 * Opens from the CLICK pick (`FabriksCollectionLayer` → `floatStore.open`),
 * never from `meshSelection`: the meshes panel's rows write that same field,
 * and browsing the list opens nothing. It stays open while the object stays
 * selected; a click on it again (which deselects), Escape, × or a press
 * outside close it — each asking first while it holds staged layers
 * (`features/staging`), as the annotation float does.
 *
 * Nothing shows until the object's catalog entry is known: its box is what the
 * float sits beside.
 */
export const MeshFloat = () => {
  const target = useSceneFloatStore((s) => s.target);
  if (!target || target.kind !== "mesh") return null;
  return <AttachedMeshFloat key={`${target.layerId}:${target.ordinal}`} target={target} />;
};

const AttachedMeshFloat = ({ target }: { target: FloatTarget }) => {
  const layerRef = useMeshLayerRef(target.layerId);
  const entry = useMeshObjectEntry(target.layerId, target.ordinal);
  if (!layerRef || !entry) return null;
  return <Placed target={target} layerRef={layerRef} entry={entry} />;
};

const Placed = ({
  target,
  layerRef,
  entry,
}: {
  target: FloatTarget;
  layerRef: MeshLayerRef;
  entry: NonNullable<ReturnType<typeof useMeshObjectEntry>>;
}) => {
  const floatApi = useSceneFloatStoreApi();
  const transformContext = useSceneStore((s) => s.transformContext);
  const selection = useViewerStore((s) =>
    s.meshSelection?.layerId === target.layerId && s.meshSelection.ordinal === target.ordinal
      ? s.meshSelection
      : null,
  );
  const [fullMenuOpen, setFullMenuOpen] = useState(false);
  const [collectionMenuOpen, setCollectionMenuOpen] = useState(false);
  const close = useCallback(() => floatApi.getState().close(target), [floatApi, target]);
  const owner = meshFloatOwner(target);
  const staging = useFloatStaging(owner, close);

  // The selection is what the float is about: once it moves on (a list row,
  // a clear), the float goes with it — asking first while it holds staged
  // layers, and staying up (without the object's own buttons) until answered.
  const { holding, requestClose } = staging;
  useEffect(() => {
    if (selection) return;
    if (holding) requestClose();
    else close();
  }, [selection, holding, requestClose, close]);

  const box = useMemo(
    () => meshObjectBox(entry, resolveCollectionMatrix(layerRef.layer, layerRef.collection, transformContext)),
    [entry, layerRef, transformContext],
  );
  const anchor = useCallback(
    ({ viewProjection, viewport }: FloatView) => {
      const rect = projectScreenRect(box, viewProjection, viewport);
      return rect ? { kind: "beside" as const, rect } : null;
    },
    [box],
  );
  const collection = useMemo(
    () => ({ id: layerRef.collection.id, label: layerRef.collection.label }),
    [layerRef.collection],
  );
  // The `@mikro/meshobject` structure: what an action on one surface takes.
  const meshObject = useMemo(
    () => ({
      id: `${layerRef.collection.id}:${entry.objectId}`,
      label: `${objectLabel(entry.objectId, target.ordinal)} of ${layerRef.collection.label}`,
    }),
    [layerRef.collection, entry.objectId, target.ordinal],
  );
  // One float at a time: a mesh object's replaces a shape's card.
  const selectionApi = useRoiSelectionStoreApi();
  useEffect(() => {
    if (selectionApi.getState().menuRoi) selectionApi.getState().closeRoiMenu();
  }, [selectionApi]);

  if (!selection && !holding) return null;
  const size = meshObjectSize(selection?.stats ?? null);

  return (
    // Around the whole float, header menu included: whatever an action run
    // from here returns is staged under it.
    <FloatStagingScope owner={owner}>
    <SceneFloat
      anchor={anchor}
      expanded
      dismissable={!fullMenuOpen && !collectionMenuOpen}
      onDismiss={requestClose}
      // A click on a mesh opens its float (this object again, or another).
      sceneClaim={() => floatApi.getState().target}
      button={
        <span
          className="-m-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
          aria-label="Mesh object"
        >
          <span className="h-3 w-3 rounded-sm" style={hueStyle(target.ordinal)} />
        </span>
      }
      header={
        <>
          <span className="min-w-0 flex-1 truncate text-xs">
            <span className="font-medium">{objectLabel(entry.objectId, target.ordinal)}</span>
            {size && <span className="text-muted-foreground">{` · ${size}`}</span>}
          </span>
          <MikroMeshObject.ObjectButton
            object={meshObject}
            open={fullMenuOpen}
            onOpenChange={setFullMenuOpen}
            // A finished action leaves the float open: what it returns is
            // staged here.
            onDone={() => setFullMenuOpen(false)}
          >
            <Button variant="ghost" size="icon-xs" aria-label="Mesh object actions">
              <EllipsisIcon />
            </Button>
          </MikroMeshObject.ObjectButton>
          <Button variant="ghost" size="icon-xs" className="mr-0.5" aria-label="Close" onClick={requestClose}>
            <XIcon />
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2 px-2.5 pb-2.5 pt-1 text-xs">
        {selection && (
          <div className="flex items-center gap-1.5">
            <MeshObjectActions selection={selection} layerRef={layerRef} />
          </div>
        )}
        <div className="flex min-w-0 items-center gap-2 border-t border-border/60 pt-2">
          <span className="shrink-0 text-muted-foreground">In</span>
          <MikroMeshCollection.DetailLink object={collection} className="min-w-0 flex-1 truncate">
            {layerRef.collection.label}
          </MikroMeshCollection.DetailLink>
          {/* The collection's own actions: until producers take
              `@mikro/meshobject`, these are what can run from here. */}
          <MikroMeshCollection.ObjectButton
            object={collection}
            open={collectionMenuOpen}
            onOpenChange={setCollectionMenuOpen}
            onDone={() => setCollectionMenuOpen(false)}
          >
            <Button variant="ghost" size="icon-xs" aria-label="Collection actions">
              <EllipsisIcon />
            </Button>
          </MikroMeshCollection.ObjectButton>
        </div>
        <div className="border-t border-border/60 pt-2">
          <MeshObjectInfoCard collection={layerRef.collection.id} objectId={entry.objectId} />
        </div>
      </div>
      <FloatStagingFooter staging={staging} />
    </SceneFloat>
    </FloatStagingScope>
  );
};
