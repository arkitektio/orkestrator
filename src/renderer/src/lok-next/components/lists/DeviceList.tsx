import { ListRender } from "@/components/layout/ListRender";
import { LokDevice } from "@/linkers";

import {
  DeviceFilter,
  OffsetPaginationInput,
  useListDevicesQuery
} from "@/lok-next/api/graphql";
import DeviceCard from "../cards/DeviceCard";

export type Props = {
  filters?: DeviceFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, refetch } = useListDevicesQuery({
    variables: { filters, pagination },
  });

  return (
    <ListRender
      array={data?.devices}
      title={
        <LokDevice.ListLink className="flex-0">
          Clients
        </LokDevice.ListLink>
      }
      refetch={refetch}
    >
      {(ex) => <DeviceCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
