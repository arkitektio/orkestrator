import { ListRender } from "@/core/layout/ListRender";
import { RekuestBlok } from "@/core/linkers";
import {
  BlokFilter,
  OffsetPaginationInput,
  useListBloksQuery,
} from "@/rekuest/api/graphql";
import BlokCard from "../cards/BlokCard";
import { FIRST_PAGE } from "./firstPage";

export type Props = {
  filters?: BlokFilter;
  pagination?: OffsetPaginationInput;
};

/** The templates `filters` selects. Templates are not pinned: the bloks made of them are. */
const List = ({ filters, pagination = FIRST_PAGE }: Props) => {
  const { data, refetch } = useListBloksQuery({ variables: { filters, pagination } });

  return (
    <div className="flex flex-col gap-4">
      <ListRender
        array={data?.bloks}
        title={
          <RekuestBlok.ListLink className="flex-0">Templates</RekuestBlok.ListLink>
        }
        refetch={() => refetch()}
      >
        {(ex) => <BlokCard key={ex.id} item={ex} />}
      </ListRender>
    </div>
  );
};

export default List;
