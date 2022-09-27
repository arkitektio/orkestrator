import React from "react";
import { Outlet } from "react-router";
import { MyRepos } from "../components/MyRepos";
import { MySwimmingWhales } from "../components/MySwimmingWhales";
import { MyWhales } from "../components/MyWhales";
import { WhalesSidebar } from "../components/sidebars/WhalesSidebar";
import { ModuleLayout } from "../layout/ModuleLayout";

interface Props {}

export const Whales: React.FC<Props> = (props) => {
  return (
    <ModuleLayout sidebar={<WhalesSidebar />}>
      <Outlet />
    </ModuleLayout>
  );
};
