import { asDetailQueryRoute } from '@/core/layout/routes/DetailQueryRoute'
import { Sidebars } from '@/core/layout/Sidebars'
import { MikroArrayDataset } from '@/core/linkers'
import { reportErrorAs } from '@/core/notify'
import { Badge } from '@/core/ui/badge'
import { GetArrayDatasetQuery, useGetArrayDatasetQuery, useSetDefaultSceneMutation } from '../api/graphql'
import { DatasetBackdrop } from '../components/arraydataset/DatasetBackdrop'
import { MoveToFolderButton } from '../components/folder/MoveToFolderButton'
import { INVERTED, InvertedText } from '../components/lens/InvertedText'
import { Scene } from '../components/scene/Scene'
import { SceneSwitcher } from '../components/scene/SceneSwitcher'
import { sceneSidebarTabs, useWorkspaceScene, WorkspaceViewport } from '../components/scene/workspaceScene'
import { DatasetFacts, DatasetLineage } from '../components/sidebars/DatasetInfoSidebar'
import { MIKRO_HELP } from '../help'
import { baseDtypeOf, formatShape } from '../specs'

type PageDataset = GetArrayDatasetQuery['arrayDataset']

/**
 * The dataset's name, shape and scene, over the canvas: the same inverted
 * card as a lens' title (`LensTitleOverlay`), without the lens. Which part of
 * the data a scene draws is the scene's business, set in its layers.
 */
const DatasetTitleOverlay = ({
  dataset,
  activeSceneId,
  onSelectScene,
  sceneLoading
}: {
  dataset: PageDataset
  activeSceneId: string | undefined
  onSelectScene: (id: string) => void
  sceneLoading: boolean
}) => {
  // Selects `latestSnapshot` with the nomination, so every card showing the
  // dataset re-tiles from the cache without a refetch.
  const [setDefaultScene, { loading: nominating }] = useSetDefaultSceneMutation()
  const dtype = baseDtypeOf(dataset.dataArrays)

  return (
    <div className="pointer-events-auto absolute left-6 top-4 flex w-[50%] flex-col gap-2 rounded-lg">
      <div className="flex flex-col gap-0.5">
        <h1 className="min-w-0 text-3xl font-semibold leading-tight">
          <InvertedText>{dataset.name}</InvertedText>
        </h1>
        <div className="flex items-center gap-2 font-mono text-xs">
          <InvertedText>{formatShape(dataset.axisNames, dataset.shape)}</InvertedText>
          {dtype && <InvertedText className="shrink-0">{dtype}</InvertedText>}
          {dataset.multiscale && (
            <Badge variant="outline" className={`border-white/60 font-sans text-[0.625rem] ${INVERTED}`}>
              multiscale
            </Badge>
          )}
        </div>
      </div>

      <SceneSwitcher
        scenes={dataset.scenes}
        activeSceneId={activeSceneId}
        defaultSceneId={dataset.defaultScene?.id}
        onSelectScene={onSelectScene}
        nominating={nominating}
        onMakeDefault={(scene) =>
          setDefaultScene({ variables: { dataset: dataset.id, scene } }).catch(
            reportErrorAs("Couldn't make this the default scene")
          )
        }
      />

      {sceneLoading && <InvertedText className="text-xs">Loading scene…</InvertedText>}
    </div>
  )
}

/**
 * One array dataset, opened: its scene in a viewport. It lands on the scene
 * the dataset nominates (the one its tile is taken from), else the first scene
 * it is drawn in; `?scene=` picks another. A dataset in no scene yet shows the
 * backdrop that stages one.
 *
 * There is no lens to pick here: a scene's layers say which part of the data
 * each draws, and are where that is changed. The facts of the dataset — what
 * it is, where it came from, what was computed from it — are in the Info tab,
 * and the page's object button acts on the dataset (file it, calibrate it,
 * delete it).
 */
export const ArrayDatasetPage = asDetailQueryRoute(useGetArrayDatasetQuery, ({ data }) => {
  const dataset = data.arrayDataset
  const { activeSceneId, selectScene, scene, sceneLoading } = useWorkspaceScene({
    scenes: dataset.scenes,
    // A nomination need not be one of `scenes` (it may stage the dataset's
    // neighbourhood), and is honoured as it is.
    landOn: dataset.defaultScene?.id
  })

  return (
    // Around the whole ModelPage, so the sidebar tabs reach the scene stores.
    <Scene.Provider scene={scene}>
      <MikroArrayDataset.ModelPage
        object={dataset}
        help={MIKRO_HELP.arrayDataset}
        title={dataset.name}
        variant="black"
        overlay
        actions={<MikroArrayDataset.Actions object={dataset} />}
        pageActions={
          <>
            {/* `folder` is nullable and the null is meaningful — a dataset nobody
                filed reads "Unfiled", which is not the same as not knowing. */}
            <MoveToFolderButton
              subject={{ kind: 'arrayDataset', ids: [dataset.id] }}
              currentFolder={dataset.folder ?? null}
            />
            <MikroArrayDataset.ObjectButton alwaysShow object={dataset}>
              Dataset
            </MikroArrayDataset.ObjectButton>
          </>
        }
        additionalSidebars={
          <>
            {sceneSidebarTabs(scene)}
            <Sidebars.Tab label="Info">
              <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
                <DatasetFacts dataset={dataset} />
                <DatasetLineage dataset={dataset} />
              </div>
            </Sidebars.Tab>
          </>
        }
        defaultSidebar="Layers"
        sidebarKey="SceneDetail"
      >
        <div className="relative h-full w-full">
          <WorkspaceViewport
            scene={scene}
            activeSceneId={activeSceneId}
            // Staging a scene here does not leave the page: the new scene is
            // simply the one now selected.
            empty={<DatasetBackdrop dataset={dataset} onSceneCreated={selectScene} />}
          />
          <DatasetTitleOverlay
            dataset={dataset}
            activeSceneId={activeSceneId}
            onSelectScene={selectScene}
            sceneLoading={sceneLoading}
          />
        </div>
      </MikroArrayDataset.ModelPage>
    </Scene.Provider>
  )
})

export default ArrayDatasetPage
