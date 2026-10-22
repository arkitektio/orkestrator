import { Sidebars } from "@/core/layout/Sidebars";
import { lensSmart } from "@/core/linkers";
import { DetailLensFragment, GetArrayDatasetQuery } from "../../api/graphql";
import { MIKRO_HELP } from "../../help";
import { describeLens, isWholeLens } from "../../lenses";
import { DatasetBackdrop } from "../arraydataset/DatasetBackdrop";
import { Scene } from "../scene/Scene";
import { sceneSidebarTabs, useWorkspaceScene, WorkspaceViewport } from "../scene/workspaceScene";
import { DatasetFacts } from "../sidebars/DatasetInfoSidebar";
import { LensBackdrop } from "./LensBackdrop";
import { LensInfoSection } from "./LensInfoSection";
import { LensTitleOverlay } from "./LensTitleOverlay";
import { LensesSidebar } from "./LensesSidebar";

type PageDataset = GetArrayDatasetQuery["arrayDataset"];

export { SCENE_PARAM } from "../scene/workspaceScene";

/**
 * The page people work on data in: a viewport, the scenes that draw it, and the
 * lens it is about.
 *
 * One shell for every kind of lens. A container — an array dataset, a table, a
 * mesh collection — is where lenses are listed and cut, and what gets opened,
 * looked at and handed to a task is always a lens: the whole container (the
 * lens that cuts nothing) or a part of it. So the page reads top to bottom as
 * the hierarchy it sits in: the container it belongs to, the lens it IS, the
 * scene it is drawn in.
 *
 * Everything the page asks, it asks of the lens — its scenes, its nomination.
 * For the whole array the server answers those with the dataset's own (they
 * are one thing), so "Make default" there re-tiles the dataset; for a cut they
 * are the cut's alone.
 *
 * **Only an array lens can list its scenes.** The other kinds know the one
 * scene they nominate and nothing else, so their switcher holds that scene,
 * plus whichever scene a link names (`?scene=`) once it is seen to draw this
 * lens. A scene staged from a whole table and never nominated is therefore
 * reachable from the scene list, not from here, until the backend can list a
 * lens' scenes for every kind.
 *
 * An array lens passes its `dataset` alongside for what only that container
 * knows: the pyramid behind the backdrop, the spaces it is registered into, its
 * facts in the Info tab.
 */
export const LensWorkspace = ({
  dataset,
  lens,
}: {
  /** The array lens' dataset. Absent for every other kind. */
  dataset?: PageDataset;
  lens: DetailLensFragment;
}) => {
  // Every scene with a layer drawing this lens or a selection within it, for
  // every kind of lens: the server derives it from the coordinate graph.
  const scenes = lens.scenes;
  const defaultSceneId = lens.defaultScene?.id;
  const sliced = !isWholeLens(lens);

  // The nominated scene is the one to land in — it is a choice someone made, and
  // it is also where the thumbnail comes from, so opening anything else would
  // show a different picture than the card that was clicked.
  //
  // For a cut, only when that scene actually DRAWS it. A cut that nominates
  // nothing answers with its dataset's nomination (so it still has a tile), and
  // landing a cut's page on a picture of the whole array would be exactly the
  // thing this page exists to stop doing. The whole array's nomination is the
  // dataset's and is honoured as it is — it may well stage the dataset's
  // neighbourhood rather than the dataset alone.
  const nominated = sliced
    ? scenes.find((scene) => scene.id === defaultSceneId)?.id
    : defaultSceneId;
  const { activeSceneId, selectScene, scene, sceneLoading } = useWorkspaceScene({ scenes, landOn: nominated });

  const description = describeLens(lens);
  const LensSmart = lensSmart(lens.__typename);

  return (
    // The provider wraps the WHOLE ModelPage so the Layers sidebar tab (a
    // sibling panel of the content area) reaches the scene stores. Null scene
    // = "no scene selected"; the tab says so instead of listing layers.
    <Scene.Provider scene={scene}>
      <LensSmart.ModelPage
        object={lens}
        help={MIKRO_HELP.lens}
        title={`${description.container.name} · ${description.title}`}
        variant="black"
        overlay
        actions={<LensSmart.Actions object={lens} />}
        pageActions={
          // ONE button, and it says what it acts on: everything launched from
          // this page is handed the lens on screen. What is done to the dataset
          // as a whole — filing it, deleting it — is on the dataset's own page.
          <LensSmart.ObjectButton alwaysShow object={lens}>
            Run on lens
          </LensSmart.ObjectButton>
        }
        additionalSidebars={
          <>
            {sceneSidebarTabs(scene)}
            <Sidebars.Tab label="Lenses">
              <LensesSidebar lens={lens} dataset={dataset} />
            </Sidebars.Tab>
            {/* The lens leads with its own — what it selects, what was computed
                from that — then, for an array, the facts of the dataset it
                reads from. The container's lineage and history are on the
                container's page. */}
            <Sidebars.Tab label="Info">
              <div className="flex h-full flex-col overflow-y-auto">
                <LensInfoSection lens={lens} />
                {dataset && (
                  <div className="flex flex-col gap-4 p-4">
                    <DatasetFacts dataset={dataset} />
                  </div>
                )}
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
            empty={
              lens.__typename === "ArrayLens" && dataset ? (
                <DatasetBackdrop
                  dataset={dataset}
                  lens={lens}
                  // Creating a scene here does NOT leave the page: this page
                  // already renders scenes, so the new one is simply the one now
                  // selected — the switcher lists it (the mutation awaits a
                  // refetch) and the viewport remounts on its id.
                  onSceneCreated={selectScene}
                />
              ) : (
                <LensBackdrop lens={lens} onSceneCreated={selectScene} />
              )
            }
          />

          {/* Page chrome, not scene chrome: outside the viewport, so it is the
              same card in the same place whether or not a scene is on screen. */}
          <LensTitleOverlay
            dataset={dataset}
            lens={lens}
            scenes={scenes}
            activeSceneId={activeSceneId}
            onSelectScene={selectScene}
            sceneLoading={sceneLoading}
          />
        </div>
      </LensSmart.ModelPage>
    </Scene.Provider>
  );
};
