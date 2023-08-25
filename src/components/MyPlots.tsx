import React, { useEffect, useState } from "react";
import { ListRender } from "../layout/SectionTitle";
import { MikroPlot } from "../linker";
import { useDeletePlotMate } from "../mates/plot/useDeletePlotMate";
import { withMikro } from "../mikro/MikroContext";
import { useMyPlotsQuery } from "../mikro/api/graphql";
import { PlotCard } from "../mikro/components/cards/PlotCard";
import { DataHomeFilterParams } from "../mikro/pages/Home";
export type IMySamplesProps = {};

export const SampleType = "Sample";

const limit = 20;

export const MyPlots: React.FC<IMySamplesProps & DataHomeFilterParams> = ({
  createdDay,
  limit,
}) => {
  const variables = { limit: limit, offset: 0, createdDay: createdDay };
  const { data, loading, refetch, subscribeToMore } = withMikro(
    useMyPlotsQuery
  )({
    variables,
  });

  const deletePlotMate = useDeletePlotMate();
  const [show, setshow] = useState(false);

  const [offset, setOffset] = useState(0);

  useEffect(() => {
    refetch();
  }, [offset, limit]);

  return (
    <ListRender
      array={data?.myplots}
      loading={loading}
      title={<MikroPlot.ListLink className="flex-0">Plots</MikroPlot.ListLink>}
      refetch={refetch}
    >
      {(plot, index) => (
        <PlotCard key={index} plot={plot} mates={[deletePlotMate(plot)]} />
      )}
    </ListRender>
  );
};
