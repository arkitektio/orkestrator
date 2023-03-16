import { useNavigate } from "react-router";
import { Flow } from "../../linker";
import { NodeListItemFragment } from "../../rekuest/api/graphql";
import { usePostman } from "../../rekuest/postman/graphql/postman-context";
import { AdditionalMate } from "../../rekuest/postman/mater/mater-context";
import { useRequester } from "../../rekuest/postman/requester/requester-context";
import { useReserver } from "../../rekuest/postman/reserver/reserver-context";
import { MateFinder } from "../types";

export const useNodeActionMate = (): ((
  node: NodeListItemFragment
) => MateFinder) => {
  const { assign, unassign } = useRequester();

  const { reserve } = useReserver();
  const navigate = useNavigate();

  return (node) => (type, isSelf) => {
    let mates: AdditionalMate[] = [];
    if (!isSelf) {
      return mates;
    }

    mates.push({
      action: async () => {
        await reserve({ node: node.id });
      },
      label: "Reserve",
    });

    if (node.interfaces?.includes("workflow") && node.meta?.flow) {
      mates.push({
        action: async () => {
          await navigate(Flow.linkBuilder(node.meta.flow));
        },
        label: "Show Flow",
      });
    }

    return mates;
  };
};
