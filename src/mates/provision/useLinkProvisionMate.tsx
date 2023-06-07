import { useConfirm } from "../../components/confirmer/confirmer-context";
import { withRekuest } from "../../rekuest";
import { useLinkMutation } from "../../rekuest/api/graphql";
import { MateFinder } from "../types";

export const useLinkProvisionMate = (res: { id: string }): MateFinder => {
  const { confirm } = useConfirm();

  const [link] = withRekuest(useLinkMutation)();
  return (type, isSelf) => {
    if (isSelf) {
      return [
        {
          action: async (self, drops) => {
            await link({
              variables: {
                provision: self?.object,
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
