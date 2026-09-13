import { ListRender } from "@/components/layout/ListRender";
import { KraphGraph } from "@/linkers";
import {
  GraphFilter,
  OffsetPaginationInput,
  useListGraphsQuery,
} from "../../api/graphql";
import GraphCard from "../cards/GraphCard";

export type Props = {
  filters?: GraphFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, refetch } = useListGraphsQuery({
    variables: { filters, pagination },
  });

  return (
    <ListRender
      array={data?.graphs}
      title={
        <KraphGraph.ListLink className="flex-0">Graphs</KraphGraph.ListLink>
      }
      refetch={refetch}
    >
      {(ex) => <GraphCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
