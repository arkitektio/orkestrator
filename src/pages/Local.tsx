import React from "react";
import { Outlet } from "react-router";
import { ModuleLayout } from "../layout/ModuleLayout";
interface Props {}

export const Local: React.FC<Props> = (props) => {
  return (
    <ModuleLayout>
      <Outlet />
    </ModuleLayout>
  );
};
