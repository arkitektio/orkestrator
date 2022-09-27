import React from "react";
import { Outlet } from "react-router";
import { ModuleLayout } from "../layout/ModuleLayout";
import { TeamSidebar } from "./man/TeamSidebar";

interface Props {}

export const Team: React.FC<Props> = (props) => {
  return (
    <ModuleLayout sidebar={<TeamSidebar />}>
      <Outlet />
    </ModuleLayout>
  );
};
