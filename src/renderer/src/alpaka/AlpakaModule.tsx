import { ServiceUnavailable } from "@/core/app/components/fallbacks/ServiceUnavailable";
import { Guard } from "@/core/app/Arkitekt";
import { ModuleLayout } from "@/core/components/layout/ModuleLayout";
import React from "react";
import { Route, Routes } from "react-router-dom";
import CollectionPage from "./pages/CollectionPage";
import CollectionsPage from "./pages/CollectionsPage";
import HomePage from "./pages/HomePage";
import LLMModelPage from "./pages/LLMModelPage";
import LLMModelsPage from "./pages/LLMModelsPage";
import ProviderPage from "./pages/ProviderPage";
import ProvidersPage from "./pages/ProvidersPage";
import RoomPage from "./pages/RoomPage";
import RoomsPage from "./pages/RoomsPage";
import StandardPane from "./panes/StandardPane";
import { NotFound } from "@/core/app/components/fallbacks/NotFound";
interface Props { }

export const AlpakaModule: React.FC<Props> = () => {
  return (
    <Guard.Alpaka fallback={<ServiceUnavailable serviceKey="alpaka" />}>
      <ModuleLayout pane={<StandardPane />}>
        <Routes>
          <Route path="rooms/:id" element={<RoomPage />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="providers/:id" element={<ProviderPage />} />
          <Route path="providers" element={<ProvidersPage />} />
          <Route path="collections/:id" element={<CollectionPage />} />
          <Route path="collections" element={<CollectionsPage />} />
          <Route path="llmmodels/:id" element={<LLMModelPage />} />
          <Route path="llmmodels" element={<LLMModelsPage />} />
          <Route index element={<HomePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ModuleLayout>
    </Guard.Alpaka>
  );
};

export default AlpakaModule;
