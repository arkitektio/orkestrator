import { ServiceUnavailable } from "@/core/app/components/fallbacks/ServiceUnavailable";
import { OmeroArkGuard } from "@/omeroark/api/funcs";
import { ModuleLayout } from "@/core/components/layout/ModuleLayout";
import { Route, Routes } from "react-router-dom";
import { ConnectedGuard } from "./ConnectedGuard";
import DatasetPage from "./pages/DatasetPage";
import DatasetsPage from "./pages/DatasetsPage";
import HomePage from "./pages/HomePage";
import OmeroImagePage from "./pages/OmeroImagePage";
import ProjectPage from "./pages/ProjectPage";
import ProjectsPage from "./pages/ProjectsPage";
import StandardPane from "./panes/StandardPane";
import { NotFound } from "@/core/app/components/fallbacks/NotFound";


export const OmeroArkModule = () => {
  return (
    <OmeroArkGuard fallback={<ServiceUnavailable serviceKey="omero_ark" />}>
      <ModuleLayout pane={<StandardPane />}>
        <ConnectedGuard>
          <Routes>
            <Route index element={<HomePage />} />
            <Route path="projects/:id" element={<ProjectPage />} />
            <Route path="datasets/:id" element={<DatasetPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="datasets" element={<DatasetsPage />} />
            <Route path="images/:id" element={<OmeroImagePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ConnectedGuard>
      </ModuleLayout>
    </OmeroArkGuard>
  );
};

export default OmeroArkModule;
