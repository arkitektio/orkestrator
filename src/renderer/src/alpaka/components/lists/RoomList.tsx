import { ListRender } from "@/components/layout/ListRender";
import { AlpakaRoom } from "@/linkers";

import { RoomFilter, useListRoomsQuery } from "@/alpaka/api/graphql";
import type { OffsetPaginationInput } from "@/lib/pagination";
import RoomCard from "../cards/RoomCard";

export type Props = {
  filters?: RoomFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, error, loading, refetch } = useListRoomsQuery({
    variables: { filter: filters, pagination },
  });

  return (
    <ListRender
      array={data?.rooms}
      error={error}
      loading={loading}
      title={
        <AlpakaRoom.ListLink className="flex-0">Rooms</AlpakaRoom.ListLink>
      }
      refetch={refetch}
    >
      {(ex, index) => <RoomCard key={ex.id} item={ex} index={index} />}
    </ListRender>
  );
};

export default List;
