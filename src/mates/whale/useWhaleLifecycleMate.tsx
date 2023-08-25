import { useDialog } from "../../layout/dialog/DialogProvider";
import { withPort } from "../../port/PortContext";
import {
  usePullWhaleMutation,
  usePurgeWhaleMutation,
  useRunWhaleMutation,
} from "../../port/api/graphql";
import { RunWhaleDialog } from "../../port/components/dialogs/RunDialog";
import { useConfirm } from "../../providers/confirmer/confirmer-context";
import { MateFinder } from "../types";

export const useWhaleLifecycleMate = (): MateFinder => {
  const { ask } = useDialog();
  const { confirm } = useConfirm();

  const [deploy] = withPort(useRunWhaleMutation)();

  const [pull] = withPort(usePullWhaleMutation)();
  const [purge] = withPort(usePurgeWhaleMutation)({
    refetchQueries: ["ListWhales"],
  });

  return async (options) => {
    if (options.justSelf) {
      return [
        {
          action: async (event) => {
            let x = await ask(RunWhaleDialog, { whale: event.self.id });

            await deploy({ variables: x });
          },
          label: "Deploy",
          description: "Deploy Whale",
        },
        {
          action: async (event) => {
            await confirm({
              message: "Do you really want to update this whale?",
              confirmLabel: "Yes deploy!",
            });

            await pull({ variables: { id: event.self.id } });
          },
          label: "Pull",
          description: "Pull Update",
        },
        {
          action: async (event) => {
            await confirm({
              message:
                "Do you really want to delete the downloaded image for this whale (you need to pull before deploying it!)?",
              confirmLabel: "Yes deploy!",
            });

            await purge({ variables: { id: event.self.id } });
          },
          label: "Purge",
          description: "Purge Image",
        },
      ];
    }

    return [];
  };
};
