import React from "react";
import { useNavigate } from "react-router";
import { Node } from "../../linker";
import { withRekuest } from "../../rekuest";
import { useNodesLazyQuery } from "../../rekuest/api/graphql";
import { useRequester } from "../../rekuest/postman/requester/requester-context";
import { useReserver } from "../../rekuest/postman/reserver/reserver-context";
import { queryfiltered } from "./GeneralMenu";
import { Extension, ModifyingAction, useExtension } from "./GeneralMenuContext";

export interface NavigationActionsProps {}

export type NodeModifierParams = {
  node: string;
  type: string;
};
export type ReserveModifierParams = {
  node: string;
  type: string;
};

export const NodesExtension: React.FC<NavigationActionsProps> = ({}) => {
  const [searchNodes] = withRekuest(useNodesLazyQuery)({
    fetchPolicy: "network-only",
  });

  const { reserve } = useReserver();
  const { assign } = useRequester();

  const navigate = useNavigate();

  const handler: Extension = {
    key: "nodesearch",
    label: "Nodes",
    filter: async ({ query, modifiers }) => {
      if (modifiers.find((x) => x.key == "search")) {
        return [];
      }

      let nodemodifier = modifiers.find(
        (x) => x.key == "node"
      ) as ModifyingAction<NodeModifierParams>;
      if (nodemodifier) {
        return queryfiltered(
          [
            {
              custom: async (action) => {
                navigate(Node.linkBuilder(nodemodifier?.params?.node));
              },
              key: "node-navigate",
              label: "Navigate",
            },
            {
              custom: async (action) => {
                let r = await reserve({ node: nodemodifier?.params?.node });

                return {
                  modifiers: modifiers
                    .concat({
                      key: "reserve",
                      label: "Reserved",
                      params: {
                        reserve: r?.id,
                        type: "reserve",
                      },
                    })
                    .filter((m) => m.key != "node"),
                  open: true,
                };
              },
              key: "node-navigate",
              label: "Reserve",
            },
          ],
          query
        );
      }

      console.log("FIltering");

      let nodes = await searchNodes({
        variables: { search: query },
      });

      let nodeActions = nodes?.data?.allnodes?.map((node) => {
        return {
          extension: "modify",
          label: node?.name || "unknown",
          key: "node",
          params: {
            type: "node",
            node: node?.id,
          },
          description: node?.description,
        };
      });

      return queryfiltered(nodeActions, query);
    },
    do: async ({ key, params }) => {
      console.log("Doing", key, params);
    },
  };

  useExtension(handler);

  return <></>;
};
