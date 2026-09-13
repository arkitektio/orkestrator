import { ListRender } from "@/components/layout/ListRender";
import { RekuestMaterializedBlok } from "@/linkers";
import {
  OffsetPaginationInput,
  useListMaterializedBloksQuery,
} from "@/rekuest/api/graphql";
import MaterializedBlokCard from "../cards/MaterializedBlokCard";

export type Props = {
  pagination?: OffsetPaginationInput;
};

const MaterializedBlokList = ({ pagination }: Props) => {
  const { data, refetch } = useListMaterializedBloksQuery({
    variables: pagination ? { pagination } : undefined,
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
