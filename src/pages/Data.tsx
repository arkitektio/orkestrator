import React, { useState } from "react";
import { Outlet } from "react-router";
import BreadCrumbs from "../components/navigation/Breadcrumbs";
import DataSidebar from "./data/DataSidebar";
import { Disclosure, Transition } from "@headlessui/react";
import { ModuleLayout } from "../layout/ModuleLayout";
interface Props {}

export const Data: React.FC<Props> = (props) => {
  return (
    <ModuleLayout
      sidebars={[{ key: "search", label: "Search", content: <DataSidebar /> }]}
    >
      <Outlet />
    </ModuleLayout>
  );
};
