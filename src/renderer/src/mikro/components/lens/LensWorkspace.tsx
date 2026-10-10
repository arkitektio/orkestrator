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
import { describeLens, isWholeLens } from "../../lenses";
import { useSceneOpen } from "../../lib/zarr/useDatalayerWarmup";
import { DatasetBackdrop } from "../arraydataset/DatasetBackdrop";
import { Scene } from "../scene/Scene";
import { DatasetFacts } from "../sidebars/DatasetInfoSidebar";
import { LensBackdrop } from "./LensBackdrop";
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

  const isArray = lens.__typename === "ArrayLens";
  const listed = isArray ? lens.scenes : lens.defaultScene ? [lens.defaultScene] : [];
  // Only a scene this page actually lists: a stale link must fall back to the
  // nomination rather than open a scene of something else under this title.
  const requested = searchParams.get(SCENE_PARAM);
  const listedSceneId = listed.find((scene) => scene.id === requested)?.id;
  const defaultSceneId = lens.defaultScene?.id;
  const sliced = !isWholeLens(lens);

  // A non-array lens cannot list its scenes, so a link naming one is checked
  // against the scene itself: it counts when one of its layers draws this
  // lens. Same query the viewport runs below, so the answer is a cache read by
  // the time the scene mounts. Until it answers the link is taken at its word.
  const linked = !isArray && requested && !listedSceneId ? requested : undefined;
  const { data: linkedData } = useGetSceneQuery({
    variables: { id: linked as string },
    skip: !linked,
    errorPolicy: "all",
  });
  const linkedScene = linkedData?.scene;
  const linkedRefused =
    !!linkedScene &&
    !linkedScene.layers.some((layer) => "lens" in layer && layer.lens.id === lens.id);
  const selectedSceneId = listedSceneId ?? (linkedRefused ? undefined : linked);
  const scenes =
    linkedScene && !linkedRefused
      ? [...listed, { id: linkedScene.id, name: linkedScene.name }]
      : listed;

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

  const description = describeLens(lens);

  return (
    // The provider wraps the WHOLE ModelPage so the Layers sidebar tab (a
    // sibling panel of the content area) reaches the scene stores. Null scene
    // = "no scene selected"; the tab says so instead of listing layers.
    <Scene.Provider scene={sceneData?.scene ?? null}>
      <MikroLens.ModelPage
        object={lens}
        help={MIKRO_HELP.lens}
        title={`${description.container.name} · ${description.title}`}
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
          ) : lens.__typename === "ArrayLens" && dataset ? (
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
          )}

          {/* Page chrome, not scene chrome: outside the branch above, so it is
              the same card in the same place whether or not a scene is on
              screen. */}
          <LensTitleOverlay
            dataset={dataset}
            lens={lens}
            scenes={scenes}
            activeSceneId={activeSceneId}
            onSelectScene={selectScene}
            sceneLoading={sceneLoading}
          />
        </div>
      </MikroLens.ModelPage>
    </Scene.Provider>
  );
};
