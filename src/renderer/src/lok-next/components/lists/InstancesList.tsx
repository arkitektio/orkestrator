import { ListRender } from "@/components/layout/ListRender";
import { LokService } from "@/linkers";

import {
  OffsetPaginationInput,
  ServiceFilter,
  useListServiceInstancesQuery
} from "@/lok-next/api/graphql";
import { PlusIcon } from "lucide-react";
import ServiceInstanceCard from "../cards/ServiceInstanceCard";

export type Props = {
  filters?: ServiceFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, error, refetch } = useListServiceInstancesQuery({
    variables: { pagination, filters },
  });

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <ListRender
      array={data?.serviceInstances}
      title={
        <LokService.ListLink className="flex-0">Services</LokService.ListLink>
      }
      refetch={refetch}
      actions={
        <>
          <PlusIcon></PlusIcon>
        </>
      }
    >
      {(ex) => <ServiceInstanceCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
