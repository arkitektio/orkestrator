import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import { withPort } from "../../port/PortContext";
import {
  ContainerStatus,
  ListContainerFragment,
  usePullWhaleMutation,
  useRemoveContainerMutation,
  useRestartContainerMutation,
  useScanRepoMutation,
  useStopContainerMutation,
} from "../../port/api/graphql";
import { AdditionalMate } from "../../rekuest/postman/mater/mater-context";
import { MateFinder } from "../types";

export const useContainerLifecycleMate = (): ((
  contianer: ListContainerFragment
) => MateFinder) => {
  const { confirm } = useConfirm();

  const [restart] = withPort(useRestartContainerMutation)();
  const [stop] = withPort(useStopContainerMutation)();
  const [remove] = withPort(useRemoveContainerMutation)();

  const [scanRepo, _] = withPort(useScanRepoMutation)();

  const [pull] = withPort(usePullWhaleMutation)();
  return (container: ListContainerFragment) => (type, isSelf) => {
    let actions: AdditionalMate[] = [];
    if (isSelf) {
      actions = actions.concat([
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
              subtitle:
                "Your container will be stopped! And all data will be lost!",
              confirmLabel: "Yes stop!",
            });

            await stop({ variables: { id: self.object } });
          },
          label: "Stop",
          description: "Delete Run",
        },
      ]);
    }

    if (isSelf && container.status == ContainerStatus.Exited) {
      actions = actions.concat([
        {
          action: async (self, drops) => {
            await confirm({
              message: "Do you really want to delete?",
              subtitle:
                "Deletion is irreversible! You will have to deploy again!",
              confirmLabel: "Yes delete!",
            });

            await remove({ variables: { id: self.object } });
          },
          label: <BsTrash />,
          description: "Delete Container",
        },
      ]);
    }

    return actions;
  };
};
