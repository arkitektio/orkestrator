import React from "react";
import { Outlet } from "react-router";
import { ModuleLayout } from "../layout/ModuleLayout";
import { PortSidebar } from "./port/PortSidebar";

interface Props {}

export const Port: React.FC<Props> = (props) => {
  return (
    <ModuleLayout
      sidebars={[{ key: "search", label: "Search", content: <PortSidebar /> }]}
    >
      <Outlet />
    </ModuleLayout>
  );
};
