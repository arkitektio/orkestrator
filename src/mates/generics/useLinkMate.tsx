import { useAlert } from "../../components/alerter/alerter-context";
import { identifierToLinkableModel } from "../../linker";
import { withMikro } from "../../mikro/MikroContext";
import { useLinkMutation } from "../../mikro/api/graphql";
import { AskRelationModal } from "../../mikro/components/dialogs/AskRelationModal";
import { useDialog } from "../../providers/dialog/DialogProvider";
import { MateFinder } from "../types";

export const useMikroLinkMate = (): MateFinder => {
  const { ask } = useDialog();
  const { alert } = useAlert();
  const [link] = withMikro(useLinkMutation)({});

  return async (options) => {
    return options.partnersIncludeSelf
      ? undefined
      : [
          {
            action: async (event) => {
              for (const partner of event.partners) {
                let leftType = identifierToLinkableModel(event.self.identifier);
                let rightType = identifierToLinkableModel(partner.identifier);

                if (!leftType || !rightType) {
                  await alert({
                    message: "Cannot relate these two objects",
                    confirmLabel: "Ok, the developer should really fix this",
                  });
                  return;
                }

                console.log(leftType, rightType);
                let x = await ask(AskRelationModal, {
                  leftIdentifier: event.self.identifier,
                  leftObject: event.self.id,
                  rightIdentifier: partner.identifier,
                  rightObject: partner.id,
                });

                await link({
                  variables: {
                    leftType: leftType,
                    rightType: rightType,
                    leftId: event.self.id,
                    rightId: partner.id,
                    ...x,
                  },
                });
              }
            },
            label: "Relate",
            description: "Relate to other",
          },
        ];
  };
};
