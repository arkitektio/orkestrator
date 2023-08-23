import React from "react";
import { Outlet } from "react-router";
import { ModuleLayout } from "../layout/ModuleLayout";
import { MikroGuard } from "../mikro/MikroGuard";
import DataSidebar from "./data/DataSidebar";
interface Props {}

export const Data: React.FC<Props> = (props) => {
  return (
    <MikroGuard>
      <ModuleLayout
        sidebars={[
          { key: "search", label: "Search", content: <DataSidebar /> },
        ]}
      >
        <Outlet />
      </ModuleLayout>
    </MikroGuard>
  );
};

export default Data;
