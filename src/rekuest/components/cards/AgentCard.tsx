import { useDatalayer } from "@jhnnsrs/datalayer";
import { Agent } from "../../../linker";
import { useDetailClientQuery } from "../../../lok/api/graphql";
import { withMan } from "../../../lok/context";
import { MateFinder } from "../../../mates/types";
import { withRekuest } from "../../RekuestContext";
import {
  AgentStatus,
  ListAgentFragment,
  useDeleteAgentMutation,
} from "../../api/graphql";

interface TemplateCardProps {
  agent: ListAgentFragment;
  mates?: MateFinder[];
}

export const AgentCard = ({ agent, mates }: TemplateCardProps) => {
  const [deleteAgent] = withRekuest(useDeleteAgentMutation)();
  const { data, loading } = withMan(useDetailClientQuery)({
    variables: {
      clientId: agent.registry?.client.clientId,
    },
  });
  const { s3resolve } = useDatalayer();

  return (
    <Agent.Smart
      showSelfMates={true}
      placement="bottom"
      object={agent.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `flex-1 rounded border  backdrop-blur-lg rounded-md h-20 overflow-hidden ${
          agent.status == AgentStatus.Active
            ? "text-white border-white bg-slate-800 "
            : "text-gray-700 border-gray-700 bg-slate-900"
        } ${isOver && !isDragging && "border-primary-200 border"} ${
          isDragging && "border-primary-200 border"
        } ${isSelected && "ring-1 ring-primary-200 "}`
      }
      mates={mates}
    >
      {loading ? (
        <div>
          <div className="h-10 w-10 rounded-md animate-pulse bg-gray-200 " />
        </div>
      ) : (
        <Agent.DetailLink
          className={({ isActive }) =>
            "flex flex-row h-full" +
            (isActive ? "text-primary-300" : "") +
            ` ${agent.status != AgentStatus.Active && "saturate-0 "}`
          }
          object={agent?.id}
        >
          <img
            className={`my-auto w-10 rounded-full shadow-lg  ml-2 ${
              agent.status != AgentStatus.Active && "saturate-0 blur-xs"
            }`}
            src={
              data?.client?.release?.logo
                ? s3resolve(data?.client?.release?.logo)
                : `https://eu.ui-avatars.com/api/?name=${data?.client?.release?.app?.identifier}&background=random`
            }
            alt=""
          />

          <div className="flex flex-col my-auto ml-2">
            <div className="font-semibold text-md">
              {data?.client?.release?.app.identifier}
            </div>
            <div className="font-light text-md">
              {data?.client?.release?.version} on {agent?.instanceId}
            </div>
          </div>
        </Agent.DetailLink>
      )}
    </Agent.Smart>
  );
};
