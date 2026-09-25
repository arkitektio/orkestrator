import { ListRender } from "@/core/layout/ListRender";
import { RekuestBlok } from "@/core/linkers";
import {
  AgentFilter,
  OffsetPaginationInput,
  useListBloksQuery,
} from "@/rekuest/api/graphql";
import BlokCard from "../cards/BlokCard";

export type Props = {
  filters?: AgentFilter;
  pagination?: OffsetPaginationInput;
};

const List = (_props: Props) => {
  const { data, refetch } = useListBloksQuery({});

  return (
    <ListRender
      array={data?.bloks}
      title={
        <RekuestBlok.ListLink className="flex-0">Bloks</RekuestBlok.ListLink>
      }
      refetch={() => refetch()}
    >
      {(ex) => <BlokCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
