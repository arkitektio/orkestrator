import { asDetailQueryRoute } from '@/app/routes/DetailQueryRoute'
import { useSceneOpen } from "../lib/zarr/useDatalayerWarmup";
import { Sidebars } from "@/components/layout/Sidebars";
import { MikroArrayDataset } from '@/linkers'
import { useCallback, useState } from 'react'
import { useGetArrayDatasetQuery, useGetSceneQuery } from '../api/graphql'
import { DatasetBackdrop } from '../components/arraydataset/DatasetBackdrop'
import { MoveToFolderButton } from '../components/folder/MoveToFolderButton'
import { DatasetTitleOverlay } from '../components/arraydataset/DatasetTitleOverlay'
import { Scene } from '../components/scene/Scene'
import { DatasetInfoSidebar } from '../components/sidebars/DatasetInfoSidebar'

export const ArrayDatasetPage = asDetailQueryRoute(useGetArrayDatasetQuery, ({ data }) => {
  const dataset = data.arrayDataset
  const [selectedSceneId, setSelectedSceneId] = useState<string>()

  // Creating a scene here does NOT leave the page: this page already renders
  // scenes, so the new one is simply the one now selected — the switcher lists
  // it (the mutation awaits a GetArrayDataset refetch) and the viewport remounts on
  // its id.
  const handleSceneCreated = useCallback(
    (sceneId: string) => setSelectedSceneId(sceneId),
    []
  )

  // The nominated scene is the one to land in — `defaultScene` is a choice
  // someone made, and it is also where the dataset's thumbnail comes from, so
  // opening anything else would show a different picture than the card that was
  // clicked. Falling back to the first scene keeps a dataset that nominates
  // nothing (the nomination is null until something sets it) openable as before.
  const activeSceneId =
    selectedSceneId ?? dataset.defaultScene?.id ?? dataset.scenes.at(0)?.id

  // The dataset only carries ListScene (id + name) for the switcher — the
  // renderer needs layers and the world, so the active scene is fetched in
  // full the same way ScenePage does. Apollo caches it, so switching back
  // is free.
  // Start the cold-open timeline and warm the datalayer the moment we know
  // WHICH scene to open — this page mounts the scene stack exactly as
  // ScenePage does, and is the route most users actually arrive through.
  useSceneOpen(activeSceneId)

  const { data: sceneData, loading: sceneLoading } = useGetSceneQuery({
    variables: { id: activeSceneId as string },
    skip: !activeSceneId,
    // See ScenePage: a layer whose `asAffine` cannot condense must null that
    // one field, not discard the scene.
    errorPolicy: 'all'
  })

  return (
    // The provider wraps the WHOLE ModelPage so the Layers sidebar tab (a
    // sibling panel of the content area) reaches the scene stores. Null scene
    // = "no scene selected"; the tab says so instead of listing layers.
    <Scene.Provider scene={sceneData?.scene ?? null}>
    <MikroArrayDataset.ModelPage
      object={dataset}
      title={dataset.name}
      variant="black"
      overlay
      actions={<MikroArrayDataset.Actions object={dataset} />}
      pageActions={
        <div className="flex items-center gap-2">
          {/* `folder` is nullable and the null is meaningful — a dataset nobody
              filed reads "Unfiled", which is not the same as not knowing. */}
          <MoveToFolderButton
            subject={{ kind: "arrayDataset", ids: [dataset.id] }}
            currentFolder={dataset.folder ?? null}
          />
          <MikroArrayDataset.ObjectButton object={dataset} />
        </div>
      }
      additionalSidebars={
        <>
          <Sidebars.Tab label="Layers"><Scene.LayersSidebar /></Sidebars.Tab>
          <Sidebars.Tab label="Annotations"><Scene.AnnotationsSidebar /></Sidebars.Tab>
          {/* Only when there is something to list — see Scene.hasMeshLayer. */}
          {Scene.hasMeshLayer(sceneData?.scene) && (
            <Sidebars.Tab label="Meshes"><Scene.MeshesSidebar /></Sidebars.Tab>
          )}
          {/* No separate "Derived" tab: what this dataset came from and what
              came out of it are both in Info, next to the facts they explain. */}
          <Sidebars.Tab label="Info">
            <DatasetInfoSidebar dataset={dataset} />
          </Sidebars.Tab>
        </>
      }
      defaultSidebar="Layers"
      sidebarKey="SceneDetail"
    >
      <div className="relative h-full w-full">
        {/* Keyed on the scene id: the renderer builds its stores per scene, so
              switching scenes must remount rather than feed a new scene into
              components primed for the old one. */}
        {sceneData?.scene ? (
          // Just the scrubbers: the view settings this page used to float in a
          // left-hand column are a gear in the viewport's bottom-right HUD, so
          // the title card below has the top-left corner to itself.
          <Scene.Viewport key={sceneData.scene.id}>
            <Scene.Dock side="right">
              <Scene.ZSlider />
            </Scene.Dock>
            <Scene.Dock side="bottom">
              <Scene.DimSliders />
            </Scene.Dock>
          </Scene.Viewport>
        ) : activeSceneId ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-sm text-muted-foreground">Loading scene…</div>
          </div>
        ) : (
          <DatasetBackdrop dataset={dataset} onSceneCreated={handleSceneCreated} />
        )}

        {/* Page chrome, not scene chrome: outside the branch above, so it is the
            same card in the same place whether or not a scene is on screen. */}
        <DatasetTitleOverlay
          dataset={dataset}
          activeSceneId={activeSceneId}
          onSelectScene={setSelectedSceneId}
          sceneLoading={sceneLoading}
        />
      </div>
    </MikroArrayDataset.ModelPage>
    </Scene.Provider>
  )
})

export default ArrayDatasetPage
