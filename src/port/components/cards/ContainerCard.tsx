import React from "react";
import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../../components/confirmer/confirmer-context";
import { Container } from "../../../linker";
import { useMikro } from "../../../mikro/MikroContext";
import {
  ContainerStatus,
  ListContainerFragment,
  useRemoveContainerMutation,
  useRestartContainerMutation,
  useStopContainerMutation,
} from "../../api/graphql";
import { withPort } from "../../PortContext";

interface UserCardProps {
  container: ListContainerFragment;
}

export const containerStateToStyle = (
  state: ContainerStatus | null | undefined
) => {
  switch (state) {
    case ContainerStatus.Created:
      return "border-green-500 shadow-green-500/50";
    case ContainerStatus.Running:
      return "border-green-500 shadow-green-500/50";
    case ContainerStatus.Paused:
      return "border-yellow-500 shadow-yellow-500/50";
    case ContainerStatus.Restarting:
      return "border-yellow-500 shadow-yellow-500/50";
    case ContainerStatus.Removing:
      return "border-red-500 shadow-red-500/50";
    case ContainerStatus.Exited:
      return "border-red-500 shadow-red-500/50";
    case ContainerStatus.Dead:
      return "border-red-500";
    default:
      return "border-gray-500";
  }
};

export const ContainerCard = ({ container }: UserCardProps) => {
  const { confirm } = useConfirm();

  const [restart] = withPort(useRestartContainerMutation)();
  const [stop] = withPort(useStopContainerMutation)();
  const [remove] = withPort(useRemoveContainerMutation)();

  return (
    <Container.Smart
      object={container.id}
      className={`max-w-sm rounded bg-slate-800 shadow-md border border-1 text-white group ${containerStateToStyle(
        container.status
      )}`}
      additionalMates={(accept, self) => {
        if (!self) return [];

        if (accept == "item:@port/container") {
          return [
            {
              action: async (self, drops) => {
                await confirm({
                  message: "Do you really want to delete?",
                  subtitle: "Deletion is irreversible!",
                  confirmLabel: "Yes delete!",
                });

                await remove({ variables: { id: self.object } });
              },
              label: <BsTrash />,
              description: "Delete Run",
            },
            {
              action: async (self, drops) => {
                await confirm({
                  message: "Do you really want to restart?",
                  subtitle: "Restarting will take some seconds!",
                  confirmLabel: "Yes restart!",
                });

                await restart({ variables: { id: self.object } });
              },
              label: "Restart",
              description: "Delete Run",
            },
            {
              action: async (self, drops) => {
                await confirm({
                  message: "Do you really want to stop?",
                  subtitle: "Deletion is irreversible!",
                  confirmLabel: "Yes delete!",
                });

                await stop({ variables: { id: self.object } });
              },
              label: "Stop",
              description: "Delete Run",
            },
          ];
        }

        if (accept == "list:@port/container") {
          return [
            {
              accepts: [accept],
              action: async (self, drops) => {
                await confirm({
                  message: "Do you really want all this samples delete?",
                  subtitle: "Deletion is irreversible!",
                  confirmLabel: "Yes delete!",
                });

                for (const drop of drops) {
                }
              },
              label: (
                <div className="flex flex-row">
                  <BsTrash className="my-auto" />{" "}
                  <span className="my-auto">Delete all</span>
                </div>
              ),
              description: "Delete All Runs",
            },
          ];
        }

        return [];
      }}
    >
      <div className="p-2 ">
        <div className="flex">
          <span className="flex-grow font-semibold text-xs">
            {container.status}
          </span>
        </div>
        <Container.DetailLink
          className="text-xl font-light cursor-pointer mb-1"
          object={container?.id}
        >
          {container?.whale?.image || "DEAD IMAGE RUNNING"}
        </Container.DetailLink>
      </div>
      <div className="pl-2 pb-2"></div>
    </Container.Smart>
  );
};
