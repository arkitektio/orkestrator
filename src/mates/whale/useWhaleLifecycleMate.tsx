import { useConfirm } from "../../components/confirmer/confirmer-context";
import { useDialog } from "../../layout/dialog/DialogProvider";
import { withPort } from "../../port/PortContext";
import {
  usePullWhaleMutation,
  usePurgeWhaleMutation,
  useRunWhaleMutation,
} from "../../port/api/graphql";
import { RunWhaleDialog } from "../../port/components/dialogs/RunDialog";
import { MateFinder } from "../types";

export const useWhaleLifecycleMate = (): MateFinder => {
  const { ask } = useDialog();
  const { confirm } = useConfirm();

  const [deploy] = withPort(useRunWhaleMutation)();

  const [pull] = withPort(usePullWhaleMutation)();
  const [purge] = withPort(usePurgeWhaleMutation)({
    refetchQueries: ["ListWhales"],
  });

  return (type, isSelf) => {
    if (type == "item:@port/whale") {
      return [
        {
          action: async (self, drops) => {
            let x = await ask(RunWhaleDialog, { whale: self.object });

            await deploy({ variables: x });
          },
          label: "Deploy",
          description: "Deploy Whale",
        },
        {
          action: async (self, drops) => {
            await confirm({
              message: "Do you really want to update this whale?",
              confirmLabel: "Yes deploy!",
            });

            await pull({ variables: { id: self.object } });
          },
          label: "Pull",
          description: "Pull Update",
        },
        {
          action: async (self, drops) => {
            await confirm({
              message:
                "Do you really want to delete the downloaded image for this whale (you need to pull before deploying it!)?",
              confirmLabel: "Yes deploy!",
            });

            await purge({ variables: { id: self.object } });
          },
          label: "Purge",
          description: "Purge Image",
        },
      ];
    }

    return [];
  };
};
