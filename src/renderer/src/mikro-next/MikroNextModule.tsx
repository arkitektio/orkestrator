import { ServiceUnavailable } from "@/app/components/fallbacks/ServiceUnavailable";
import { Guard } from "@/app/Arkitekt";
import { NotFound } from "@/app/components/fallbacks/NotFound";
import { ModuleLayout } from "@/components/layout/ModuleLayout";
import { Route, Routes } from "react-router-dom";
import ArrayDatasetPage from "./pages/ArrayDatasetPage";
import ArrayDatasetSpecPage from "./pages/ArrayDatasetSpecPage";
import ArrayDatasetsPage from "./pages/ArrayDatasetsPage";
import AnnotationPage from "./pages/AnnotationPage";
import AnnotationsPage from "./pages/AnnotationsPage";
import CoordinateSystemPage from "./pages/CoordinateSystemPage";
import CoordinateSystemsPage from "./pages/CoordinateSystemsPage";
import FilePage from "./pages/FilePage";
import FilesPage from "./pages/FilesPage";
import FolderPage from "./pages/FolderPage";
import FoldersPage from "./pages/FoldersPage";
import HomePage from "./pages/HomePage";
import PeerHomePage from "./pages/PeerHomePage";
import TableDatasetPage from "./pages/TableDatasetPage";
import TableDatasetsPage from "./pages/TableDatasetsPage";
import SparseDatasetPage from "./pages/SparseDatasetPage";
import SparseDatasetsPage from "./pages/SparseDatasetsPage";
import ScenesPage from "./pages/ScenesPage";
import ScenePage from "./pages/ScenePage";
import SceneRegistrationPage from "./pages/SceneRegistrationPage";
import { LensPage } from "./pages/LensPage";
import StandardPane from "./panes/StandardPane";

export const MikroNextModule = () => {
  return (
    <Guard.Mikro fallback={<ServiceUnavailable serviceKey="mikro" />}>
      <ModuleLayout pane={<StandardPane />}>
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="home" element={<HomePage />} />
          <Route path="folders/:id" element={<FolderPage />} />
          <Route path="folders" element={<FoldersPage />} />
          {/* Three segments, so it cannot be mistaken for arrayDatasets/:id. */}
          <Route path="arraydatasets/spec/:spec" element={<ArrayDatasetSpecPage />} />
          <Route path="arraydatasets/:id" element={<ArrayDatasetPage />} />
          <Route path="arraydatasets" element={<ArrayDatasetsPage />} />
          <Route
            path="coordinatesystems/:id"
            element={<CoordinateSystemPage />}
          />
          <Route path="coordinatesystems" element={<CoordinateSystemsPage />} />
          <Route path="lenses/:id" element={<LensPage />} />
          <Route path="files" element={<FilesPage />} />
          <Route path="annotations" element={<AnnotationsPage />} />
          <Route path="annotations/:id" element={<AnnotationPage />} />
          <Route path="scenes" element={<ScenesPage />} />
          <Route path="scenes/:id" element={<ScenePage />} />
          {/* Its own page, opted into from a scene — never a mode of ScenePage. */}
          <Route path="scenes/:id/register" element={<SceneRegistrationPage />} />
          <Route path="peerhome/:id" element={<PeerHomePage />} />
          <Route path="files/:id" element={<FilePage />} />
          <Route path="tabledatasets" element={<TableDatasetsPage />} />
          <Route path="tabledatasets/:id" element={<TableDatasetPage />} />
          <Route path="sparsedatasets" element={<SparseDatasetsPage />} />
          <Route path="sparsedatasets/:id" element={<SparseDatasetPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ModuleLayout>
    </Guard.Mikro>
  );
};

export default MikroNextModule;
