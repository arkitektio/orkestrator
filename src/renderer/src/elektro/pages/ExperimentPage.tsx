import type { ApolloError } from "@apollo/client";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { ElektroExperiment } from "@/linkers";
import { useGetExperimentSceneQuery } from "../api/graphql";
import { ExperimentScene } from "../components/experiment/ExperimentScene";
import { parseBrushRange } from "../components/experiment/platform/coords/brushRange";

/**
 * An experiment: its layers — traces, spike rasters, event tables, annotations —
 * laid out on one timeline.
 *
 * ## `errorPolicy: "all"` is load-bearing
 *
 * `ExperimentLayer.asAffine` ERRORS rather than nulling when a layer's path will
 * not condense to one matrix — any layer timed by a lookup (a variable-time-step
 * run). Under the default policy one such layer would discard the whole
 * experiment. With "all", Apollo nulls that one field and keeps
 * the rest, and the page passes the ERRORS on too: they are how the renderer tells
 * "timed by a lookup" (drawable) from "unregistered" (not), which need opposite
 * affordances.
 *
 * ## `?brush=`
 *
 * The URL's window seeds the scope once; after that the renderer owns the window
 * and writes it back (`TimeRangeUrlSync`). The numbers are milliseconds of world
 * time now, not sample indices — see `brushRange.ts`.
 *
 * Laid out like mikro's `ScenePage`: the Provider wraps the whole
 * ModelPage, because the rail is a sibling of the content area and must reach the
 * same stores.
 */
export const ExperimentPage = asDetailQueryRoute(
  useGetExperimentSceneQuery,
  (props) => {
    const { data } = props;
    // Spread in by `asDetailQueryRoute` with the rest of the QueryResult.
    const error = (props as { error?: ApolloError }).error;
    const experiment = data.experiment;
    const [searchParams] = useSearchParams();

    // Read once for the scope build; the provider ignores later changes to it.
    const initialRange = useMemo(() => {
      const parsed = parseBrushRange(searchParams.get("brush"));
      return parsed.right == null ? null : { start: parsed.left ?? 0, end: parsed.right };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <ExperimentScene.Provider
        experiment={experiment}
        placementErrors={error?.graphQLErrors}
        initialRange={initialRange}
      >
        <ElektroExperiment.ModelPage
          object={experiment}
          title={experiment.name}
          variant="black"
          overlay
          pageActions={
            <div className="flex items-center gap-2">
              <ElektroExperiment.ObjectButton object={experiment} />
            </div>
          }
          additionalSidebars={
            <>
              <Sidebars.Tab label="Layers">
                <ExperimentScene.LayersSidebar />
              </Sidebars.Tab>
              <Sidebars.Tab label="Annotations">
                <ExperimentScene.AnnotationsSidebar />
              </Sidebars.Tab>
            </>
          }
          defaultSidebar="Layers"
          sidebarKey="ExperimentDetail"
        >
          <div className="flex h-full w-full flex-col">
            <div className="flex-initial px-3 pb-2 pt-3">
              <h1 className="truncate text-lg font-semibold">{experiment.name}</h1>
              {experiment.description && (
                <p className="truncate text-xs text-muted-foreground">
                  {experiment.description}
                </p>
              )}
            </div>
            <div className="min-h-0 w-full flex-1 overflow-hidden">
              <ExperimentScene.Viewport />
            </div>
          </div>
        </ElektroExperiment.ModelPage>
      </ExperimentScene.Provider>
    );
  },
  { queryOptions: { errorPolicy: "all" } },
);

export default ExperimentPage;
