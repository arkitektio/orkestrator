import { ServiceUnavailable } from "@/core/layout/fallbacks/ServiceUnavailable";
import { serviceGuard } from "@/core/connection/arkitekt/host";
import { ModuleLayout } from "@/core/layout/ModuleLayout";
import React from "react";
import { Route, Routes } from "react-router-dom";
import { Dashboards } from "./pages/Dashboards";
import { Home } from "./pages/Home";
import StandardPane from "./panes/StandardPane";
import { NotFound } from "@/core/layout/fallbacks/NotFound";

const RekuestGuard = serviceGuard("rekuest");
interface Props { }
/**
 *
 * The Rekuest Module is the entrypoint to all specfic rekuest functionality.
 * It provides the routes for the rekuest module.
 */
const Module: React.FC<Props> = () => {
  return (
    <RekuestGuard fallback={<ServiceUnavailable serviceKey="rekuest" />} key={"rekuest"}>
      <ModuleLayout pane={<StandardPane />}>
        <Routes>
          <Route index element={<Home />} />
          <Route path="dashboards" element={<Dashboards />} />
          <Route path="externalblock" element={<div>External Block</div>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ModuleLayout>
    </RekuestGuard>
  );
};

export default Module;
