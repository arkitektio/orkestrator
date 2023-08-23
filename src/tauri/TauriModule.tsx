import React from "react";
import { Route, Routes } from "react-router";
import { ModuleLayout } from "../layout/ModuleLayout";
import { TauriGuard } from "./guard";
import Home from "./pages/Home";
import SidePane from "./panes/Sidebar";
interface Props {}

export const TauriModule: React.FC<Props> = (props) => {
  return (
    <TauriGuard>
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
          <Route index element={<Home />} />
        </Routes>
      </ModuleLayout>
    </TauriGuard>
  );
};

export default TauriModule;
