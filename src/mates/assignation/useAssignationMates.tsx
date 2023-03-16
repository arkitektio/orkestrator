import { useNavigate } from "react-router";
import { Assignation, Node } from "../../linker";
import { ListAssignationFragment } from "../../rekuest/api/graphql";
import { usePostman } from "../../rekuest/postman/graphql/postman-context";
import { AdditionalMate } from "../../rekuest/postman/mater/mater-context";
import { MateFinder } from "../types";

export const useAssignationMate = (): ((
  ass: ListAssignationFragment
) => MateFinder) => {
  const navigate = useNavigate();
  const { ack, unassign } = usePostman();

  return (ass) => (type, isSelf) => {
    let mates: AdditionalMate[] = [];

    if (!isSelf) {
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
        await unassign({ variables: { assignation: ass?.id } });
      },
      label: "Cancel",
    });

    mates.push({
      action: async () => {
        await ack({ variables: { assignation: ass?.id } });
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
