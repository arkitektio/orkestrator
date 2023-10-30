import { useNavigate } from "react-router";
import { FlussFlow } from "../../linker";
import { useDialog } from "../../providers/dialog/DialogProvider";
import { NodeListItemFragment } from "../../rekuest/api/graphql";
import { usePostman } from "../../rekuest/providers/postman/postman-context";
import { useSettings } from "../../settings/settings-context";
import { Mate, MateFinder } from "../types";

export const usePotentialWorkflowMate = (): ((
  node: NodeListItemFragment
) => MateFinder) => {
  const { ask } = useDialog();
  const { reserve } = usePostman();
  const { settings } = useSettings();
  const navigate = useNavigate();

  return (node) => async (options) => {
    let mates: Mate[] = [];
    
    if (node.interfaces?.includes("workflow") && node.meta?.flow) {
      mates.push({
        action: async () => {
          

          await navigate(FlussFlow.linkBuilder(node.meta.flow));
        },
        label: "Show Flow",
      });
    }

    return mates;
  };
};
