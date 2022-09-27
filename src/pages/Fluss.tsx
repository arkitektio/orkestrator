import React from "react";
import { Outlet } from "react-router";
import { ModuleLayout } from "../layout/ModuleLayout";
import FlowSidebar from "./flows/FlowSidebar";
import { TeamSidebar } from "./man/TeamSidebar";

interface Props {}

export const Fluss: React.FC<Props> = (props) => {
  return (
    <ModuleLayout sidebar={<FlowSidebar />}>
      <Outlet />
    </ModuleLayout>
  );
};
