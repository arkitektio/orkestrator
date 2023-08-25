import { useConfirm } from "../../providers/confirmer/confirmer-context";
import { withRekuest } from "../../rekuest";
import { useUnlinkMutation } from "../../rekuest/api/graphql";
import { MateFinder } from "../types";

export const useUnlinkProvisionMate = (res: { id: string }): MateFinder => {
  const { confirm } = useConfirm();

  const [unlink] = withRekuest(useUnlinkMutation)();
  return async (options) => {
    if (options.justSelf) {
      return [
        {
          action: async (event) => {
            await unlink({
              variables: {
                provision: event.self.id,
                reservation: res.id,
              },
            });
          },
          label: "Unlink",
          description: "Unlink this provision from the repo",
        },
      ];
    }

    return [];
  };
};
