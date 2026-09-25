import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { useSceneOpen } from "../lib/zarr/useDatalayerWarmup";
import { Sidebars } from "@/components/layout/Sidebars";
import { Card } from "@/components/ui/card";
import { MikroAnnotation } from "@/linkers";

import {
  GetAnnotationQuery,
  useGetAnnotationQuery,
  useGetSceneQuery,
} from "../api/graphql";
import { AnnotationGlyph } from "../components/annotations/AnnotationGlyph";
import CoordinateGraphView from "../components/coordinates/CoordinateGraphView";
import { Scene } from "../components/scene/Scene";
import { FocusAnnotationOnMount } from "../components/scene/features/annotations/FocusAnnotationOnMount";
import { AnnotationInfoSidebar } from "../components/sidebars/AnnotationInfoSidebar";

type PageAnnotation = GetAnnotationQuery["annotation"];

/**
 * One drawn shape, opened where it was drawn.
 *
 * An annotation is stored as raw vectors in its collection's own coordinate
 * system, which means it is unreadable on its own — a list of numbers in a
 * space nothing on the page names. So the page opens the collection's scene,
 * selects the shape and flies to it: the composition around it IS the context
 * that makes the numbers mean something. The rail then carries the space
 * itself, the registration graph that places it, and whether that placement
 * still matches the one the shape was drawn under.
 */
const Page = asDetailQueryRoute(useGetAnnotationQuery, ({ data }) => {
  const annotation = data.annotation;
  // The collection's own scene, and only that. A collection's space is
  // registered INTO a world, never IS one, so the scenes worlded on
  // `coordinateSystem` would be empty for essentially every annotation — a
  // fallback that never fires is worse than none.
  const scene = annotation.collection.scene ?? null;

  // Same as ArrayDatasetPage: this page mounts the full scene stack, so it owns
  // a cold open and must warm the datalayer for it.
  useSceneOpen(scene?.id);

  const { data: sceneData, loading: sceneLoading } = useGetSceneQuery({
    variables: { id: scene?.id as string },
    skip: !scene,
    // See ScenePage: a layer whose `asAffine` cannot condense must null that
    // one field, not discard the scene.
    errorPolicy: "all",
  });

  return (
    // The provider wraps the WHOLE ModelPage so the Layers and Annotations rail
    // tabs reach the scene stores — the rail is a sibling panel of the content
    // area, unreachable from anything rendered inside it.
    <Scene.Provider scene={sceneData?.scene ?? null}>
      <MikroAnnotation.ModelPage
        variant="black"
        overlay
        object={annotation}
        title={annotation.name}
        actions={<MikroAnnotation.Actions object={annotation} />}
        additionalSidebars={
          <>
            <Sidebars.Tab label="Info">
              <AnnotationInfoSidebar annotation={annotation} />
            </Sidebars.Tab>
            {/* The space the vectors are written in, and every edge that
                places it — the same tab the table dataset page carries. */}
            <Sidebars.Tab label="Space">
              {annotation.coordinateSystem ? (
                <div className="h-full w-full">
                  <CoordinateGraphView
                    coordinateSystem={annotation.coordinateSystem.id}
                  />
                </div>
              ) : (
                <div className="p-4 text-sm text-muted-foreground">
                  This annotation names no coordinate system.
                </div>
              )}
            </Sidebars.Tab>
            <Sidebars.Tab label="Layers">
              <Scene.LayersSidebar />
            </Sidebars.Tab>
            <Sidebars.Tab label="Annotations">
              <Scene.AnnotationsSidebar />
            </Sidebars.Tab>
            {/* Only when there is something to list — see Scene.hasMeshLayer. */}
            {Scene.hasMeshLayer(sceneData?.scene) && (
              <Sidebars.Tab label="Meshes">
                <Scene.MeshesSidebar />
              </Sidebars.Tab>
            )}
          </>
        }
        defaultSidebar="Info"
        sidebarKey="AnnotationDetail"
      >
        <div className="relative h-full w-full">
          {sceneData?.scene ? (
            <>
              {/* A SIBLING of the viewport, not a child: viewport children
                  replace the default panel stack. Keyed on the scene like the
                  viewport, since the stores are rebuilt per scene. */}
              <FocusAnnotationOnMount annotation={annotation} />
              <Scene.Viewport key={sceneData.scene.id}>
                <Scene.Dock side="right">
                  <Scene.ZSlider />
                </Scene.Dock>
                <Scene.Dock side="bottom">
                  <Scene.DimSliders />
                </Scene.Dock>
              </Scene.Viewport>
            </>
          ) : scene || sceneLoading ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="text-sm text-muted-foreground">Loading scene…</div>
            </div>
          ) : (
            <AnnotationWithoutScene annotation={annotation} />
          )}
        </div>
      </MikroAnnotation.ModelPage>
    </Scene.Provider>
  );
});

/**
 * The shape on its own, for a collection that was never minted for a scene.
 *
 * Not a viewport with nothing in it: a null-scene `Scene.Viewport` says "no
 * scene selected", which reads as a page that failed rather than as an
 * annotation drawn over something other than a composition. The glyph is
 * normalized to the shape's own bounds, so it shows the form and says nothing
 * about scale — there is no path to world here to make scale honest.
 */
const AnnotationWithoutScene = ({
  annotation,
}: {
  annotation: PageAnnotation;
}) => (
  <div className="flex h-full w-full items-center justify-center p-8">
    <Card className="flex max-w-md flex-col items-center gap-4 p-6">
      <div className="h-40 w-40">
        <AnnotationGlyph annotation={annotation} />
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-sm font-medium">{annotation.kind}</span>
        <span className="text-xs text-muted-foreground">
          Drawn in {annotation.collection.name}, which was not minted for a
          scene — there is no composition to open it in. Its space and the edges
          that place it are in the Space tab.
        </span>
      </div>
    </Card>
  </div>
);

export default Page;
