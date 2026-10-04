import { ModuleLayout } from "@/core/layout/ModuleLayout";
import React from "react";
import { Route, Routes } from "react-router-dom";
import Flow from "./pages/Flow";
import Home from "./pages/Home";
import Run from "./pages/Run";
import Runs from "./pages/Runs";
import Workspace from "./pages/Workspace";
import Workspaces from "./pages/Workspaces";
import { NotFound } from "@/core/layout/fallbacks/NotFound";
import Flows from "./pages/Flows";

interface Props { }

/**
 * The Reaktion Module is the entrypoint to all stream workflow related functionality
 * It provides the routes for the reaktion module.
 *
 *
 * @returns
 */

const Module: React.FC<Props> = () => {
  return (
    <ModuleLayout>
      <Routes>
        <Route index element={<Home />} />
        <Route path="runs" element={<Runs />} />
        <Route path="workspaces" element={<Workspaces />} />
        <Route path="workspaces/:id" element={<Workspace />} />
        <Route path="flows/:id" element={<Flow />} />
        <Route path="runs/:id" element={<Run />} />
        <Route path="home" element={<Home />} />
        <Route path="flows" element={<Flows />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ModuleLayout>
  );
};

export default Module;
