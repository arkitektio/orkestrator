import { Sidebars } from "@/core/layout/Sidebars";
import { MikroLens } from "@/core/linkers";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DetailLensFragment,
  GetArrayDatasetQuery,
  useGetSceneQuery,
} from "../../api/graphql";
import { MIKRO_HELP } from "../../help";
import { lensTitle } from "../../lenses";
import { useSceneOpen } from "../../lib/zarr/useDatalayerWarmup";
import { DatasetBackdrop } from "../arraydataset/DatasetBackdrop";
import { Scene } from "../scene/Scene";
import { DatasetFacts } from "../sidebars/DatasetInfoSidebar";
import { LensInfoSection } from "./LensInfoSection";
import { LensTitleOverlay } from "./LensTitleOverlay";
import { LensesSidebar } from "./LensesSidebar";

type PageDataset = GetArrayDatasetQuery["arrayDataset"];

/** The query parameter naming the scene on screen: `/mikro/lenses/12?scene=40`. */
export const SCENE_PARAM = "scene";

/**
 * The page people work on data in: a viewport, the scenes that draw it, and the
 * lens it is about.
 *
 * The app's ONLY viewer for array data. A dataset is a container — its page
 * lists its lenses and is where they are cut — and what gets opened, looked at
 * and handed to a task is always a lens: the whole array (the lens that cuts
 * nothing) or a part of it. So the page reads top to bottom as the hierarchy it
 * sits in: the dataset it belongs to, the lens it IS, the scene it is drawn in.
 *
 * Everything the page asks, it asks of the lens — its scenes, its nomination.
 * For the whole array the server answers those with the dataset's own (they
 * are one thing), so "Make default" there re-tiles the dataset; for a cut they
 * are the cut's alone.
 *
 * The dataset is passed alongside for what only the container knows: the
 * pyramid behind the backdrop, the spaces it is registered into, its sibling
 * lenses.
 */
export const LensWorkspace = ({
  dataset,
  lens,
}: {
  dataset: PageDataset;
  lens: DetailLensFragment;
}) => {
  // Which scene is on screen lives in the URL (`?scene=`), not in component
  // state: an action that stages a scene from elsewhere — the context menu, the
  // object button — can then send someone straight to it, on this page, without
  // the page having to be told. `replace` so flipping between scenes does not
  // fill the back stack.
  const [searchParams, setSearchParams] = useSearchParams();
  const selectScene = useCallback(
    (sceneId: string) =>
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set(SCENE_PARAM, sceneId);
          return next;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  const scenes = lens.scenes;
  // Only a scene this page actually lists: a stale link must fall back to the
  // nomination rather than open a scene of something else under this title.
  const requested = searchParams.get(SCENE_PARAM);
  const selectedSceneId = scenes.find((scene) => scene.id === requested)?.id;
  const defaultSceneId = lens.defaultScene?.id;
  const sliced = lens.slices.length > 0;

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
  const activeSceneId = selectedSceneId ?? nominated ?? scenes.at(0)?.id;

  // Start the cold-open timeline and warm the datalayer the moment we know
  // WHICH scene to open — this is the route most users actually arrive through.
  useSceneOpen(activeSceneId);

  // The page only carries ListScene (id + name) for the switcher — the renderer
  // needs layers and the world, so the active scene is fetched in full the same
  // way ScenePage does. Apollo caches it, so switching back is free.
  const { data: sceneData, loading: sceneLoading } = useGetSceneQuery({
    variables: { id: activeSceneId as string },
    skip: !activeSceneId,
    // See ScenePage: a layer whose `asAffine` cannot condense must null that
    // one field, not discard the scene.
    errorPolicy: "all",
  });

  return (
    // The provider wraps the WHOLE ModelPage so the Layers sidebar tab (a
    // sibling panel of the content area) reaches the scene stores. Null scene
    // = "no scene selected"; the tab says so instead of listing layers.
    <Scene.Provider scene={sceneData?.scene ?? null}>
      <MikroLens.ModelPage
        object={lens}
        help={MIKRO_HELP.lens}
        title={`${dataset.name} · ${lensTitle(lens)}`}
        variant="black"
        overlay
        actions={<MikroLens.Actions object={lens} />}
        pageActions={
          // ONE button, and it says what it acts on: everything launched from
          // this page is handed the lens on screen. What is done to the dataset
          // as a whole — filing it, deleting it — is on the dataset's own page.
          <MikroLens.ObjectButton alwaysShow object={lens}>
            Run on lens
          </MikroLens.ObjectButton>
        }
        additionalSidebars={
          <>
            <Sidebars.Tab label="Layers"><Scene.LayersSidebar /></Sidebars.Tab>
            <Sidebars.Tab label="Annotations"><Scene.AnnotationsSidebar /></Sidebars.Tab>
            <Sidebars.Tab label="Probe"><Scene.ProbeSidebar /></Sidebars.Tab>
            {/* Only when there is something to list — see Scene.hasMeshLayer. */}
            {Scene.hasMeshLayer(sceneData?.scene) && (
              <Sidebars.Tab label="Meshes"><Scene.MeshesSidebar /></Sidebars.Tab>
            )}
            <Sidebars.Tab label="Lenses">
              <LensesSidebar dataset={dataset} activeLensId={lens.id} />
            </Sidebars.Tab>
            {/* The lens leads with its own — what it selects, what was computed
                from that — then the facts of the dataset it reads from. The
                dataset's lineage and history are on the dataset's page. */}
            <Sidebars.Tab label="Info">
              <div className="flex h-full flex-col overflow-y-auto">
                <LensInfoSection lens={lens} />
                <div className="flex flex-col gap-4 p-4">
                  <DatasetFacts dataset={dataset} />
                </div>
              </div>
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
            // Just the scrubbers: the view settings are a gear in the
            // viewport's bottom-right HUD, so the title card below has the
            // top-left corner to itself.
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
            <DatasetBackdrop
              dataset={dataset}
              lens={lens}
              // Creating a scene here does NOT leave the page: this page
              // already renders scenes, so the new one is simply the one now
              // selected — the switcher lists it (the mutation awaits a
              // refetch) and the viewport remounts on its id.
              onSceneCreated={selectScene}
            />
          )}

          {/* Page chrome, not scene chrome: outside the branch above, so it is
              the same card in the same place whether or not a scene is on
              screen. */}
          <LensTitleOverlay
            dataset={dataset}
            lens={lens}
            activeSceneId={activeSceneId}
            onSelectScene={selectScene}
            sceneLoading={sceneLoading}
          />
        </div>
      </MikroLens.ModelPage>
    </Scene.Provider>
  );
};
