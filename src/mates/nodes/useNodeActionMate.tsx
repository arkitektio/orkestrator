import { useNavigate } from "react-router";
import { useDialog } from "../../layout/dialog/DialogProvider";
import { Flow } from "../../linker";
import { NodeListItemFragment } from "../../rekuest/api/graphql";
import { ReserveDialog } from "../../rekuest/components/dialogs/ReserveDialog";
import { usePostman } from "../../rekuest/providers/postman/postman-context";
import { useSettings } from "../../settings/settings-context";
import { Mate, MateFinder } from "../types";

export const useNodeActionMate = (): ((
  node: NodeListItemFragment
) => MateFinder) => {
  const { ask } = useDialog();
  const { reserve } = usePostman();
  const { settings } = useSettings();
  const navigate = useNavigate();

  return (node) => async (options) => {
    let mates: Mate[] = [];
    if (!options.partnersIncludeSelf) {
      return mates;
    }

    mates.push({
      action: async () => {
        let res = await ask(ReserveDialog, {
          initial: { node: node.id, instanceId: settings.instanceId },
        });
        await reserve(res);
      },
      label: "Reserve",
    });

    if (node.interfaces?.includes("workflow") && node.meta?.flow) {
      mates.push({
        action: async () => {
          await navigate(Flow.linkBuilder(node.meta.flow));
        },
        label: "Show Flow",
      });
    }

    return mates;
  };
};
