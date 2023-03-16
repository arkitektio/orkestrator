import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import {
  usePullWhaleMutation,
  useRemoveContainerMutation,
  useRestartContainerMutation,
  useScanRepoMutation,
  useStopContainerMutation,
} from "../../port/api/graphql";
import { withPort } from "../../port/PortContext";
import { MateFinder } from "../types";

export const useContainerLifecycleMate = (): MateFinder => {
  const { confirm } = useConfirm();

  const [restart] = withPort(useRestartContainerMutation)();
  const [stop] = withPort(useStopContainerMutation)();
  const [remove] = withPort(useRemoveContainerMutation)();

  const [scanRepo, _] = withPort(useScanRepoMutation)();

  const [pull] = withPort(usePullWhaleMutation)();
  return (type, isSelf) => {
    if (isSelf) {
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

    return [];
  };
};
