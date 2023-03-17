import { useConfirm } from "../../components/confirmer/confirmer-context";
import { withRekuest } from "../../rekuest";
import {
  ListReservationFragment,
  useUnlinkMutation,
} from "../../rekuest/api/graphql";
import { MateFinder } from "../types";

export const useUnlinkProvisionMate = (
  res: ListReservationFragment
): MateFinder => {
  const { confirm } = useConfirm();

  const [unlink] = withRekuest(useUnlinkMutation)();
  return (type, isSelf) => {
    if (isSelf) {
      return [
        {
          action: async (self, drops) => {
            await unlink({
              variables: {
                provision: self?.object,
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
