import { useCallback, useEffect, useMemo, useState } from "react";
import { EyeIcon, LayersIcon, PlayIcon, XIcon } from "lucide-react";

import { MikroMeshCollection } from "@/core/linkers";
import { SmartContext } from "@/core/smart/extensions/context";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/util/utils";
import { useGetMeshObjectInfoQuery } from "@/mikro/api/graphql";

import { projectScreenRect } from "../../platform/float/projectScreenRect";
import { SceneFloat, type FloatView } from "../../platform/float/SceneFloat";
import {
  meshFloatOwner,
  useSceneFloatStore,
  useSceneFloatStoreApi,
  type FloatTarget,
} from "../../platform/float/floatStore";
import { FloatMenu, type FloatMenuEntry } from "../../platform/float/FloatMenu";
import { StagedPane, useFloatStaging } from "../staging/FloatStaging";
import { isNamedResident } from "../staging/DerivedResidents";
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
 * outside close it, discarding whatever it staged and nobody kept
 * (`features/staging`), as the annotation float does.
 *
 * Its body is the same short menu: Run (on this object, or its collection),
 * Derived (what was computed from this one surface) and, while something is
 * staged, In the scene. Go to and Isolate sit in the line above it.
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

const MESH_OBJECT = "@mikro/meshobject";
const MESH_COLLECTION = "@mikro/meshcollection";

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
  const close = useCallback(() => floatApi.getState().close(target), [floatApi, target]);
  const owner = meshFloatOwner(target);
  const staging = useFloatStaging(owner);
  const [pane, setPane] = useState<string | null>(null);

  // The selection is what the float is about: once it moves on (a list row,
  // a clear), the float goes with it.
  useEffect(() => {
    if (!selection) close();
  }, [selection, close]);

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
  // One float at a time: a mesh object's replaces a shape's card.
  const selectionApi = useRoiSelectionStoreApi();
  useEffect(() => {
    if (selectionApi.getState().menuRoi) selectionApi.getState().closeRoiMenu();
  }, [selectionApi]);

  // Asked here too, for the Derived row's count; the pane's own query shares it.
  const { data: info } = useGetMeshObjectInfoQuery({
    variables: { collection: layerRef.collection.id, object: entry.objectId },
    fetchPolicy: "cache-and-network",
  });
  const derived = info?.meshObject.derivedResidents.filter(isNamedResident).length;

  if (!selection) return null;
  const size = meshObjectSize(selection.stats);
  const staged = staging.entries.length;

  const entries: FloatMenuEntry[] = [
    {
      id: "staged",
      label: "In the scene",
      icon: EyeIcon,
      accent: true,
      hidden: staged === 0,
      hint: `${staged} not saved`,
      content: () => <StagedPane staging={staging} />,
    },
    {
      id: "run",
      label: "Run",
      icon: PlayIcon,
      hint: "on this object",
      content: () => <RunPane objectId={`${layerRef.collection.id}:${entry.objectId}`} objectLabel={objectLabel(entry.objectId, target.ordinal)} collection={collection} />,
    },
    {
      id: "derived",
      label: "Derived",
      icon: LayersIcon,
      hint: derived ?? "…",
      content: () => (
        <div className="px-1.5 pb-2 pt-1 text-xs">
          <MeshObjectInfoCard collection={layerRef.collection.id} objectId={entry.objectId} />
        </div>
      ),
    },
  ];

  return (
    // Around the whole float: whatever an action run from here returns is
    // staged under it, and closing it discards what nobody kept.
    <FloatStagingScope owner={owner}>
    <SceneFloat
      anchor={anchor}
      expanded
      dismissable
      onDismiss={close}
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
          <Button variant="ghost" size="icon-xs" className="mr-0.5" aria-label="Close" onClick={close}>
            <XIcon />
          </Button>
        </>
      }
    >
      <FloatMenu
        entries={entries}
        pane={pane}
        onPaneChange={setPane}
        autoFocus
        summary={
          <div className="flex items-center gap-1.5">
            <span className="shrink-0">in</span>
            <MikroMeshCollection.DetailLink object={collection} className="min-w-0 flex-1 truncate text-foreground">
              {layerRef.collection.label}
            </MikroMeshCollection.DetailLink>
            <MeshObjectActions selection={selection} layerRef={layerRef} compact />
          </div>
        }
      />
    </SceneFloat>
    </FloatStagingScope>
  );
};

/**
 * What runs from the mesh float: on this one object (`@mikro/meshobject`),
 * or on the collection it belongs to — one switch, one list, never both.
 */
const RunPane = ({
  objectId,
  objectLabel: label,
  collection,
}: {
  objectId: string;
  objectLabel: string;
  collection: { id: string; label: string };
}) => {
  const [on, setOn] = useState<"object" | "collection">("object");
  const objects = useMemo(
    () =>
      on === "object"
        ? [{ identifier: MESH_OBJECT, id: objectId, label: `${label} of ${collection.label}` }]
        : [{ identifier: MESH_COLLECTION, id: collection.id, label: collection.label }],
    [on, objectId, label, collection],
  );
  return (
    <div className="flex flex-col gap-1.5 px-1.5 pb-2 pt-1.5">
      <div className="flex gap-0.5 rounded-md bg-muted/60 p-0.5 text-xs" role="tablist" aria-label="Run on">
        {(["object", "collection"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={on === value}
            className={cn(
              "h-6 flex-1 rounded-[5px] outline-none focus-visible:ring-2 focus-visible:ring-ring",
              on === value ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setOn(value)}
          >
            {value === "object" ? "This object" : "Its collection"}
          </button>
        ))}
      </div>
      <SmartContext key={on} objects={objects} className="max-h-64 bg-transparent" />
    </div>
  );
};
