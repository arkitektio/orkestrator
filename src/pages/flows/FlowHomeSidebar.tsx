import * as React from "react";
import { notEmpty } from "../../floating/utils";
import { useSearchWorkspacesLazyQuery } from "../../fluss/api/graphql";
import { FlowCard } from "../../fluss/components/cards/FlowCard";
import { WorkspaceCard } from "../../fluss/components/cards/WorkspaceCard";
import { withFluss } from "../../fluss/fluss";
import { useFluss } from "../../fluss/fluss-context";
import { Flow } from "../../linker";

interface IDataSidebarProps {}

const FlowHomeSidebar: React.FunctionComponent<IDataSidebarProps> = (props) => {
  const [fetch, { data }] = withFluss(useSearchWorkspacesLazyQuery)();
  const [filter, setFilter] = React.useState<{ search?: string }>({
    search: "",
  });

  React.useEffect(() => {
    fetch({ variables: { name: filter.search } });
  }, [filter, fetch]);

  return (
    <>
      <div className="flex-initial p-5 dark:text-slate-50"></div>
      <div className="flex-grow flex flex-col gap-2 p-5 overflow-y-auto">
        {data?.workspaces?.filter(notEmpty).map((w, index) => (
          <WorkspaceCard key={index} workspace={w} />
        ))}
      </div>
    </>
  );
};

export default FlowHomeSidebar;
