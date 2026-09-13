import { ListRender } from "@/components/layout/ListRender";
import { FlussWorkspace } from "@/linkers";
import {
  OffsetPaginationInput,
  useWorkspacesQuery,
} from "@/reaktion/api/graphql";
import WorkspaceCard from "../cards/WorkspaceCard";

export type Props = {
  pagination?: OffsetPaginationInput;
};

const List = ({ pagination }: Props) => {
  const { data, refetch } = useWorkspacesQuery({
    variables: { pagination },
  });

  return (
    <ListRender
      array={data?.workspaces}
      title={
        <FlussWorkspace.ListLink className="flex-0 text-xs">
          Workspaces
        </FlussWorkspace.ListLink>
      }
      refetch={refetch}
    >
      {(item) => (
        <WorkspaceCard key={item.id} workspace={item} />
      )}
    </ListRender>
  );
};

export default List;
