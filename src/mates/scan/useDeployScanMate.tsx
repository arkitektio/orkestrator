import { useConfirm } from "../../components/confirmer/confirmer-context";
import { useDialog } from "../../layout/dialog/DialogProvider";
import {
  usePullWhaleMutation,
  useRunWhaleMutation,
} from "../../port/api/graphql";
import { PrepareScanDialog } from "../../port/components/dialogs/PrepareScanDialog";
import { withPort } from "../../port/PortContext";
import { MateFinder } from "../types";

export const useDeployScanMate = (): MateFinder => {
  const { confirm } = useConfirm();
  const { ask } = useDialog();

  const [deploy] = withPort(useRunWhaleMutation)();

  const [pull] = withPort(usePullWhaleMutation)();
  return (type, isSelf) => {
    if (isSelf) {
      return [
        {
          action: async (self, drops) => {
            let d = await ask(PrepareScanDialog, { scan: self.object });
          },
          label: "Appify",
          description: "Apiffy this scan",
        },
      ];
    }

    return [];
  };
};
