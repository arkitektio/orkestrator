import { ListRender } from "@/core/layout/ListRender";
import { SidebarLayout } from "@/core/layout/SidebarLayout";
import { FancyInput } from "@/core/ui/fancy-input";
import { DialogButton } from "@/core/ui/dialog-button";
import { PaneLink, SidePaneGroup, SidePaneNav } from "@/core/ui/sidepane";
import { useDebounce } from "@/core/util/hooks/use-debounce";
import { FlussRun, FlussWorkspace } from "@/core/linkers";
import { CubeIcon } from "@radix-ui/react-icons";
import { Home, PlusIcon } from "lucide-react";
import * as React from "react";
import Timestamp from "@/core/ui/timestamp";
import {
  GlobalSearchQueryVariables,
  Ordering,
  useGlobalSearchQuery,
  useListRunsQuery,
  useWorkspacesQuery,
} from "../api/graphql";
import WorkspaceCard from "../components/cards/WorkspaceCard";

export const NavigationPane = () => {
  const { data } = useWorkspacesQuery();
  const { data: rundata } = useListRunsQuery({
    variables: {
      pagination: {
        limit: 5,
      },
      ordering: [{ createdAt: Ordering.Desc }],
    },
  });

  return (
    <SidePaneNav columns={2}>
      <SidePaneGroup
        title={<FlussWorkspace.ListLink>Workspaces</FlussWorkspace.ListLink>}
        limit={7}
        moreTo="/fluss/workspaces"
        action={
          <DialogButton name="createworkspace" variant={"ghost"} dialogProps={{}}>
            <PlusIcon className="h-3 w-3" />
          </DialogButton>
        }
      >
        <PaneLink to="/fluss/home">
          <Home />
          Dashboard
        </PaneLink>
        {data?.workspaces.map((workspace) => (
          <FlussWorkspace.PaneLink object={workspace} key={workspace.id}>
            <CubeIcon />
            <span className="truncate">{workspace.title}</span>
          </FlussWorkspace.PaneLink>
        ))}
      </SidePaneGroup>

      <SidePaneGroup title={<FlussRun.ListLink>Recent runs</FlussRun.ListLink>}>
        {rundata?.runs.map((run) => (
          <FlussRun.PaneLink object={run} key={run.id}>
            <CubeIcon />
            <span className="flex-1 truncate">{run.flow.workspace.title}</span>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              <Timestamp date={run.createdAt} relative />
            </span>
          </FlussRun.PaneLink>
        ))}
      </SidePaneGroup>
    </SidePaneNav>
  );
};

const Pane: React.FunctionComponent = () => {
  const [search, setSearch] = React.useState("");

  const debouncedSearch = useDebounce(search, 300);

  const variables: GlobalSearchQueryVariables = {
    search: debouncedSearch,
    pagination: {
      limit: 10,
    },
  };

  const { data, refetch } = useGlobalSearchQuery({ variables });

  React.useEffect(() => {
    refetch(variables);
  }, [debouncedSearch]);

  const searchBar = (
    <div className="w-full flex flex-row">
      <FancyInput
        placeholder="Search..."
        type="string"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="flex-grow h-full bg-background text-foreground w-full"
      />
    </div>
  );

  return (
    <SidebarLayout searchBar={searchBar}>
      {search.trim() === "" ? (
        <NavigationPane />
      ) : (
        <div className="h-full">
          <ListRender array={data?.workspaces}>
            {(item) => <WorkspaceCard workspace={item} key={item.id} />}
          </ListRender>
        </div>
      )}
    </SidebarLayout>
  );
};


export default Pane;
