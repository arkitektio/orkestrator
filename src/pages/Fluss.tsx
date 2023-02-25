import React from "react";
import { Outlet } from "react-router";
import { FlussGuard } from "../fluss/guard";
import { ModuleLayout } from "../layout/ModuleLayout";
import FlowSidebar from "./flows/FlowSidebar";

interface Props {}

export const Fluss: React.FC<Props> = (props) => {
  return (
    <FlussGuard>
      <Outlet />
    </FlussGuard>
  );
};
