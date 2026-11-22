import { ListRender } from "@/core/layout/ListRender";
import { RekuestAction } from "@/core/linkers";
import {
  AgentFilter,
  OffsetPaginationInput,
  useToolboxesQuery,
} from "@/rekuest/api/graphql";
import ToolboxCard from "../cards/ToolboxCard";
import { FIRST_PAGE } from "./firstPage";

export type Props = {
  filters?: AgentFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination = FIRST_PAGE }: Props) => {
  const { data, refetch } = useToolboxesQuery({
    variables: { filters, pagination },
  });

  return (
    <ListRender
      array={data?.toolboxes}
      title={
        <RekuestAction.ListLink className="flex-0">
          Toolboxes
        </RekuestAction.ListLink>
      }
      refetch={refetch}
    >
      {(ex) => <ToolboxCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
