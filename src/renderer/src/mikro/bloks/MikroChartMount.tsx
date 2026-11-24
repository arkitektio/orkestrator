import * as React from "react";

import { asStructure } from "@arkitektio/bsx/renderer/bloks/shared/index";
import { useBlok, useValue, type BlokRenderArgs } from "@arkitektio/bsx/renderer/runtime/index";
import { plotMap } from "@/core/blok/mount/frame";
import { usePlotMounts, usePlotNotice, usePlotRow } from "@/core/blok/plot/plotMounts";
import { PlotScopeGuard } from "@/core/data/plot/scope/plotScope";
import type { TimeWindow } from "@/core/data/plot/stores/rangeStore";
import { bandKey } from "@/core/data/plot/stores/viewerStore";
import { useGetChartQuery } from "@/mikro/api/graphql";
import { Chart } from "@/mikro/components/chart/Chart";

import { mikroChartMountSchema } from "./index";

const ROW_COLOR = "#a3a3a3";

/**
 * A mikro chart's lines in a `Plot`: its axis (name, type, unit) converted into the plot's
 * by its mikro-style `transform`, its rows squeezed into one row of the plot.
 */
export const MikroChartMountRender = ({ component }: BlokRenderArgs) => {
  const blok = useBlok(component, mikroChartMountSchema);
  const value = asStructure(useValue(blok.value));
  const transform = useValue(blok.transform);
  const output = useValue(blok.output);
  const mounts = usePlotMounts();
  const { data, error } = useGetChartQuery({
    variables: { id: String(value?.object ?? "") },
    skip: !value,
    // As ChartPage: a layer whose placement cannot condense nulls that field, not the chart.
    errorPolicy: "all",
  });
  const chart = data?.chart ?? null;
  const axis = chart?.axis ?? null;

  const placementKey = JSON.stringify([transform ?? null, output ?? null]);
  const map = React.useMemo(
    () =>
      axis && mounts
        ? plotMap(
            { name: axis.name, type: axis.type ?? "SPACE", unit: axis.unit ?? null },
            { name: mounts.axis.name, unit: mounts.axis.unit },
            transform,
            output,
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [axis?.name, axis?.type, axis?.unit, mounts, placementKey],
  );

  usePlotRow(mounts, component.id, chart?.name ?? "Chart", ROW_COLOR, null);
  const problem = !value
    ? null
    : !data && error
      ? `The chart could not be loaded: ${error.message}`
      : chart && !axis
        ? `${chart.name} lays nothing along an axis: it cannot be mounted in a Plot.`
        : (map?.error ?? null);
  usePlotNotice(mounts, component.id, problem && chart ? `${chart.name}: ${problem}` : problem);

  const onSpan = React.useCallback(
    (span: TimeWindow | null) => mounts?.reportSpan(component.id, span),
    [mounts, component.id],
  );
  const scaled = React.useMemo(() => (map ? { scale: map.scale, offset: map.offset } : null), [map]);

  if (!mounts || !chart || !scaled) return null;
  return (
    <Chart.Provider chart={chart} placementErrors={error?.graphQLErrors}>
      <PlotScopeGuard fallback={null}>
        <Chart.Mount
          base={{ range: mounts.range, viewer: mounts.viewer, origin: mounts.plot.getState().timeOrigin }}
          map={scaled}
          bandKey={bandKey(component.id, 0)}
          onSpan={onSpan}
        />
      </PlotScopeGuard>
    </Chart.Provider>
  );
};
