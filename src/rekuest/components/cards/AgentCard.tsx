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
      dropClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `flex-1 rounded border  shadow-md  ${
          agent.status == AgentStatus.Active
            ? "text-white border-white"
            : "text-gray-700 border-gray-700"
        } ${isOver && !isDragging && "border-primary-200 border"} ${
          isDragging && "border-primary-200 border"
        } ${isSelected && "ring-1 ring-primary-200 "}`
      }
      mates={mates}
    >
      {loading ? (
        <div>
          <div className="h-10 w-10 rounded-md animate-pulse bg-gray-200" />
        </div>
      ) : (
        <div className="overflow-hidden">
          <div className="flex flex-row w-full">
            <Agent.DetailLink
              className={({ isActive }) =>
                "flex-grow cursor-pointer p-4 flex flex-row" +
                (isActive ? "text-primary-300" : "")
              }
              object={agent?.id}
            >
              <img
                className="h-10 w-10 rounded-md"
                src={
                  data?.client?.release?.logo
                    ? s3resolve(data?.client?.release?.logo)
                    : `https://eu.ui-avatars.com/api/?name=${data?.client?.release?.app?.identifier}&background=random`
                }
                alt=""
              />

              <div className="my-auto ml-2">
                <div className="font-semibold text-md">
                  {data?.client?.release?.app.identifier}
                </div>
                <div className="font-light text-md">
                  {data?.client?.release?.version} on {agent?.instanceId}
                </div>
              </div>
            </Agent.DetailLink>
          </div>
        </div>
      )}
    </Agent.Smart>
  );
};
