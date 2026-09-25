import { useDialog } from "@/app/dialog";
import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MikroCoordinateSystem } from "@/linkers";
import { Ruler, Waypoints } from "lucide-react";

import {
  useGetCoordinateGraphQuery,
  useGetCoordinateSystemQuery,
} from "../api/graphql";
import SceneCard from "../components/cards/SceneCard";
import CoordinateGraphView, {
  DEFAULT_MAX_DEPTH,
} from "../components/coordinates/CoordinateGraphView";
import EdgeTable, { assumedCount } from "../components/coordinates/EdgeTable";
import { isReferenceFrame, residentLabel } from "../components/coordinates/residents";
import { AnyTransformation } from "../components/coordinates/types";
import { CoordinateSystemInfoSidebar } from "../components/sidebars/CoordinateSystemInfoSidebar";
import { CoordinateSystemProvenanceSidebar } from "../components/sidebars/CoordinateSystemProvenanceSidebar";

/**
 * A coordinate system's page, laid out like `ArrayDatasetPage`: the picture fills
 * the stage and everything *about* it lives in the rail.
 *
 * For a space the picture is the GRAPH. A system's whole meaning is relational
 * — what maps into it, what it maps into, which spaces it reaches — and that is
 * a shape, not a list. It used to sit in a 500px card below four tables of the
 * same edges; here it is the page, on black, and the tables are the rail.
 *
 * A system no longer declares what it is: `residents` is the whole vocabulary,
 * and its emptiness is the only distinction the schema still draws. So the page
 * asks one of two questions:
 *
 *   nothing lives here   what is registered into me, how much do we trust it,
 *                        and which scenes have adopted me as their world?
 *   something lives here who lives here, what reaches me, and what I map into?
 */
export const CoordinateSystemPage = asDetailQueryRoute(
  useGetCoordinateSystemQuery,
  ({ data }) => {
    const system = data.coordinateSystem;
    const { openDialog } = useDialog();

    // The same query CoordinateGraphView fires on the stage — Apollo dedupes
    // it, so the edges cost nothing extra. The list queries deliberately cannot
    // answer "which edges relate to THIS system" (relatedness is transitive);
    // the graph walk is the schema's own answer, so partition its result rather
    // than adding a transformations(filters:) round trip.
    const { data: graphData } = useGetCoordinateGraphQuery({
      // DEFAULT_MAX_DEPTH, not omitted: the dedup this comment relies on is by
      // query AND variables, so leaving maxDepth off here while the view passes
      // it would make these two different queries — a second, unbounded walk
      // fired alongside the bounded one, which is the exact cost being avoided.
      variables: { coordinateSystem: system.id, maxDepth: DEFAULT_MAX_DEPTH },
    });

    const edges: AnyTransformation[] =
      graphData?.coordinateGraph.transformations ?? [];
    const inbound = edges.filter((edge) => edge?.output?.id === system.id);
    const outbound = edges.filter((edge) => edge?.input?.id === system.id);

    // Nothing lives here: a world, an atlas — a space built to be registered
    // into rather than to hold anything of its own.
    const isFrame = isReferenceFrame(system);
    const assumed = assumedCount(inbound);

    const registerButton = (
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          openDialog("register", { target: system.id }, { className: "max-w-3xl" })
        }
      >
        <Waypoints className="mr-2 h-4 w-4" />
        Register…
      </Button>
    );

    // Calibration is a property of the DATASET, not of the space it lives in —
    // the form takes a dataset id — so this only appears when a dataset is one
    // of the residents.
    const calibrateDataset = system.residents.find(
      (resident) => resident.__typename === "ArrayDataset",
    );
    const calibrateButton = calibrateDataset ? (
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          openDialog(
            "calibrate",
            { dataset: calibrateDataset.id },
            { className: "max-w-2xl" },
          )
        }
      >
        <Ruler className="mr-2 h-4 w-4" />
        Calibrate…
      </Button>
    ) : undefined;

    return (
      <MikroCoordinateSystem.ModelPage
        object={system}
        title={system.name}
        variant="black"
        overlay
        actions={<MikroCoordinateSystem.Actions object={system} />}
        pageActions={isFrame ? registerButton : calibrateButton}
        additionalSidebars={
          <>
            <Sidebars.Tab label="Info">
              <CoordinateSystemInfoSidebar system={system} inbound={inbound} />
            </Sidebars.Tab>
            {/* The edges as tables, one direction each. Same data as the graph
                behind them, different question: the picture says what this
                space is connected to, the tables say how much each of those
                connections is worth. */}
            <Sidebars.Tab label="Registrations">
              <div className="flex flex-col gap-4 overflow-y-auto p-4">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row items-baseline justify-between gap-2">
                    <div className="text-xs font-semibold">
                      {isFrame ? "Registered sources" : "Reached from"}
                    </div>
                    {assumed > 0 && (
                      <span className="text-xs text-destructive">
                        {assumed} of {inbound.length} assumed
                      </span>
                    )}
                  </div>
                  <EdgeTable
                    edges={inbound}
                    direction="in"
                    empty={
                      isFrame
                        ? "Nothing is registered into this space yet. Register a dataset, table or another space to place it here."
                        : "Nothing maps into this space."
                    }
                  />
                  {isFrame && registerButton}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-xs font-semibold">Maps into</div>
                  <EdgeTable
                    edges={outbound}
                    direction="out"
                    empty="Nothing is derived from this space: it has no calibration and no registration. Its geometry is only expressed in its own coordinates."
                  />
                  {calibrateButton}
                </div>
              </div>
            </Sidebars.Tab>
            {/* A space is adopted, never owned: several scenes may share one,
                and it outlives each of them. */}
            <Sidebars.Tab label="Scenes">
              <div className="flex flex-col gap-2 overflow-y-auto p-4">
                <div className="flex flex-row items-baseline justify-between gap-2">
                  <div className="text-xs font-semibold">Worlded here</div>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {system.scenes.length}
                  </span>
                </div>
                {system.scenes.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    No scenes use this coordinate system as their world yet.
                  </span>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {system.scenes.map((scene) => (
                      <SceneCard key={scene.id} scene={scene} />
                    ))}
                  </div>
                )}
              </div>
            </Sidebars.Tab>
            <Sidebars.Tab label="Provenance">
              <CoordinateSystemProvenanceSidebar id={system.id} />
            </Sidebars.Tab>
          </>
        }
        defaultSidebar="Info"
        sidebarKey="CoordinateSystemDetail"
      >
        <div className="relative h-full w-full">
          {/* Bottom-right: the page owns the top-left corner (the title
              below) and React Flow parks its zoom controls bottom-left. */}
          <CoordinateGraphView
            coordinateSystem={system.id}
            legendPosition="bottom-right"
          />

          {/* Page chrome, not graph chrome: positioned by the page so it sits
              in the same corner whatever the walk returned. `pointer-events` is
              opted into by the card alone, so the flow stays pannable all
              around it. `z-40` clears the flow's own panels. */}
          <div className="pointer-events-none absolute left-3 top-3 z-40 flex max-w-[50%] flex-col gap-1">
            <MikroCoordinateSystem.DetailLink
              object={system}
              className="pointer-events-auto ellipsis truncate break-all text-3xl font-semibold leading-tight text-ellipsis"
            >
              {system.name}
            </MikroCoordinateSystem.DetailLink>
            <div className="flex flex-row flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {[...system.axes]
                  .sort((a, b) => a.order - b.order)
                  .map((axis) => axis.name)
                  .join(" ") || "no axes"}
              </span>
              {/* What this space is, said the only way the schema still says
                  it: by who lives in it. */}
              <Badge
                variant="outline"
                className="font-sans text-[0.625rem]"
                title={
                  isFrame
                    ? "Nothing lives in this space. Sources register into it and scenes adopt it as their world; it outlives every scene over it."
                    : "The data living in this space."
                }
              >
                {residentLabel(system)}
              </Badge>
              {/* The schema asks for exactly one thing to be loud: an assumed
                  placement must be visible. A count on the stage, the edges
                  themselves one tab away. */}
              {assumed > 0 && (
                <Badge variant="destructive" className="font-sans text-[0.625rem]">
                  {assumed}{" "}
                  {inbound.length === 1 ? "placement is" : "placements are"}{" "}
                  assumed
                </Badge>
              )}
            </div>
          </div>
        </div>
      </MikroCoordinateSystem.ModelPage>
    );
  },
);

export default CoordinateSystemPage;
