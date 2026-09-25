import { ServiceUnavailable } from "@/core/app/components/fallbacks/ServiceUnavailable";
import { LovekitGuard } from "@/lovekit/api/funcs";
import { ModuleLayout } from "@/core/components/layout/ModuleLayout";
import React from "react";
import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import StreamPage from "./pages/StreamPage";
import StandardPane from "./panes/StandardPane";
import SoloBroadcast from "./pages/SoloBroadcast";
import SoloBroadcasts from "./pages/SoloBroadcasts";
import { NotFound } from "@/core/app/components/fallbacks/NotFound";
interface Props { }

export const Module: React.FC<Props> = (_props) => {
  return (
    <LovekitGuard fallback={<ServiceUnavailable serviceKey="lovekit" />}>
      <ModuleLayout pane={<StandardPane />}>
        <Routes>
          <Route path="streams/:id" element={<StreamPage />} />
          <Route path="solobroadcasts/:id" element={<SoloBroadcast />} />
          <Route path="solobroadcasts" element={<SoloBroadcasts />} />
          <Route index element={<HomePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ModuleLayout>
    </LovekitGuard>
  );
};

export default Module;
