import { ListRender } from "@/core/layout/ListRender";
import { RekuestMaterializedBlok } from "@/core/linkers";
import {
  MaterializedBlokFilter,
  OffsetPaginationInput,
  useListMaterializedBloksQuery,
} from "@/rekuest/api/graphql";
import MaterializedBlokCard from "../cards/MaterializedBlokCard";

export type Props = {
  filters?: MaterializedBlokFilter;
  pagination?: OffsetPaginationInput;
};

const MaterializedBlokList = ({ filters, pagination }: Props) => {
  const { data, refetch } = useListMaterializedBloksQuery({
    variables: filters || pagination ? { filters, pagination } : undefined,
  });

  return (
    <ListRender
      array={data?.materializedBloks}
      title={
        <RekuestMaterializedBlok.ListLink className="flex-0">
          Materialized Bloks
        </RekuestMaterializedBlok.ListLink>
      }
      refetch={refetch}
    >
      {(item) => <MaterializedBlokCard key={item.id} item={item} />}
    </ListRender>
  );
};

export default MaterializedBlokList;
