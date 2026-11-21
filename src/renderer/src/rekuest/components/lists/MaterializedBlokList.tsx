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

/** The materializations `filters` selects, the ones you pinned first. */
const MaterializedBlokList = ({ filters, pagination }: Props) => {
  const pinned = useListMaterializedBloksQuery({ variables: { filters: { ...filters, pinned: true } } });
  const { data, refetch } = useListMaterializedBloksQuery({
    variables: { filters: { ...filters, pinned: false }, pagination },
  });

  return (
    <div className="flex flex-col gap-4">
      {(pinned.data?.materializedBloks.length ?? 0) > 0 && (
        <ListRender array={pinned.data?.materializedBloks} title="Pinned" refetch={pinned.refetch}>
          {(item) => <MaterializedBlokCard key={item.id} item={item} />}
        </ListRender>
      )}
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
    </div>
  );
};

export default MaterializedBlokList;
