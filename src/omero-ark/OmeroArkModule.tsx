import { OmeroArkGuard } from "@jhnnsrs/omero-ark";
import React from "react";
import { Route, Routes } from "react-router";
import { ModuleLayout } from "../layout/ModuleLayout";
import { ConnectedGuard } from "./ConnectedGuard";
import DatasetPage from "./pages/DatasetPage";
import HomePage from "./pages/HomePage";
import ImagePage from "./pages/ImagePage";
import ProjectPage from "./pages/ProjectPage";
interface Props {}

export const OmeroArkModule: React.FC<Props> = (props) => {
  return (
    <OmeroArkGuard fallback={<>Loading</>}>
      <ModuleLayout>
        <ConnectedGuard>
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="projects/:id" element={<ProjectPage/>} />
          <Route path="datasets/:id" element={<DatasetPage/>} />
          <Route path="images/:id" element={<ImagePage/>} />
          <Route path="*" element={<> NOTHING</>} />
        </Routes>
        </ConnectedGuard>
      </ModuleLayout>
    </OmeroArkGuard>
  );
};

export default OmeroArkModule;
