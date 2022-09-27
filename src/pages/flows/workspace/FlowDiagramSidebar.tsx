import * as React from "react";
import Timestamp from "react-timestamp";
import { useNodesQuery } from "../../../arkitekt/api/graphql";
import { withArkitekt } from "../../../arkitekt/arkitekt";
import { usePostman } from "../../../arkitekt/postman/graphql/postman-context";
import { useRequester } from "../../../arkitekt/postman/requester/requester-context";
import { notEmpty } from "../../../floating/utils";
import {
  ListFlowFragment,
  useSearchFlowsQuery,
} from "../../../fluss/api/graphql";
import { withFluss } from "../../../fluss/fluss";
import { useFluss } from "../../../fluss/fluss-context";
import { Flow } from "../../../linker";

interface IDataSidebarProps {
  diagram: string;
}

export const FlowCard = ({
  flow,
  diagram,
}: {
  diagram: string;
  flow: ListFlowFragment;
}) => {
  const { s3resolve } = useFluss();

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
  diagram,
}) => {
  const { data, refetch } = withFluss(useSearchFlowsQuery)({
    variables: { diagram: diagram },
  });

  const { reservations } = usePostman();
  const { assign } = useRequester();

  const { data: deployable } = withArkitekt(useNodesQuery)({
    variables: { interfaces: [`diagram:${diagram}`] },
  });

  const deployed = reservations?.reservations?.filter((res) =>
    res?.node?.interfaces?.includes(`diagram:${diagram}`)
  );

  const [filter, setFilter] = React.useState<{ search?: string }>({
    search: "",
  });

  React.useEffect(() => {
    refetch({ name: filter.search, diagram: diagram });
  }, [filter, refetch]);

  return (
    <div className="flex flex-col h-full p-5">
      <div className="text-white">Versions</div>
      <div className="flex-grow flex flex-col gap-2 p-1 overflow-y-auto">
        {data?.flows?.filter(notEmpty).map((flow, index) => (
          <FlowCard key={index} flow={flow} diagram={diagram} />
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
