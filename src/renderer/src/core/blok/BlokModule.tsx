import { ModuleLayout } from "@/core/layout/ModuleLayout";
import React from "react";
import { Route, Routes } from "react-router-dom";
import { Dashboards } from "./pages/Dashboards";
import { Home } from "./pages/Home";
import { NotFound } from "@/core/layout/fallbacks/NotFound";

interface Props { }
/**
 *
 * The Rekuest Module is the entrypoint to all specfic rekuest functionality.
 * It provides the routes for the rekuest module.
 */
const Module: React.FC<Props> = () => {
  return (
    <ModuleLayout>
      <Routes>
        <Route index element={<Home />} />
        <Route path="dashboards" element={<Dashboards />} />
        <Route path="externalblock" element={<div>External Block</div>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ModuleLayout>
  );
};

export default Module;
