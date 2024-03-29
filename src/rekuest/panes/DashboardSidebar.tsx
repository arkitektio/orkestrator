import * as React from "react";
import { withRekuest } from "..";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../floating/utils";
import { useNodeActionMate } from "../../mates/nodes/useNodeActionMate";
import {
  NodesEventDocument,
  NodesEventSubscriptionHookResult,
  NodesQuery,
  NodesQueryVariables,
  useNodesQuery,
} from "../api/graphql";
import { NodeCard } from "../components/cards/NodeCard";
import { NodeSearchFilter } from "../components/searches/NodeSearchFilter";

interface IDashBoardSidebarProps {}

const DashBoardSidebar: React.FunctionComponent<IDashBoardSidebarProps> = (
  props
) => {
  const { data, loading, subscribeToMore, refetch } =
    withRekuest(useNodesQuery)();
  const [filter, setFilter] = React.useState<NodesQueryVariables>({
    search: "",
  });

  const assignMate = useNodeActionMate();

  React.useEffect(() => {
    console.log("Subscribing to My Nodes");
    const unsubscribe = subscribeToMore({
      document: NodesEventDocument,
      variables: {},
      updateQuery: (prev, { subscriptionData }) => {
        console.log("Received Node", subscriptionData);
        var data = subscriptionData as NodesEventSubscriptionHookResult;
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

  React.useEffect(() => {
    refetch(filter);
  }, [filter, refetch]);

  return (
    <div className="flex h-full flex-col overflow-y-hidden">
      <div className="flex-none p-5 dark:text-slate-50">
        <NodeSearchFilter onFilterChanged={setFilter} />
      </div>
      <div className="flex-grow overflow-y-scroll p-2 overflow-x-hidden">
        {data?.allnodes && data?.allnodes.length > 0 && (
          <>
            <ResponsiveContainerGrid>
              {data?.allnodes?.filter(notEmpty).map((node, index) => (
                <NodeCard key={index} node={node} mates={[assignMate(node)]} />
              ))}
            </ResponsiveContainerGrid>
          </>
        )}
      </div>
    </div>
  );
};

export default DashBoardSidebar;
