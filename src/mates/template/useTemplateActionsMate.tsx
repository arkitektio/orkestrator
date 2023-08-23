import { useNavigate } from "react-router";
import { keyInObject } from "../../floating/utils";
import { useDialog } from "../../layout/dialog/DialogProvider";
import { Flow } from "../../linker";
import { ReserveDialog } from "../../rekuest/components/dialogs/ReserveDialog";
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

    mates.push({
      action: async () => {
        let res = await ask(ReserveDialog, { initial: { node: template.id } });
        console.log(res);
      },
      label: "Reserve New",
    });

    if (keyInObject("params", template)) {
      mates.push({
        action: async () => {
          await navigate(Flow.linkBuilder(template.params?.flow));
        },
        label: "Show Flow",
      });
    }

    return mates;
  };
};
