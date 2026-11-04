import type { QueryHookOptions } from "@apollo/client";

import { asDetailQueryRoute, type DetailVariables } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { MikroMeshCollection, MikroMeshObject } from "@/core/linkers";

import { useGetMeshObjectQuery, type GetMeshObjectQuery } from "../api/graphql";
import {
  MeshCollectionBackdrop,
  MeshTitleOverlay,
  useMeshCollectionScene,
} from "../components/meshcollection/MeshCollectionWorkspace";
import { parseMeshObjectId } from "../components/meshcollection/meshObjectId";
import { RESIDENT_ICON, isNamedResident, residentLink, residentName } from "../components/residents/residentLinks";
import { Scene } from "../components/scene/Scene";
import { sceneSidebarTabs, WorkspaceViewport } from "../components/scene/workspaceScene";
import { MIKRO_HELP } from "../help";

type PageObject = GetMeshObjectQuery["meshObject"];


/** The route's one `id`, as `meshObject(collection:, object:)` asks for it. */
const useMeshObjectById = (options: QueryHookOptions<GetMeshObjectQuery, DetailVariables>) => {
  const parsed = parseMeshObjectId(options.variables?.id ?? "");
  // Only the fetch policy carries over: the route's options are typed for
  // `{ id }`, and the variables are this hook's to build.
  return useGetMeshObjectQuery({
    fetchPolicy: options.fetchPolicy,
    variables: { collection: parsed?.collection ?? "", object: parsed?.object ?? 0 },
    skip: Boolean(options.skip) || !parsed,
  });
};

/**
 * One mesh of a collection, as a page of its own: the collection's scene with
 * this mesh selected and framed (`Scene.SelectMeshObject`), and what was made
 * from it. Linked from wherever a mesh is named — a table row that measures
 * it, its collection's Meshes tab.
 */
export const MeshObjectPage = asDetailQueryRoute(
  useMeshObjectById as unknown as Parameters<typeof asDetailQueryRoute<GetMeshObjectQuery>>[0],
  ({ data }) => {
    const object = data.meshObject;
    const collection = object.collection;
    const { activeSceneId, selectScene, scene, sceneLoading } = useMeshCollectionScene(collection);
    const structure = { id: object.id, label: `Object ${object.objectId} of ${collection.label}` };

    return (
      <Scene.Provider scene={scene}>
        <Scene.SelectMeshObject collectionId={collection.id} objectId={object.objectId} />
        <MikroMeshObject.ModelPage
          object={structure}
          help={MIKRO_HELP.meshObject}
          title={structure.label}
          overlay
          pageActions={
            <MikroMeshObject.ObjectButton alwaysShow object={structure}>
              Mesh
            </MikroMeshObject.ObjectButton>
          }
          additionalSidebars={
            <>
              <Sidebars.Tab label="Info">
                <MeshObjectInfo object={object} />
              </Sidebars.Tab>
              {sceneSidebarTabs(scene)}
            </>
          }
          defaultSidebar="Info"
          sidebarKey="MeshObjectDetail"
        >
          <div className="relative h-full w-full">
            <WorkspaceViewport
              scene={scene}
              activeSceneId={activeSceneId}
              empty={<MeshCollectionBackdrop collection={collection} onSceneCreated={selectScene} />}
            />
            <MeshTitleOverlay
              title={`Object ${object.objectId}`}
              subtitle={collection.label}
              collection={collection}
              activeSceneId={activeSceneId}
              onSelectScene={selectScene}
              sceneLoading={sceneLoading}
            />
          </div>
        </MikroMeshObject.ModelPage>
      </Scene.Provider>
    );
  },
);

/** The mesh's facts: which collection it is in, and what was computed from it. */
const MeshObjectInfo = ({ object }: { object: PageObject }) => {
  const residents = object.derivedResidents.filter(isNamedResident);
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-col gap-1">
        <div className="text-lg font-semibold">Object {object.objectId}</div>
        <MikroMeshCollection.DetailLink object={object.collection} className="text-xs text-muted-foreground hover:underline">
          in {object.collection.label}
        </MikroMeshCollection.DetailLink>
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Computed from this mesh</div>
        {residents.length === 0 ? (
          <span className="text-xs text-muted-foreground">Nothing yet.</span>
        ) : (
          residents.map((resident) => {
            const Icon = RESIDENT_ICON[resident.__typename];
            const body = (
              <>
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 truncate">{residentName(resident)}</span>
              </>
            );
            const link = residentLink(resident);
            const row = "flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-muted";
            return (
              <div key={`${resident.__typename}:${resident.id}`}>
                {link ? link({ className: row, children: body }) : <span className={row}>{body}</span>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MeshObjectPage;
