import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import { RekuestNode } from "../../linker";
import {
  Extension,
  ModifyingAction,
  useGeneralMenu,
} from "../../providers/command/GeneralMenuContext";
import { useRekuest } from "../../rekuest";
import { NodesDocument, NodesQuery } from "../../rekuest/api/graphql";
import { useReserver } from "../../rekuest/providers/reserver/reserver-context";
import { queryfiltered } from "./GeneralMenu";

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
  const { client } = useRekuest();

  const navigate = useNavigate();
  const { reserve } = useReserver();

  const { registerExtension, unregisterExtension } = useGeneralMenu();

  useEffect(() => {
    if (client) {
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
                    navigate(
                      RekuestNode.linkBuilder(nodemodifier?.params?.node)
                    );
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

          let nodes = await client.query<NodesQuery>({
            query: NodesDocument,
            variables: { search: query },
          });

          console.log("Nodes", nodes?.data?.allnodes);

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
      console.log("Registering Extensions ", handler);
      registerExtension(handler);

      return () => unregisterExtension(handler.key);
    }
  }, [client]);

  return <></>;
};
