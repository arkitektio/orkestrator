import React from "react";
import { useNavigate } from "react-router";
import { notEmpty } from "../floating/utils";
import { SectionTitle } from "../layout/SectionTitle";
import { useBounceAgentMate } from "../mates/agent/useBounceAgentMate";
import { useDeleteAgentMate } from "../mates/agent/useDeleteAgentMate";
import { useKickAgentMate } from "../mates/agent/useKickAgentMate";
import { withRekuest } from "../rekuest";
import { ListAgentFragment, useMyAgentsQuery } from "../rekuest/api/graphql";
import { AgentCard } from "../rekuest/components/cards/AgentCard";
import { ResponsiveContainerGrid } from "./layout/ResponsiveContainerGrid";

export type IActiveClientsProps = {};

export const AgentItem = ({ agent }: { agent: ListAgentFragment }) => {};

const MyAgents: React.FC<IActiveClientsProps> = ({}) => {
  const navigate = useNavigate();

  const { data } = withRekuest(useMyAgentsQuery)({
    fetchPolicy: "cache-and-network",
  });

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
