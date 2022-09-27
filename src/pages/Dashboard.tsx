import React from "react";
import { Outlet } from "react-router";
import BreadCrumbs from "../components/navigation/Breadcrumbs";
import { ModuleLayout } from "../layout/ModuleLayout";
import DashBoardSidebar from "./dashboard/DashboardSidebar";

interface Props {}

export const Dashboard: React.FC<Props> = (props) => {
  return (
    <ModuleLayout sidebar={<DashBoardSidebar />}>
      <Outlet />
    </ModuleLayout>
  );
};
