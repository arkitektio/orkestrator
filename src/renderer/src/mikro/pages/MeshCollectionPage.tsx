import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { MikroCoordinateSystem, MikroFolder, MikroMeshCollection } from "@/core/linkers";

import { useGetMeshCollectionQuery, type GetMeshCollectionQuery } from "../api/graphql";
import {
  MeshCollectionBackdrop,
  MeshTitleOverlay,
  useMeshCollectionScene,
} from "../components/meshcollection/MeshCollectionWorkspace";
import { Scene } from "../components/scene/Scene";
import { sceneSidebarTabs, WorkspaceViewport } from "../components/scene/workspaceScene";
import { DerivedFromSection } from "../components/sidebars/DerivedFromSection";
import { MIKRO_HELP } from "../help";

type PageCollection = GetMeshCollectionQuery["meshCollection"];

/**
 * One mesh collection, opened: its meshes in a scene, like an array dataset's
 * page. It lands on the scene its whole lens nominates, else the first it is
 * drawn in; a collection in no scene yet offers to open one. The Meshes tab
 * lists every mesh; each has a page of its own (`MeshObjectPage`).
 */
export const MeshCollectionPage = asDetailQueryRoute(useGetMeshCollectionQuery, ({ data }) => {
  const collection = data.meshCollection;
  const { activeSceneId, selectScene, scene, sceneLoading } = useMeshCollectionScene(collection);

  return (
    <Scene.Provider scene={scene}>
      <MikroMeshCollection.ModelPage
        object={collection}
        help={MIKRO_HELP.meshCollection}
        title={collection.label}
        overlay
        actions={<MikroMeshCollection.Actions object={collection} />}
        pageActions={
          <MikroMeshCollection.ObjectButton alwaysShow object={collection}>
            Meshes
          </MikroMeshCollection.ObjectButton>
        }
        additionalSidebars={
          <>
            {sceneSidebarTabs(scene)}
            <Sidebars.Tab label="Info">
              <MeshCollectionInfo collection={collection} />
            </Sidebars.Tab>
          </>
        }
        defaultSidebar="Meshes"
        sidebarKey="MeshCollectionDetail"
      >
        <div className="relative h-full w-full">
          <WorkspaceViewport
            scene={scene}
            activeSceneId={activeSceneId}
            empty={<MeshCollectionBackdrop collection={collection} onSceneCreated={selectScene} />}
          />
          <MeshTitleOverlay
            title={collection.label}
            subtitle={collection.coordinateSystem.name}
            collection={collection}
            activeSceneId={activeSceneId}
            onSelectScene={selectScene}
            sceneLoading={sceneLoading}
          />
        </div>
      </MikroMeshCollection.ModelPage>
    </Scene.Provider>
  );
});

/** The collection's facts: its space, its folder, and what it was made from. */
export const MeshCollectionInfo = ({ collection }: { collection: PageCollection }) => (
  <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
    <div className="flex flex-col gap-1">
      <MikroMeshCollection.DetailLink object={collection} className="break-all text-lg font-semibold">
        {collection.label}
      </MikroMeshCollection.DetailLink>
      {collection.folder && (
        <MikroFolder.DetailLink object={collection.folder} className="text-xs text-muted-foreground hover:underline">
          in {collection.folder.name}
        </MikroFolder.DetailLink>
      )}
    </div>
    <div className="flex flex-col gap-1">
      <div className="text-xs font-semibold">Coordinate system</div>
      <MikroCoordinateSystem.DetailLink
        object={collection.coordinateSystem}
        className="break-all font-mono text-xs text-muted-foreground hover:underline"
      >
        {collection.coordinateSystem.name}
      </MikroCoordinateSystem.DetailLink>
    </div>
    <DerivedFromSection edges={collection.derivedFrom} />
  </div>
);

export default MeshCollectionPage;
