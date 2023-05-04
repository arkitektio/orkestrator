import React from "react";
import { useNavigate } from "react-router";
import { notEmpty } from "../floating/utils";
import { SectionTitle } from "../layout/SectionTitle";
import { ListAgentFragment } from "../rekuest/api/graphql";
import { AgentCard } from "../rekuest/components/cards/AgentCard";
import { usePostman } from "../rekuest/postman/graphql/postman-context";
import { ResponsiveContainerGrid } from "./layout/ResponsiveContainerGrid";

export type IActiveClientsProps = {};

export const AgentItem = ({ agent }: { agent: ListAgentFragment }) => {};

const MyAgents: React.FC<IActiveClientsProps> = ({}) => {
  const { agents: data } = usePostman();
  const navigate = useNavigate();

  return (
    <>
      <SectionTitle>Active Agents</SectionTitle>
      <ResponsiveContainerGrid>
        {data?.agents?.filter(notEmpty).map((agent, index) => (
          <AgentCard agent={agent} key={index} />
        ))}
      </ResponsiveContainerGrid>
    </>
  );
};

export { MyAgents };
