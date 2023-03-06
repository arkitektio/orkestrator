import * as React from "react";
import Timestamp from "react-timestamp";
import { useNodesQuery } from "../../../rekuest/api/graphql";
import { usePostman } from "../../../rekuest/postman/graphql/postman-context";
import { useRequester } from "../../../rekuest/postman/requester/requester-context";
import { notEmpty } from "../../../floating/utils";
import {
  ListFlowFragment,
  useSearchFlowsQuery,
} from "../../../fluss/api/graphql";
import { withFluss } from "../../../fluss/fluss";
import { useFluss } from "../../../fluss/fluss-context";
import { Flow } from "../../../linker";
import { withRekuest } from "../../../rekuest";

interface IDataSidebarProps {
  workspace: string;
}

export const FlowCard = ({
  flow,
  diagram,
}: {
  diagram: string;
  flow: ListFlowFragment;
}) => {
  return (
    <Flow.Smart
      showSelfMates={true}
      placement="bottom"
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
          <span className="truncate">
            <Timestamp date={flow.createdAt} relative></Timestamp>
          </span>
        </Flow.DetailLink>
        <p className="text-white-700 text-base"></p>
      </div>
    </Flow.Smart>
  );
};

const FlowDiagramSidebar: React.FunctionComponent<IDataSidebarProps> = ({
  workspace,
}) => {
  const { data, refetch } = withFluss(useSearchFlowsQuery)({
    variables: { workspace: workspace },
  });

  const { reservations } = usePostman();
  const { assign } = useRequester();

  const { data: deployable } = withRekuest(useNodesQuery)({
    variables: { interfaces: [`workspace:${workspace}`] },
  });

  const deployed = reservations?.reservations?.filter((res) =>
    res?.node?.interfaces?.includes(`workspace:${workspace}`)
  );

  const [filter, setFilter] = React.useState<{ search?: string }>({
    search: "",
  });

  React.useEffect(() => {
    refetch({ name: filter.search, workspace: workspace });
  }, [filter, refetch]);

  return (
    <div className="flex flex-col h-full p-5">
      <div className="text-white">Versions</div>
      <div className="flex-grow flex flex-col gap-2 p-1 overflow-y-auto">
        {data?.flows?.filter(notEmpty).map((flow, index) => (
          <FlowCard key={index} flow={flow} diagram={workspace} />
        ))}
      </div>
      <div className="flex-grow"></div>
      {deployable?.allnodes?.map((node) => (
        <>
          <div className="text-white">{node?.name}</div>
        </>
      ))}
      <div className="flex-initial dark:text-slate-50">Deployed</div>
      {deployed?.map((d) => (
        <>
          {d?.id && (
            <button
              type="button"
              onClick={() => {
                assign({ reservation: d });
              }}
            >
              {d?.title}
            </button>
          )}
        </>
      ))}
    </div>
  );
};

export default FlowDiagramSidebar;
