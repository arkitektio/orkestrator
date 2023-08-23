import React from "react";
import { Route, Routes } from "react-router";
import { ModuleLayout } from "../layout/ModuleLayout";
import { SettingsHome } from "./pages/SettingsHome";
import SidePane from "./panes/Sidebar";
interface Props {}

export const MikroModule: React.FC<Props> = (props) => {
  return (
    <ModuleLayout
      sidebars={[
        {
          key: "search",
          label: "Search",
          content: <SidePane />,
        },
      ]}
    >
      <Routes>
        <Route index element={<SettingsHome />} />
      </Routes>
    </ModuleLayout>
  );
};

export default MikroModule;
