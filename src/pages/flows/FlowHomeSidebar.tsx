import * as React from "react";
import { useSearchWorkspacesLazyQuery } from "../../fluss/api/graphql";
import { withFluss } from "../../fluss/fluss";
import { useFluss } from "../../fluss/fluss-context";
import { Flow } from "../../linker";

interface IDataSidebarProps {}

export const FlowCard = ({ flow }: any) => {
  const { s3resolve } = useFluss();

  return (
    <Flow.Smart
      showSelfMates={true}
      placement="right"
      object={flow.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded shadow-xl group text-white bg-slate-700 ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-1 ring-primary-200 "
        }`
      }
    >
      <div className="px-6 py-4">
        <Flow.DetailLink
          className={({ isActive }) =>
            "font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={flow.id}
        >
          <span className="truncate">{flow?.name}</span>
        </Flow.DetailLink>
        <p className="text-white-700 text-base"></p>
      </div>
    </Flow.Smart>
  );
};

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
        {data?.workspaces?.map((flow, index) => (
          <FlowCard key={index} flow={flow} />
        ))}
      </div>
    </>
  );
};

export default FlowHomeSidebar;
