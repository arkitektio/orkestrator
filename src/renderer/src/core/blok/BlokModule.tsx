import { ServiceUnavailable } from "@/core/app/components/fallbacks/ServiceUnavailable";
import { Guard } from "@/core/app/Arkitekt";
import { ModuleLayout } from "@/core/components/layout/ModuleLayout";
import React from "react";
import { Route, Routes } from "react-router-dom";
import { Dashboards } from "./pages/Dashboards";
import { Home } from "./pages/Home";
import StandardPane from "./panes/StandardPane";
import { NotFound } from "@/core/app/components/fallbacks/NotFound";
interface Props { }
/**
 *
 * The Rekuest Module is the entrypoint to all specfic rekuest functionality.
 * It provides the routes for the rekuest module.
 */
const Module: React.FC<Props> = () => {
  return (
    <Guard.Rekuest fallback={<ServiceUnavailable serviceKey="rekuest" />} key={"rekuest"}>
      <ModuleLayout pane={<StandardPane />}>
        <Routes>
          <Route index element={<Home />} />
          <Route path="dashboards" element={<Dashboards />} />
          <Route path="externalblock" element={<div>External Block</div>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ModuleLayout>
    </Guard.Rekuest>
  );
};

export default Module;
