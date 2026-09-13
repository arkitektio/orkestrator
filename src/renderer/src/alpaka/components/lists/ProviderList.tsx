import { ListRender } from "@/components/layout/ListRender";

import {
  ProviderFilter,
  useListProvidersQuery
} from "@/alpaka/api/graphql";
import {
  OffsetPaginationInput
} from "@/lok-next/api/graphql";
import ProviderCard from "../cards/ProviderCard";

export type Props = {
  filters?: ProviderFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, refetch } = useListProvidersQuery({
    variables: { filter: filters, pagination },
  });

  return (
    <ListRender
      array={data?.providers}
      title={
        <div className="flex-0">
          Providers
        </div>
      }
      refetch={refetch}
    >
      {(ex) => <ProviderCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
