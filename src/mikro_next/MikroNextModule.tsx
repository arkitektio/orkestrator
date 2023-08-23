import React from "react";
import { Route, Routes } from "react-router";
import { ModuleLayout } from "../layout/ModuleLayout";
import { MikroNextGuard } from "./MikroNextGuard";
import DatasetPage from "./pages/DatasetPage";
import DatasetsPage from "./pages/DatasetsPage";
import HomePage from "./pages/HomePage";
import ImagePage from "./pages/ImagePage";
import ImagesPage from "./pages/ImagesPage";
import StagePage from "./pages/StagePage";
import StagesPage from "./pages/StagesPage";
interface Props {}

export const MikroNextModule: React.FC<Props> = (props) => {
  return (
    <MikroNextGuard fallback={<>Loading</>}>
      <ModuleLayout sidebars={[]}>
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="images/:id" element={<ImagePage />} />
          <Route path="images" element={<ImagesPage />} />
          <Route path="datasets/:id" element={<DatasetPage />} />
          <Route path="datasets" element={<DatasetsPage />} />
          <Route path="stages/:id" element={<StagePage />} />
          <Route path="stages" element={<StagesPage />} />
          <Route path="*" element={<> NOTHING</>} />
        </Routes>
      </ModuleLayout>
    </MikroNextGuard>
  );
};

export default MikroNextModule;
