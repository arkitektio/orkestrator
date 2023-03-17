import { useAlert } from "../../components/alerter/alerter-context";
import { useDialog } from "../../layout/dialog/DialogProvider";
import { identifierToLinkableModel } from "../../linker";
import { useLinkMutation } from "../../mikro/api/graphql";
import { AskRelationModal } from "../../mikro/components/dialogs/AskRelationModal";
import { withMikro } from "../../mikro/MikroContext";
import { MateFinder } from "../types";

export const useMikroLinkMate = (): MateFinder => {
  const { ask } = useDialog();
  const { alert } = useAlert();
  const [link] = withMikro(useLinkMutation)();

  return (type: string, isSelf: boolean) =>
    isSelf
      ? undefined
      : [
          {
            action: async (self, drops) => {
              let leftType = identifierToLinkableModel(self.identifier);
              let rightType = identifierToLinkableModel(drops[0].identifier);

              if (!leftType || !rightType) {
                await alert({
                  message: "Cannot relate these two objects",
                  confirmLabel: "Ok, the developer should really fix this",
                });
                return;
              }

              let x = await ask(AskRelationModal, {
                leftIdentifier: self.identifier,
                leftObject: self.object,
                rightIdentifier: drops[0].identifier,
                rightObject: drops[0].object,
              });

              await link({
                variables: {
                  leftType: leftType,
                  rightType: rightType,
                  leftId: self.object,
                  rightId: drops[0].object,
                  ...x,
                },
              });
            },
            label: "Relate",
            description: "Relate to other",
          },
        ];
};
