import { ListRender } from "@/components/layout/ListRender";
import { RekuestAgent } from "@/linkers";
import {
  AgentFilter,
  AgentOrder,
  OffsetPaginationInput,
  useAgentsQuery,
} from "@/rekuest/api/graphql";
import AgentCard from "../cards/AgentCard";

export type Props = {
  title?: string;
  filters?: AgentFilter;
  pagination?: OffsetPaginationInput;
  order?: AgentOrder
};

const List = ({ filters, pagination, order, title }: Props) => {
  const { data, refetch } = useAgentsQuery({
    variables: { filters, pagination, ordering: order ? [order] : undefined },
  });

  return (
    <ListRender
      array={data?.agents}
      title={
        title ? (
          <div className="text-lg font-semibold">{title}</div>
        ) : (
          <RekuestAgent.ListLink className="flex-0">Latest  Agents</RekuestAgent.ListLink>
        )
      }
      refetch={refetch}
    >
      {(ex) => <AgentCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
