import React from "react";
import { Outlet } from "react-router";
import { ModuleLayout } from "../layout/ModuleLayout";
import { PortGuard } from "../port/PortGuard";
import { PortSidebar } from "./port/PortSidebar";

interface Props {}

export const Port: React.FC<Props> = (props) => {
  return (
    <PortGuard>
      <ModuleLayout
        sidebars={[
          { key: "search", label: "Search", content: <PortSidebar /> },
        ]}
      >
        <Outlet />
      </ModuleLayout>
    </PortGuard>
  );
};
