import { useDialog } from "../../layout/dialog/DialogProvider";
import { DeployDialog } from "../../port/components/dialogs/DeployDialog";
import { MateFinder } from "../types";

export const useDeployScanMate = (): MateFinder => {
  const { ask } = useDialog();

  return (type, isSelf) => {
    if (isSelf) {
      return [
        {
          action: async (self, drops) => {
            let d = await ask(DeployDialog, { scan: self.object });
          },
          label: "Appify",
          description: "Apiffy this scan",
        },
      ];
    }

    return [];
  };
};
