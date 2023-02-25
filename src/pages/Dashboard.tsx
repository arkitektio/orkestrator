import React from "react";
import { Outlet } from "react-router";
import BreadCrumbs from "../components/navigation/Breadcrumbs";
import { ModuleLayout } from "../layout/ModuleLayout";
import { RekuestGuard } from "../rekuest/RekuestGuard";
import DashBoardSidebar from "./dashboard/DashboardSidebar";

interface Props {}

export const Dashboard: React.FC<Props> = (props) => {
  return (
    <RekuestGuard fallback={"Rekuest module is for this server"}>
      <ModuleLayout
        sidebars={[
          { key: "search", label: "Search", content: <DashBoardSidebar /> },
        ]}
      >
        <Outlet />
      </ModuleLayout>
    </RekuestGuard>
  );
};

export default Dashboard;
