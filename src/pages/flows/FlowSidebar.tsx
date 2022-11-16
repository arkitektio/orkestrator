import * as React from "react";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../floating/utils";
import {
  FlussGlobalSearchQueryVariables,
  useFlussGlobalSearchQuery,
} from "../../fluss/api/graphql";
import { WorkspaceCard } from "../../fluss/components/cards/WorkspaceCard";
import { FlussSearch } from "../../fluss/components/FlussSearch";
import { withFluss } from "../../fluss/fluss";

interface IDataSidebarProps {}

const FlowSidebar: React.FunctionComponent<IDataSidebarProps> = (props) => {
  const { data, refetch } = withFluss(useFlussGlobalSearchQuery)();
  const [filter, setFilter] = React.useState<FlussGlobalSearchQueryVariables>({
    search: "",
  });

  React.useEffect(() => {
    refetch(filter);
  }, [filter, fetch]);

  return (
    <div className="flex h-full flex-col" data-enableselect={true}>
      <div className="flex-none p-5 dark:text-slate-50">
        <FlussSearch onSearch={(v) => setFilter(v)} />
      </div>
      <div
        className="flex-grow flex flex-col gap-2  p-3 overflow-y-scroll "
        data-enableselect={true}
      >
        {data?.workspaces && data?.workspaces.length > 0 && (
          <>
            <div className="font-semibold text-center text-xs dark:text-slate-50 mt-2">
              Workspaces
            </div>
            <ResponsiveContainerGrid>
              {data?.workspaces?.filter(notEmpty).map((workspace, index) => (
                <WorkspaceCard key={index} workspace={workspace} />
              ))}
            </ResponsiveContainerGrid>
          </>
        )}
      </div>
    </div>
  );
};

export default FlowSidebar;
