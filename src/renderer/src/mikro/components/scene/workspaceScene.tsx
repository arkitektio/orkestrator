import { Sidebars } from "@/core/layout/Sidebars";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { GetSceneQuery, useGetSceneQuery } from "../../api/graphql";
import { useSceneOpen } from "../../lib/zarr/useDatalayerWarmup";
import { Scene } from "./Scene";

/** The query parameter naming the scene on screen: `/mikro/lenses/12?scene=40`. */
export const SCENE_PARAM = "scene";

/**
 * Which scene a workspace page draws, and that scene in full. Shared by the
 * pages that are a viewport over one thing's scenes: an array dataset (its
 * whole array) and a lens.
 *
 * Which scene is on screen lives in the URL (`?scene=`), not in component
 * state: an action that stages a scene from elsewhere — the context menu, the
 * object button — can then send someone straight to it, on this page, without
 * the page having to be told. `replace` so flipping between scenes does not
 * fill the back stack.
 *
 * Only a scene in `scenes` is honoured: a stale link falls back to `landOn`
 * (the page's nomination), then to the first scene.
 */
export const useWorkspaceScene = ({
  scenes,
  landOn,
}: {
  scenes: readonly { id: string }[];
  landOn: string | undefined;
}) => {
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

  const requested = searchParams.get(SCENE_PARAM);
  const selectedSceneId = scenes.find((scene) => scene.id === requested)?.id;
  const activeSceneId = selectedSceneId ?? landOn ?? scenes.at(0)?.id;

  // Start the cold-open timeline and warm the datalayer the moment we know
  // WHICH scene to open — this is the route most users actually arrive through.
  useSceneOpen(activeSceneId);

  // The page only carries ListScene (id + name) for the switcher — the renderer
  // needs layers and the world, so the active scene is fetched in full the same
  // way ScenePage does. Apollo caches it, so switching back is free.
  const { data, loading } = useGetSceneQuery({
    variables: { id: activeSceneId as string },
    skip: !activeSceneId,
    // See ScenePage: a layer whose `asAffine` cannot condense must null that
    // one field, not discard the scene.
    errorPolicy: "all",
  });

  return { activeSceneId, selectScene, scene: data?.scene ?? null, sceneLoading: loading };
};

/**
 * The sidebar tabs every scene workspace has: what the viewport draws and how
 * to look into it. Rendered inside `Scene.Provider`, which the page wraps
 * around its whole ModelPage so these sibling panels reach the scene stores.
 */
export const sceneSidebarTabs = (scene: GetSceneQuery["scene"] | null) => (
  <>
    <Sidebars.Tab label="Layers"><Scene.LayersSidebar /></Sidebars.Tab>
    <Sidebars.Tab label="Annotations"><Scene.AnnotationsSidebar /></Sidebars.Tab>
    <Sidebars.Tab label="Probe"><Scene.ProbeSidebar /></Sidebars.Tab>
    {/* Only when there is something to list — see Scene.hasMeshLayer. */}
    {Scene.hasMeshLayer(scene) && (
      <Sidebars.Tab label="Meshes"><Scene.MeshesSidebar /></Sidebars.Tab>
    )}
  </>
);

/**
 * The workspace's canvas: the scene once it has arrived, a loading line while
 * it is on its way, and `empty` (the page's "create a scene" backdrop) when
 * there is no scene to draw.
 */
export const WorkspaceViewport = ({
  scene,
  activeSceneId,
  empty,
}: {
  scene: GetSceneQuery["scene"] | null;
  activeSceneId: string | undefined;
  empty: React.ReactNode;
}) => {
  // Keyed on the scene id: the renderer builds its stores per scene, so
  // switching scenes must remount rather than feed a new scene into
  // components primed for the old one.
  if (scene) {
    // Just the scrubbers: the view settings are a gear in the viewport's
    // bottom-right HUD, so the title card has the top-left corner to itself.
    return (
      <Scene.Viewport key={scene.id}>
        <Scene.Dock side="right">
          <Scene.ZSlider />
        </Scene.Dock>
        <Scene.Dock side="bottom">
          <Scene.DimSliders />
        </Scene.Dock>
      </Scene.Viewport>
    );
  }
  if (activeSceneId) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading scene…</div>
      </div>
    );
  }
  return <>{empty}</>;
};
