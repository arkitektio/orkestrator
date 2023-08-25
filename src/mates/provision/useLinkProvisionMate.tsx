import { useConfirm } from "../../providers/confirmer/confirmer-context";
import { withRekuest } from "../../rekuest";
import { useLinkMutation } from "../../rekuest/api/graphql";
import { MateFinder } from "../types";

export const useLinkProvisionMate = (res: { id: string }): MateFinder => {
  const { confirm } = useConfirm();

  const [link] = withRekuest(useLinkMutation)();
  return async (options) => {
    if (options.justSelf) {
      return [
        {
          action: async (event) => {
            await link({
              variables: {
                provision: event.self.id,
                reservation: res.id,
              },
            });
          },
          label: "Link",
          description: "Link this provision to the reservation",
        },
      ];
    }

    return [];
  };
};
