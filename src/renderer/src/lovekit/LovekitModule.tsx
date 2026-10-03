import { ModuleLayout } from "@/core/layout/ModuleLayout";
import React from "react";
import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import StreamPage from "./pages/StreamPage";
import SoloBroadcast from "./pages/SoloBroadcast";
import SoloBroadcasts from "./pages/SoloBroadcasts";
import { NotFound } from "@/core/layout/fallbacks/NotFound";
interface Props { }

export const Module: React.FC<Props> = (_props) => {
  return (
    <ModuleLayout>
      <Routes>
        <Route path="streams/:id" element={<StreamPage />} />
        <Route path="solobroadcasts/:id" element={<SoloBroadcast />} />
        <Route path="solobroadcasts" element={<SoloBroadcasts />} />
        <Route index element={<HomePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ModuleLayout>
  );
};

export default Module;
