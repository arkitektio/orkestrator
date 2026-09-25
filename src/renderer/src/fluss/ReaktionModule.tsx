import { ServiceUnavailable } from "@/core/app/components/fallbacks/ServiceUnavailable";
import { ModuleLayout } from "@/core/components/layout/ModuleLayout";
import { Guard } from "@/core/app/Arkitekt";
import React from "react";
import { Route, Routes } from "react-router-dom";
import Flow from "./pages/Flow";
import Home from "./pages/Home";
import Run from "./pages/Run";
import Runs from "./pages/Runs";
import Workspace from "./pages/Workspace";
import Workspaces from "./pages/Workspaces";
import SearchPane from "./panes/SearchPane";
import { NotFound } from "@/core/app/components/fallbacks/NotFound";

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
    <Guard.Fluss fallback={<ServiceUnavailable serviceKey="fluss" />}>
      <ModuleLayout
        pane={
          <>
            <SearchPane />
          </>
        }
      >
        <Routes>
          <Route index element={<Home />} />
          <Route path="runs" element={<Runs />} />
          <Route path="workspaces" element={<Workspaces />} />
          <Route path="workspaces/:id" element={<Workspace />} />
          <Route path="flows/:id" element={<Flow />} />
          <Route path="runs/:id" element={<Run />} />
          <Route path="home" element={<Home />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ModuleLayout>
    </Guard.Fluss>
  );
};

export default Module;
