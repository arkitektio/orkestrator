import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import {
  NodeListItemFragment,
  NodesEventDocument,
  NodesEventSubscriptionResult,
  NodesQuery,
  useDeleteNodeMutation,
  useNodesQuery,
} from "../rekuest/api/graphql";
import { AdditionalMate, Mate } from "../rekuest/postman/mater/mater-context";
import { useReserver } from "../rekuest/postman/reserver/reserver-context";
import { notEmpty } from "../floating/utils";
import { SectionTitle } from "../layout/SectionTitle";
import { Flow, Node } from "../linker";
import { useConfirm } from "./confirmer/confirmer-context";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";
import { withRekuest } from "../rekuest";

export type IMyNodesProps = {};

export const NodeCard = ({ node }: { node: NodeListItemFragment }) => {
  const { reserve } = useReserver();
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  const [deleteNode] = withRekuest(useDeleteNodeMutation)();

  return (
    <Node.Smart
      object={node?.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded shadow-xl group text-white bg-slate-700 p-3 ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-1 ring-primary-200 "
        }`
      }
      additionalMates={(accept, isself) => {
        let mates: AdditionalMate[] = [];
        if (!isself) {
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

        mates.push({
          action: async () => {
            await confirm({
              message: "Are you sure you want to delete this node?",
            });
            await deleteNode({ variables: { id: node.id } });
          },
          label: "Delete",
        });

        return mates;
      }}
    >
      <Node.DetailLink className="cursor-pointer" object={node?.id}>
        <div className="text-xl font-light mb-2">{node?.name}</div>
        <p className="text-sm">
          {node?.package} on {node?.interface}
        </p>
      </Node.DetailLink>
    </Node.Smart>
  );
};

const MyNodes: React.FC<IMyNodesProps> = ({}) => {
  const { data, loading, subscribeToMore } = withRekuest(useNodesQuery)({
    pollInterval: 30000,
  });

  const navigate = useNavigate();

  useEffect(() => {
    console.log("Subscribing to My Representations");
    const unsubscribe = subscribeToMore({
      document: NodesEventDocument,
      variables: {},
      updateQuery: (prev, { subscriptionData }) => {
        console.log("Received Node", subscriptionData);
        var data = subscriptionData as NodesEventSubscriptionResult;
        let action = data.data?.nodes;
        let newelements;
        // Try to update
        if (action?.updated) {
          let updated_res = action.updated;
          newelements = prev.allnodes?.map((item: any) =>
            item.id === updated_res?.id
              ? { ...item, data: { ...item.data, ...updated_res } }
              : item
          );
        }

        if (action?.deleted) {
          let ended_res = action.deleted;
          newelements = prev.allnodes
            ?.map((item: any) => (item.id === ended_res ? null : item))
            .filter((item) => item != null);
        }

        if (action?.created) {
          let updated_res = action.created;
          newelements = prev.allnodes?.concat(updated_res);
        }

        console.log("Received ", subscriptionData);
        return {
          ...prev,
          nodes: newelements,
        } as NodesQuery;
      },
    });
    return () => unsubscribe();
  }, [subscribeToMore]);

  return (
    <div>
      <Node.ListLink>
        <SectionTitle>My Nodes</SectionTitle>
      </Node.ListLink>
      <br />
      <ResponsiveGrid>
        {data?.allnodes?.filter(notEmpty).map((node, index) => (
          <NodeCard key={index} node={node} />
        ))}
      </ResponsiveGrid>
    </div>
  );
};

export { MyNodes };
