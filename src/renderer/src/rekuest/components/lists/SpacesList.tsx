import { ListRender } from "@/components/layout/ListRender";
import { RekuestSpace } from "@/linkers";
import {
  AgentFilter,
  OffsetPaginationInput,
  useSpacesQuery,
} from "@/rekuest/api/graphql";
import SpaceCard from "../cards/SpaceCard";

export type Props = {
  filters?: AgentFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, refetch } = useSpacesQuery({
    variables: { filters, pagination },
  });

  return (
    <ListRender
      array={data?.spaces}
      title={
        <RekuestSpace.ListLink className="flex-0">
          Spaces
        </RekuestSpace.ListLink>
      }
      refetch={refetch}
    >
      {(ex) => <SpaceCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
