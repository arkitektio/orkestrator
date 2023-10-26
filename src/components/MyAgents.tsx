import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import { notEmpty } from "../floating/utils";
import { SectionTitle } from "../layout/SectionTitle";
import { useBounceAgentMate } from "../mates/agent/useBounceAgentMate";
import { useDeleteAgentMate } from "../mates/agent/useDeleteAgentMate";
import { useKickAgentMate } from "../mates/agent/useKickAgentMate";
import { withRekuest } from "../rekuest";
import { AgentsEventDocument, AgentsEventSubscription, ListAgentFragment, MyAgentsQuery, useMyAgentsQuery } from "../rekuest/api/graphql";
import { AgentCard } from "../rekuest/components/cards/AgentCard";
import { ResponsiveContainerGrid } from "./layout/ResponsiveContainerGrid";

export type IActiveClientsProps = {};

export const AgentItem = ({ agent }: { agent: ListAgentFragment }) => {};

const MyAgents: React.FC<IActiveClientsProps> = ({}) => {
  const navigate = useNavigate();

  const { data, subscribeToMore} = withRekuest(useMyAgentsQuery)({
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    console.log("Subscribing to My Representations");
    const unsubscribe = subscribeToMore<AgentsEventSubscription>({
      document: AgentsEventDocument,
      updateQuery: (prev, { subscriptionData }) => {
        console.log("Received Representation", subscriptionData);
        var data = subscriptionData;
        let action = data.data?.agentsEvent;
        let newelements;
        // Try to update
        if (action?.updated) {
          let updated_res = action.updated;
          newelements = prev.myagents?.map((item: any) =>
            item.id === updated_res?.id
              ? { ...item, data: { ...item.data, ...updated_res } }
              : item
          );
        }

        if (action?.deleted) {
          let ended_res = action.deleted;
          newelements = prev.myagents
            ?.map((item: any) => (item.id === ended_res ? null : item))
            .filter((item) => item != null);
        }

        if (action?.created) {
          let updated_res = action.created;
          if (prev.myagents) {
            newelements = [updated_res, ...prev.myagents];
          } else {
            newelements = [updated_res];
          }
        }

        console.log("Received ", subscriptionData);
        return {
          ...prev,
          myrepresentations: newelements,
        } as MyAgentsQuery;
      },
    });
    return () => unsubscribe();
  }, [subscribeToMore]);






  const kickagent = useKickAgentMate();
  const bounceagent = useBounceAgentMate();
  const deleteagent = useDeleteAgentMate();

  return (
    <>
      <SectionTitle>Active Apps</SectionTitle>
      <ResponsiveContainerGrid>
        {data?.myagents?.filter(notEmpty).map((agent, index) => (
          <AgentCard
            agent={agent}
            key={index}
            mates={[kickagent(agent), deleteagent(agent), bounceagent(agent)]}
          />
        ))}
      </ResponsiveContainerGrid>
    </>
  );
};

export { MyAgents };
