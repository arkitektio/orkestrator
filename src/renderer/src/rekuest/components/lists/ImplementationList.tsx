import { ListRender } from "@/components/layout/ListRender";
import { RekuestImplementation } from "@/linkers";
import { ImplementationFilter, ImplementationOrder, OffsetPaginationInput, useListImplementationsQuery } from "@/rekuest/api/graphql";
import ImplementationCard from "../cards/ImplementationCard";

export type Props = {
  filters?: ImplementationFilter;
  order?: ImplementationOrder;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, order, pagination }: Props) => {
  const { data, error, refetch } = useListImplementationsQuery({
    variables: {
      filters: filters,

      ordering: order ? [order] : undefined,
      pagination: pagination,
    },
  });
  return (
    <>
      <ListRender
        array={data?.implementations}
        title={
          <RekuestImplementation.ListLink className="flex-0">
            Latest Implementations
          </RekuestImplementation.ListLink>
        }
        refetch={refetch}
        error={error}
      >
        {(ex) => (
          <ImplementationCard key={ex.id} item={ex} />
        )}
      </ListRender>
    </>
  );
};

export default List;
