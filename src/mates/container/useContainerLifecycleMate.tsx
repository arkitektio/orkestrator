import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import { withPort } from "../../port/PortContext";
import {
  ContainerStatus,
  ListContainerFragment,
  useRemoveContainerMutation,
  useRestartContainerMutation,
  useStopContainerMutation,
} from "../../port/api/graphql";
import { Mate, MateFinder } from "../types";

export const useContainerLifecycleMate = (): ((
  contianer: ListContainerFragment
) => MateFinder) => {
  const { confirm } = useConfirm();

  const [restart] = withPort(useRestartContainerMutation)();
  const [stop] = withPort(useStopContainerMutation)();
  const [remove] = withPort(useRemoveContainerMutation)();

  return (container: ListContainerFragment) => async (options) => {
    let actions: Mate[] = [];
    if (options.partnersIncludeSelf) {
      actions = actions.concat([
        {
          action: async (event) => {
            await confirm({
              message: "Do you really want to restart?",
              subtitle: "Restarting will take some seconds!",
              confirmLabel: "Yes restart!",
            });

            await restart({ variables: { id: event.self.id } });
          },
          label: "Restart",
          description: "Delete Run",
        },
        {
          action: async (event) => {
            await confirm({
              message: "Do you really want to stop?",
              subtitle:
                "Your container will be stopped! And all data will be lost!",
              confirmLabel: "Yes stop!",
            });

            await stop({ variables: { id: event.self.id } });
          },
          label: "Stop",
          description: "Delete Run",
        },
      ]);
    }

    if (
      options.partnersIncludeSelf &&
      container.status == ContainerStatus.Exited
    ) {
      actions = actions.concat([
        {
          action: async (event) => {
            for (const partner of event.partners) {
              await confirm({
                message: "Do you really want to delete?",
                subtitle:
                  "Deletion is irreversible! You will have to deploy again!",
                confirmLabel: "Yes delete!",
              });
              await remove({ variables: { id: partner.id } });
            }
          },
          label: <BsTrash />,
          description: "Delete Container",
        },
      ]);
    }

    return actions;
  };
};
