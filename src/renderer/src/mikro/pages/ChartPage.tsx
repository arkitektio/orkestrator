import type { ApolloError } from "@apollo/client";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { MikroChart, MikroCoordinateSystem } from "@/core/linkers";

import { useGetChartQuery } from "../api/graphql";
import { chartAxisLabel } from "../chartAxis";
import { Chart } from "../components/chart/Chart";
import { MIKRO_HELP } from "../help";

/**
 * A chart: data laid out along one metric axis, with values read off it.
 *
 * ## `errorPolicy: "all"` is load-bearing
 *
 * `ChartLayer.asAffine` ERRORS rather than nulling when a layer's path will
 * not condense to one map. Under the default policy one such layer would
 * discard the whole chart; with "all" Apollo nulls that one field and keeps
 * the rest. The errors are passed to the provider, which is how a layer
 * "placed by a map with no closed form" is told from an unregistered one —
 * they need opposite things said on their cards.
 */
export const ChartPage = asDetailQueryRoute(
  useGetChartQuery,
  (props) => {
    const chart = props.data.chart;
    // The route builder spreads the whole query result in beside `data`.
    const placementErrors = (props as { error?: ApolloError }).error?.graphQLErrors;

    return (
      // The provider wraps the WHOLE ModelPage so the chart's stores reach the
      // right-rail sidebar too — the rail is a sibling panel of the content
      // area, unreachable from anything rendered inside it.
      <Chart.Provider chart={chart} placementErrors={placementErrors}>
        <MikroChart.ModelPage
          variant={"black"}
          overlay
          object={chart}
          help={MIKRO_HELP.chart}
          title={chart.name}
          actions={<MikroChart.Actions object={chart} />}
          additionalSidebars={
            <>
              <Sidebars.Tab label="Layers">
                <Chart.LayersSidebar />
              </Sidebars.Tab>
              {/* Only when there is something to list — see Chart.hasAnnotationLayer. */}
              {Chart.hasAnnotationLayer(chart) && (
                <Sidebars.Tab label="Annotations">
                  <Chart.AnnotationsSidebar />
                </Sidebars.Tab>
              )}
              <Sidebars.Tab label="About">
                <div className="flex flex-col gap-3 p-4 text-sm">
                  {chart.description && (
                    <p className="text-muted-foreground">{chart.description}</p>
                  )}
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      Laid out along
                    </span>
                    <span className="font-mono">{chartAxisLabel(chart.axis)}</span>
                    <MikroCoordinateSystem.DetailLink
                      object={chart.worldCoordinateSystem}
                      className="hover:text-primary"
                    >
                      {chart.worldCoordinateSystem.name}
                    </MikroCoordinateSystem.DetailLink>
                  </div>
                </div>
              </Sidebars.Tab>
            </>
          }
          defaultSidebar="Layers"
          sidebarKey="ChartDetail"
        >
          <div className="relative h-full w-full">
            <Chart.Viewport />
          </div>
        </MikroChart.ModelPage>
      </Chart.Provider>
    );
  },
  { queryOptions: { errorPolicy: "all" } },
);

export default ChartPage;
