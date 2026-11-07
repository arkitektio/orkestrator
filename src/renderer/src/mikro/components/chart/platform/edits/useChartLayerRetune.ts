import { useCallback } from "react";
import { reportError } from "@/core/notify";
import {
  useUpdateDistributionChartLayerMutation,
  useUpdatePointsChartLayerMutation,
  useUpdateSeriesChartLayerMutation,
  type UpdateDistributionChartLayerInput,
  type UpdatePointsChartLayerInput,
  type UpdateSeriesChartLayerInput,
} from "@/mikro/api/graphql";

/**
 * Change what a layer READS -- its columns, its grouping, its bins -- through
 * its kind's own update, as a scene layer is retuned.
 *
 * Unlike a restyle (`useChartLayerWrite`) this is structural: there is no
 * optimistic overlay, because the layer must be read again. The mutation is
 * followed by a refetch of `GetChart`; the fold sees a new structure key
 * (columns, bins and filters are part of it) and the layer rereads. A refusal
 * -- a text column as a position, a unit the chart's other layers disagree
 * with -- is the server's sentence, shown as it is.
 */
export const useChartLayerRetune = () => {
  const options = { refetchQueries: ["GetChart"], awaitRefetchQueries: true };
  const [points] = useUpdatePointsChartLayerMutation(options);
  const [distribution] = useUpdateDistributionChartLayerMutation(options);
  const [series] = useUpdateSeriesChartLayerMutation(options);

  const run = useCallback(async (label: string, mutate: () => Promise<unknown>): Promise<boolean> => {
    try {
      await mutate();
      return true;
    } catch (error) {
      reportError(error, `Couldn't change what ${label} reads`);
      return false;
    }
  }, []);

  return {
    points: useCallback(
      (label: string, input: UpdatePointsChartLayerInput) => run(label, () => points({ variables: { input } })),
      [run, points],
    ),
    distribution: useCallback(
      (label: string, input: UpdateDistributionChartLayerInput) => run(label, () => distribution({ variables: { input } })),
      [run, distribution],
    ),
    series: useCallback(
      (label: string, input: UpdateSeriesChartLayerInput) => run(label, () => series({ variables: { input } })),
      [run, series],
    ),
  };
};
