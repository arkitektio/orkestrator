import { useDialog } from "../../layout/dialog/DialogProvider";
import { DeployDialog } from "../../port/components/dialogs/DeployDialog";
import { MateFinder } from "../types";

export const useDeployScanMate = (): MateFinder => {
  const { ask } = useDialog();

  return async (options) => {
    if (options.justSelf) {
      return [
        {
          action: async (event) => {
            let d = await ask(DeployDialog, { scan: event.self.id });
          },
          label: "Appify",
          description: "Apiffy this scan",
        },
      ];
    }

    return [];
  };
};
