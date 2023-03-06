import React, { useDebugValue } from "react";
import { useNavigate } from "react-router";
import {
  ListAgentFragment,
  useDeleteAgentMutation,
} from "../rekuest/api/graphql";
import { AgentPulse } from "../rekuest/components/generic/StatusPulse";
import { usePostman } from "../rekuest/postman/graphql/postman-context";
import { notEmpty } from "../floating/utils";
import { SectionTitle } from "../layout/SectionTitle";
import { Agent } from "../linker";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";
import { AppEmblem } from "../lok/components/AppEmblem";
import { app } from "@tauri-apps/api";
import { UserEmblem } from "../lok/components/UserEmblem";
import { RegistryEmblem } from "../rekuest/components/RegistryEmblem";
import { AppImage } from "../lok/components/AppImage";
import { withRekuest } from "../rekuest";
import { ResponsiveContainerGrid } from "./layout/ResponsiveContainerGrid";
import { AgentCard } from "../rekuest/components/cards/AgentCard";

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
