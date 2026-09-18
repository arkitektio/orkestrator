import { Guard } from "@/app/Arkitekt";
import { ModuleLayout } from "@/components/layout/ModuleLayout";
import React from "react";
import { Route, Routes } from "react-router-dom";
import ExperimentPage from "./pages/ExperimentPage";
import ExperimentsPage from "./pages/ExperimentsPage";
import FilePage from "./pages/FilePage";
import FilesPage from "./pages/FilesPage";
import HomePage from "./pages/HomePage";
import ModelCollectionPage from "./pages/ModelCollectionPage";
import ModelCollectionsPage from "./pages/ModelCollectionsPage";
import ModelWorkspacePage from "./pages/ModelWorkspacePage";
import ModelWorkspacesPage from "./pages/ModelWorkspacesPage";
import NeuronModelEditorPage from "./pages/NeuronModelEditorPage";
import NeuronModelPage from "./pages/NeuronModelPage";
import NeuronModelTreePage from "./pages/NeuronModelTreePage";
import NeuronModelsPage from "./pages/NeuronModelsPage";
import SimulationPage from "./pages/SimulationPage";
import SimulationsPage from "./pages/SimulationsPage";
import StandardPane from "./panes/StandardPane";
import { MechanismPage } from "./pages/MechanismPage";
import { EnvironmentPage } from "./pages/EnvironmentPage";
import { ElektroZarrStoreProvider } from "./components/store/ElektroZarrStoreProvider";
import { ElektroParquetProvider } from "./components/store/parquetEngine";
import { NotFound } from "@/app/components/fallbacks/NotFound";
interface Props { }

export const ElektroModule: React.FC<Props> = () => {
  return (
    <Guard.Elektro unavailable={<>Loading</>} unconfigured={<>Loading</>} configuring={<>Loading</>} challenging={<>Loading</>}>
      <ElektroZarrStoreProvider>
        <ElektroParquetProvider>
        <ModuleLayout pane={<StandardPane />}>
        <Routes>
          <Route path="files/:id" element={<FilePage />} />
          <Route path="files" element={<FilesPage />} />
          <Route path="simulations/:id" element={<SimulationPage />} />
          <Route path="experiments/:id" element={<ExperimentPage />} />
          <Route path="neuronmodels/:id" element={<NeuronModelPage />} />
          <Route path="neuronmodels/:id/edit" element={<NeuronModelEditorPage />} />
          <Route path="neuronmodels/:id/tree" element={<NeuronModelTreePage />} />
          <Route
            path="modelcollections/:id"
            element={<ModelCollectionPage />}
          />
          <Route
            path="modelworkspaces/:id"
            element={<ModelWorkspacePage />}
          />
          <Route path="modelworkspaces" element={<ModelWorkspacesPage />} />
          <Route path="simulations" element={<SimulationsPage />} />
          <Route path="experiments" element={<ExperimentsPage />} />
          <Route path="neuronmodels" element={<NeuronModelsPage />} />
          <Route path="mechanisms/:id" element={<MechanismPage />} />
          <Route path="environments/:id" element={<EnvironmentPage />} />
          <Route path="modelcollections" element={<ModelCollectionsPage />} />
          <Route index element={<HomePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </ModuleLayout>
        </ElektroParquetProvider>
      </ElektroZarrStoreProvider>
    </Guard.Elektro>
  );
};

export default ElektroModule;
