import * as React from "react";
import { useSearchWorkspacesLazyQuery } from "../../fluss/api/graphql";
import { withFluss } from "../../fluss/fluss";
import { useFluss } from "../../fluss/fluss-context";
import { Workspace } from "../../linker";

interface IDataSidebarProps {}

export const WorkspaceCard = ({ diagram }: any) => {
  const { s3resolve } = useFluss();

  return (
    <Workspace.Smart
      showSelfMates={true}
      placement="right"
      object={diagram.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded shadow-xl group text-white bg-slate-700 ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-1 ring-primary-200 "
        }`
      }
    >
      <div className="px-6 py-4">
        <Workspace.DetailLink
          className={({ isActive }) =>
            "font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={diagram.id}
        >
          <span className="truncate">{diagram?.name}</span>
        </Workspace.DetailLink>
        <p className="text-white-700 text-base"></p>
      </div>
    </Workspace.Smart>
  );
};

const FlowSidebar: React.FunctionComponent<IDataSidebarProps> = (props) => {
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
        {data?.workspaces?.map((diagram, index) => (
          <WorkspaceCard key={index} diagram={diagram} />
        ))}
      </div>
    </>
  );
};

export default FlowSidebar;
