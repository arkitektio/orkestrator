import { useNavigate } from "react-router";
import { keyInObject } from "../../floating/utils";
import { FlussFlow } from "../../linker";
import { useDialog } from "../../providers/dialog/DialogProvider";
import { useReserver } from "../../rekuest/providers/reserver/reserver-context";
import { Mate, MateFinder } from "../types";

export const useTemplateActionMate = (): ((template: {
  id: string;
  params?: { [key: string]: any };
}) => MateFinder) => {
  const { ask } = useDialog();
  const { reserve } = useReserver();
  const navigate = useNavigate();

  return (template) => async (options) => {
    let mates: Mate[] = [];
    if (!options.justSelf) {
      return mates;
    }

    mates.push({
      action: async () => {
        await reserve({ template: template.id });
      },
      label: "Reserve",
    });

    if (keyInObject("params", template)) {
      mates.push({
        action: async () => {
          await navigate(FlussFlow.linkBuilder(template.params?.flow));
        },
        label: "Show Flow",
      });
    }

    return mates;
  };
};
