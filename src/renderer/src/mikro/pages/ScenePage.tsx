import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { MikroScene } from "@/core/linkers";
import { useParams } from "react-router-dom";
import {
  useGetSceneQuery
} from "../api/graphql";
import { Scene } from "../components/scene/Scene";
import { SceneTitleOverlay } from "../components/scene/SceneTitleOverlay";
import { useLiveScene } from "../components/scene/sceneHost";
import { coldOpenTimeline } from "../components/scene/platform/perf/coldOpenTimeline";
import { useSceneOpen } from "../lib/zarr/useDatalayerWarmup";
import { MIKRO_HELP } from "../help";

export type IRepresentationScreenProps = {};

/**
 * Layers others add, edit or remove — an agent bound to the scene, a second
 * window — show up while the page is open. Each event carries the whole layer
 * and is written into the cached scene, so following costs no refetch.
 */
const LiveLayers = ({ sceneId }: { sceneId: string }) => {
  useLiveScene(sceneId);
  return null;
};

const DetailPage = asDetailQueryRoute(
  useGetSceneQuery,
  ({ data, id }) => {
    // The query has resolved by the time this renders — everything above this
    // point was the route gate. Repeat stamps are dropped by the timeline, so
    // a re-render costs nothing and needs no guard here.
    coldOpenTimeline.stamp("sceneQuery");
    return (
      // The provider wraps the WHOLE ModelPage so the scene stores reach the
      // right-rail sidebar too — the rail is a sibling panel of the content
      // area, unreachable from anything rendered inside it.
      <Scene.Provider scene={data.scene}>
        <LiveLayers sceneId={data.scene.id} />
        <MikroScene.ModelPage
          overlay
          actions={<MikroScene.Actions object={id} />}
          object={data.scene}
          help={MIKRO_HELP.scene}
          title={data?.scene?.name}
          additionalSidebars={
            <>
              <Sidebars.Tab label="Layers"><Scene.LayersSidebar /></Sidebars.Tab>
              <Sidebars.Tab label="Probe"><Scene.ProbeSidebar /></Sidebars.Tab>
              {/* Only when there is something to list — see Scene.hasMeshLayer. */}
              {Scene.hasMeshLayer(data.scene) && (
                <Sidebars.Tab label="Meshes"><Scene.MeshesSidebar /></Sidebars.Tab>
              )}
              <Sidebars.Tab label="Animations"><Scene.AnimationsSidebar /></Sidebars.Tab>
            </>
          }
          defaultSidebar="Layers"
          sidebarKey="SceneDetail"
        >
          <div className="w-full h-full relative">
            <Scene.Viewport />
            <SceneTitleOverlay scene={data.scene} />
          </div>
        </MikroScene.ModelPage>
      </Scene.Provider>
    );
  },
  {
    // Partial data beats no data for a viewer. `Layer.asAffine` is documented
    // to ERROR (not return null) when a path exists but will not condense — a
    // FIELD/displacement step has no closed form, a singular step cannot be
    // walked backwards. Under Apollo's default policy that one field would
    // discard the entire scene; here it comes back null, and `asAffine` being
    // the ONLY placement authority, that layer is simply not drawn
    // (`isPlaceable`) and its card says why. The rest of the scene renders.
    queryOptions: { errorPolicy: "all" },
  },
);

/**
 * Wrapper that exists to sit ABOVE the query gate.
 *
 * `asDetailQueryRoute` renders `<LoadingPage/>` until `GetScene` resolves, so
 * nothing inside it can observe — or overlap — that round trip. This is the
 * outermost point that knows a scene is being opened, which makes it the honest
 * origin for the cold-open timeline (and, in a later phase, the place to warm
 * the datalayer while the query is still in flight).
 */
const Page = (props: { direct?: unknown }) => {
  const { id } = useParams<{ id: string }>();

  // Above the query gate, which is the whole point of this wrapper: credentials,
  // the WebGPU adapter and the decode workers do not depend on the scene, so
  // they overlap `GetScene` instead of queueing behind it.
  useSceneOpen(id);

  return <DetailPage {...props} />;
};

export default Page;
