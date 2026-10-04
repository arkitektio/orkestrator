import { KraphScatterPlot } from "@/core/linkers";
import { ListRender } from "@/core/layout/ListRender";
import {
  OffsetPaginationInput,
  ScatterPlotFilter,
  useListScatterPlotsQuery
} from "../../api/graphql";
import ScatterPlotCard from "../cards/ScatterPlotCard";

export type Props = {
  filters?: ScatterPlotFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, error, refetch } = useListScatterPlotsQuery({
    variables: { filters, pagination },
  });

  return (
    <ListRender
      error={error}
      array={data?.scatterPlots}
      title={<KraphScatterPlot.ListLink className="flex-0">Scatter Plots</KraphScatterPlot.ListLink>}
      refetch={refetch}
    >
      {(ex) => <ScatterPlotCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
