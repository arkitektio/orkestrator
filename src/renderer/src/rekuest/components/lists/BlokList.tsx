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

/** The bloks `filters` selects, the ones you pinned first. */
const List = ({ filters, pagination }: Props) => {
  const pinned = useListBloksQuery({ variables: { filters: { ...filters, pinned: true } } });
  const { data, refetch } = useListBloksQuery({ variables: { filters: { ...filters, pinned: false }, pagination } });

  return (
    <div className="flex flex-col gap-4">
      {(pinned.data?.bloks.length ?? 0) > 0 && (
        <ListRender array={pinned.data?.bloks} title="Pinned" refetch={() => pinned.refetch()}>
          {(ex) => <BlokCard key={ex.id} item={ex} />}
        </ListRender>
      )}
      <ListRender
        array={data?.bloks}
        title={
          <RekuestBlok.ListLink className="flex-0">Bloks</RekuestBlok.ListLink>
        }
        refetch={() => refetch()}
      >
        {(ex) => <BlokCard key={ex.id} item={ex} />}
      </ListRender>
    </div>
  );
};

export default List;
