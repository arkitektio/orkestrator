import { useNavigate } from "react-router";
import { Assignation, Node } from "../../linker";
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

    if (!options.partnersIncludeSelf) {
      return mates;
    }

    mates.push({
      action: async () => {
        ass?.reservation?.node?.id &&
          navigate(Node.linkBuilder(ass?.reservation?.node?.id));
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
      action: async () => {
        await ack({ assignation: ass?.id });
      },
      label: "Ack",
    });

    return mates.concat([
      {
        action: async () => {
          ass?.id && navigate(Assignation.linkBuilder(ass?.id));
        },
        label: "Open",
      },
    ]);
  };
};
