import React, { useDebugValue } from "react";
import { useNavigate } from "react-router";
import { ListAgentFragment } from "../rekuest/api/graphql";
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
      <div className="">
        <div className="flex flex-row w-full">
          <Agent.DetailLink
            className={({ isActive }) =>
              "flex-grow cursor-pointer p-2 " +
              (isActive ? "text-primary-300" : "")
            }
            object={agent?.id}
          >
            {agent.registry?.app?.identifier}
            <p className="text-sm text-gray-500 my-auto">
              {agent?.registry?.app?.version} on {agent?.identifier}
            </p>
          </Agent.DetailLink>
          <div className="flex-initial">
            {agent.registry.app && (
              <AppImage
                className="w-12 h-12 "
                identifier={agent.registry?.app?.identifier}
                version={agent.registry?.app?.version}
              />
            )}
          </div>
        </div>
      </div>

      {agent.registry?.user && <UserEmblem sub={agent.registry?.user?.sub} />}
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
