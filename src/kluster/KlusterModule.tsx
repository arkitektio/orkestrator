import { KlusterGuard } from "@jhnnsrs/kluster";
import React from "react";
import { Route, Routes } from "react-router";
import { ModuleLayout } from "../layout/ModuleLayout";
import ClusterPage from "./pages/ClusterPage";
import HomePage from "./pages/HomePage";

interface Props {}

export const KlusterModule: React.FC<Props> = (props) => {
  return (
    <KlusterGuard fallback={<>Loading</>}>
      <ModuleLayout>
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="clusters/:id" element={<ClusterPage/>} />
        </Routes>
      </ModuleLayout>
    </KlusterGuard>
  );
};

export default KlusterModule;
