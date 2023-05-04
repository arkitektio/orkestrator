import { useDatalayer } from "@jhnnsrs/datalayer";
import { Agent } from "../../../linker";
import { useDetailClientQuery } from "../../../lok/api/graphql";
import { withMan } from "../../../lok/context";
import { withRekuest } from "../../RekuestContext";
import { ListAgentFragment, useDeleteAgentMutation } from "../../api/graphql";

interface TemplateCardProps {
  agent: ListAgentFragment;
}

export const AgentCard = ({ agent }: TemplateCardProps) => {
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
        `flex-1 rounded border overflow-hidden shadow-md  text-white ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-1 ring-primary-200 "
        }`
      }
    >
      {loading ? (
        <div>
          <div className="h-10 w-10 rounded-md animate-pulse bg-gray-200" />
        </div>
      ) : (
        <div className="">
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
                  {data?.client?.release?.app.identifier}:
                </div>
                <div className="font-light text-md">
                  {data?.client?.release?.version}: on {agent?.instanceId}
                </div>
              </div>
            </Agent.DetailLink>
          </div>
        </div>
      )}
    </Agent.Smart>
  );
};
