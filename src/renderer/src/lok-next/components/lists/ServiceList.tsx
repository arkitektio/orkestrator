import { ListRender } from "@/components/layout/ListRender";
import { LokService } from "@/linkers";

import {
  OffsetPaginationInput,
  ServiceFilter,
  useListServicesQuery
} from "@/lok-next/api/graphql";
import { PlusIcon } from "lucide-react";
import ServiceCard from "../cards/ServiceCard";

export type Props = {
  filters?: ServiceFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, error, refetch } = useListServicesQuery({
    variables: { pagination, filters },
  });

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <ListRender
      array={data?.services}
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
      {(ex) => <ServiceCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
