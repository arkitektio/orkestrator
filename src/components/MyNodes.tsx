import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import { notEmpty } from "../floating/utils";
import { SectionTitle } from "../layout/SectionTitle";
import { Node } from "../linker";
import { useDeleteNodeMate } from "../mates/nodes/useDeleteDatasetMate";
import { useNodeActionMate } from "../mates/nodes/useNodeActionMate";
import { withRekuest } from "../rekuest";
import {
  NodesEventDocument,
  NodesEventSubscriptionResult,
  NodesQuery,
  useNodesQuery,
} from "../rekuest/api/graphql";
import { NodeCard } from "../rekuest/components/cards/NodeCard";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";

export type IMyNodesProps = {};

const MyNodes: React.FC<IMyNodesProps> = ({}) => {
  const { data, loading, subscribeToMore } = withRekuest(useNodesQuery)({
    pollInterval: 30000,
  });

  const navigate = useNavigate();

  const nodeActionMate = useNodeActionMate();
  const deleteNodeMate = useDeleteNodeMate();

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
          <NodeCard
            key={index}
            node={node}
            mates={[nodeActionMate(node), deleteNodeMate(node)]}
          />
        ))}
      </ResponsiveGrid>
    </div>
  );
};

export { MyNodes };
