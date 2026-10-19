import { ListRender } from "@/core/layout/ListRender";
import { RekuestBlok } from "@/core/linkers";
import {
  BlokFilter,
  OffsetPaginationInput,
  useListBloksQuery,
} from "@/rekuest/api/graphql";
import BlokCard from "../cards/BlokCard";

export type Props = {
  filters?: BlokFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, refetch } = useListBloksQuery({ variables: { filters, pagination } });

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
