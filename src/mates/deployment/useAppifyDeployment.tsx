import { DeployDialog } from "../../port/components/dialogs/DeployDialog";
import { useDialog } from "../../providers/dialog/DialogProvider";
import { MateFinder } from "../types";

export const useAppifyDeployment = (): MateFinder => {
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
