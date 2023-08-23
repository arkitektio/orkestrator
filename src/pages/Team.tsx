import React from "react";
import { Outlet } from "react-router";
import { ModuleLayout } from "../layout/ModuleLayout";
import { ManGuard } from "../lok/LokGuard";
import { LokSidebar } from "./lok/LokSidebar";

interface Props {}

export const Team: React.FC<Props> = (props) => {
  return (
    <ManGuard>
      <ModuleLayout
        sidebars={[{ key: "search", label: "Search", content: <LokSidebar /> }]}
      >
        <Outlet />
      </ModuleLayout>
    </ManGuard>
  );
};
