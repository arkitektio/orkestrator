import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { MikroScene } from "@/linkers";
import { useParams } from "react-router-dom";
import { useGetSceneQuery } from "../api/graphql";
import { Registration } from "../components/registration/Registration";
import { Scene } from "../components/scene/Scene";
import { useSceneOpen } from "../lib/zarr/useDatalayerWarmup";

/**
 * Align the layers of a scene — `/mikro/scenes/:id/register`.
 *
 * A page of its own, deliberately NOT a mode of `ScenePage`: the scene page is
 * a viewer and stays one; registration is a task with a session, a draft and a
 * save, which a user opts into from a scene ("Align Layers…"). The workspace
 * (`components/registration`) composes over the scene renderer through its
 * public surface only — `Scene.*` to render, `scene/sceneHost.ts` to preview a
 * placement and pick points — so nothing here reaches into the viewer, and the
 * viewer knows nothing of this page.
 *
 * What opening it costs: a new route is a new scene scope (the zarr arrays are
 * re-opened and the canvas is rebuilt), exactly as opening the scene itself is.
 * The datalayer warm-up below overlaps that with the query, as on `ScenePage`.
 */
const DetailPage = asDetailQueryRoute(
  useGetSceneQuery,
  ({ data, id }) => (
    <Scene.Provider scene={data.scene}>
      {/* The session store sits ABOVE the page's sidebar tabs: a tab unmounts
          while another is showing, and checking the Layers tab mid-alignment
          must not end the session. */}
      <Registration.Provider>
        <MikroScene.ModelPage
          variant={"black"}
          overlay
          actions={<MikroScene.Actions object={id} />}
          object={data.scene}
          title={`Align · ${data.scene.name}`}
          additionalSidebars={
            <>
              <Sidebars.Tab label="Registration"><Registration.Sidebar /></Sidebars.Tab>
              {/* Aligning means comparing: contrast, channels and visibility
                  of BOTH layers have to be within reach. */}
              <Sidebars.Tab label="Layers"><Scene.LayersSidebar /></Sidebars.Tab>
            </>
          }
          defaultSidebar="Registration"
          sidebarKey="SceneRegistration"
        >
          <div className="relative h-full w-full">
            <Scene.Viewport inCanvas={<Registration.CanvasLayer />} />
            <div className="pointer-events-auto absolute left-3 top-3 z-40 flex w-[50%] flex-col gap-0.5">
              <div className="text-xs font-medium uppercase tracking-wide text-amber-400">Aligning layers</div>
              {/* The way back: the scene itself. */}
              <MikroScene.DetailLink
                object={data.scene}
                className="truncate break-all text-3xl font-semibold leading-tight"
              >
                {data.scene.name}
              </MikroScene.DetailLink>
            </div>
          </div>
        </MikroScene.ModelPage>
      </Registration.Provider>
    </Scene.Provider>
  ),
  {
    // As on ScenePage: `asAffine` ERRORS for an uncomposable path, and one
    // unplaceable layer must not discard the scene — here least of all, since
    // an unplaced layer is exactly what someone may have come to register.
    queryOptions: { errorPolicy: "all" },
  },
);

const Page = (props: { direct?: unknown }) => {
  const { id } = useParams<{ id: string }>();
  useSceneOpen(id);
  return <DetailPage {...props} />;
};

export default Page;
