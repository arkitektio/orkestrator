import { ServiceUnavailable } from "@/core/layout/fallbacks/ServiceUnavailable";
import { DokumentsGuard } from "./api/funcs";
import { ModuleLayout } from "@/core/layout/ModuleLayout";
import React from "react";
import { Route, Routes } from "react-router-dom";
import DocumentPage from "./pages/DocumentPage";
import FilePage from "./pages/FilePage";
import HomePage from "./pages/HomePage";
import PagePage from "./pages/PagePage";
import StandardPane from "./panes/StandardPane";
import { NotFound } from "@/core/layout/fallbacks/NotFound";
interface Props { }

export const Module: React.FC<Props> = (_props) => {
  return (
    <DokumentsGuard fallback={<ServiceUnavailable serviceKey="dokuments" />}>
      <ModuleLayout pane={<StandardPane />}>
        <Routes>
          <Route path="files/:id" element={<FilePage />} />
          <Route path="pages/:id" element={<PagePage />} />
          <Route path="documents/:id" element={<DocumentPage />} />
          <Route index element={<HomePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ModuleLayout>
    </DokumentsGuard>
  );
};

export default Module;
