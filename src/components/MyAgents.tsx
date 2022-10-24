import React from "react";
import { useNavigate } from "react-router";
import { ListAgentFragment, LokAppGrantType } from "../rekuest/api/graphql";
import { AgentPulse } from "../rekuest/components/generic/StatusPulse";
import { usePostman } from "../rekuest/postman/graphql/postman-context";
import { notEmpty } from "../floating/utils";
import { SectionTitle } from "../layout/SectionTitle";
import { Agent } from "../linker";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";

export type IActiveClientsProps = {};

export const AgentItem = ({ agent }: { agent: ListAgentFragment }) => {
  return (
    <Agent.Smart
      showSelfMates={true}
      placement="bottom"
      object={agent.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded border overflow-hidden shadow-md p-3 text-white ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-1 ring-primary-200 "
        }`
      }
    >
      <div className="p-2">
        <div className="flex">
          <Agent.DetailLink
            className={({ isActive }) =>
              "cursor-pointer " + (isActive ? "text-primary-300" : "")
            }
            object={agent?.id}
          >
            {agent?.registry?.app?.name}
          </Agent.DetailLink>
          <div className="flex-grow"></div>
          <div className="flex-initial">
            <AgentPulse status={agent?.status} />
          </div>
        </div>
        <p className="text-sm text-gray-500">{agent?.identifier}</p>
        <p className="text-gray-700 text-base">
          {agent?.registry?.app?.grantType ===
            LokAppGrantType.ClientCredentials &&
            "User App by " + agent?.registry?.user?.email}
          {agent?.registry?.app?.grantType ===
            LokAppGrantType.AuthorizationCode &&
            "Public App used by " + agent?.registry?.user?.email}
        </p>
      </div>
    </Agent.Smart>
  );
};

const MyAgents: React.FC<IActiveClientsProps> = ({}) => {
  const { agents: data } = usePostman();
  const navigate = useNavigate();

  return (
    <>
      <SectionTitle>Active Agents</SectionTitle>
      <br />
      <ResponsiveGrid>
        {data?.agents?.filter(notEmpty).map((agent, index) => (
          <AgentItem agent={agent} key={index} />
        ))}
      </ResponsiveGrid>
    </>
  );
};

export { MyAgents };
