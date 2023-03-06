import { Agent } from "../../../linker";
import { AppImage } from "../../../lok/components/AppImage";
import { UserEmblem } from "../../../lok/components/UserEmblem";
import { ListAgentFragment, useDeleteAgentMutation } from "../../api/graphql";
import { withRekuest } from "../../RekuestContext";

interface TemplateCardProps {
  agent: ListAgentFragment;
}

export const AgentCard = ({ agent }: TemplateCardProps) => {
  const [deleteAgent] = withRekuest(useDeleteAgentMutation)();

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
      additionalMates={(partner, self) => {
        if (
          partner == "item:@rekuest/agent" ||
          partner == "list:@rekuest/agent"
        ) {
          return [
            {
              label: "Delete Agent",
              action: async (self, drops) => {
                for (const drop of drops) {
                  await deleteAgent({
                    variables: {
                      id: drop.object,
                    },
                  });
                }
              },
            },
          ];
        }

        return [];
      }}
    >
      <div className="">
        <div className="flex flex-row w-full">
          <Agent.DetailLink
            className={({ isActive }) =>
              "flex-grow cursor-pointer p-4 " +
              (isActive ? "text-primary-300" : "")
            }
            object={agent?.id}
          >
            {agent.registry?.app?.identifier}
            <p className="text-sm text-gray-500 my-auto">
              {agent?.registry?.app?.version} on {agent?.instanceId}
            </p>
          </Agent.DetailLink>
          <div className="flex-initial">
            {agent.registry?.app && (
              <AppImage
                className="w-full h-full"
                identifier={agent.registry?.app?.identifier}
                version={agent.registry?.app?.version}
              />
            )}
          </div>
        </div>
      </div>
    </Agent.Smart>
  );
};
