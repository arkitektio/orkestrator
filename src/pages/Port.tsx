import React from "react";
import { Outlet } from "react-router";
import { ModuleLayout } from "../layout/ModuleLayout";
import { WhaleSidebar } from "./port/WhaleSidebar";

interface Props {}

export const Port: React.FC<Props> = (props) => {
  return (
    <ModuleLayout sidebar={<WhaleSidebar />}>
      <Outlet />
    </ModuleLayout>
  );
};
