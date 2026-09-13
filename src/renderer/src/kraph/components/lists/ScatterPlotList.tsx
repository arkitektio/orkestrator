import { ListRender } from "@/components/layout/ListRender";
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
      // Plain text: `/kraph/graphqueries` is not a route, and a plot's list is
      // scoped to the query or graph showing it rather than being global.
      title={<span className="flex-0">Scatter Plots</span>}
      refetch={refetch}
    >
      {(ex) => <ScatterPlotCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
