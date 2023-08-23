import React from "react";
import { Outlet } from "react-router";
import { ModuleLayout } from "../layout/ModuleLayout";
import { SettingsSidebar } from "../settings/panes/Sidebar";
interface Props {}

export const Settings: React.FC<Props> = (props) => {
  return (
    <ModuleLayout
      sidebars={[
        { key: "search", label: "Search", content: <SettingsSidebar /> },
      ]}
    >
      <Outlet />
    </ModuleLayout>
  );
};
