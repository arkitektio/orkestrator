import React from "react";
import { Outlet } from "react-router";
import { ModuleLayout } from "../layout/ModuleLayout";
import FlowSidebar from "./flows/FlowSidebar";

interface Props {}

export const Fluss: React.FC<Props> = (props) => {
  return (
    <ModuleLayout
      sidebars={[{ key: "search", label: "Search", content: <FlowSidebar /> }]}
    >
      <Outlet />
    </ModuleLayout>
  );
};
