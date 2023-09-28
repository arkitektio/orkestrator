import { useNavigate } from "react-router";
import { RekuestAssignation, RekuestNode } from "../../linker";
import { ListAssignationFragment } from "../../rekuest/api/graphql";
import { usePostman } from "../../rekuest/providers/postman/postman-context";
import { Mate, MateFinder } from "../types";

export const useAssignationMate = (): ((
  ass: ListAssignationFragment
) => MateFinder) => {
  const navigate = useNavigate();
  const { ack, unassign } = usePostman();

  return (ass) => async (options) => {
    let mates: Mate[] = [];

    if (!options.justSelf) {
      return mates;
    }

    mates.push({
      action: async () => {
        ass?.reservation?.node?.id &&
          navigate(RekuestNode.linkBuilder(ass?.reservation?.node?.id));
      },
      label: "Open Node",
    });

    mates.push({
      action: async () => {
        await unassign({ assignation: ass?.id });
      },
      label: "Cancel",
    });

    mates.push({
      action: async (event) => {
        for (let partner of event.partners) {
          console.log("Acknowledging", partner.id)
          await ack({ assignation: partner?.id });
        }
      },
      label: options.partners && options.partners.length > 1 ? "Ack all" : "All",
    });

    return mates.concat([
      {
        action: async () => {
          ass?.id && navigate(RekuestAssignation.linkBuilder(ass?.id));
        },
        label: "Open Assignment",
      },
    ]);
  };
};
