import { ServiceUnavailable } from "@/core/app/components/fallbacks/ServiceUnavailable";
import { KabinetGuard } from "@/kabinet/api/hooks";
import { ModuleLayout } from "@/core/components/layout/ModuleLayout";
import React from "react";
import { Route, Routes } from "react-router-dom";
import AppPage from "./pages/AppPage";
import AppStoreRedirect from "./pages/AppStoreRedirect";
import AppStorePage from "./pages/AppStorePage";
import BackendPage from "./pages/BackendPage";
import DefinitionPage from "./pages/DefinitionPage";
import FlavourPage from "./pages/FlavourPage";
import HomePage from "./pages/HomePage";
import InstallRepoPage from "./pages/InstallRepoPage";
import PodPage from "./pages/PodPage";
import PodsPage from "./pages/PodsPage";
import RepoPage from "./pages/RepoPage";
import ReposPage from "./pages/ReposPage";
import ReleasePage from "./pages/ReleasePage";
import ResourcePage from "./pages/ResourcePage";
import StandardPane from "./panes/StandardPane";
import { NotFound } from "@/core/app/components/fallbacks/NotFound";
interface Props { }

export const KabinetModule: React.FC<Props> = () => {
  return (
    <KabinetGuard fallback={<ServiceUnavailable serviceKey="kabinet" />}>
      <ModuleLayout pane={<StandardPane />}>
        <Routes>
          <Route path="app-store" element={<AppStorePage />} />
          {/* The app page moved to the id-keyed model route; shared links to
              the old identifier-keyed URL still have to resolve. */}
          <Route path="app-store/:identifier" element={<AppStoreRedirect />} />
          <Route path="apps/:id" element={<AppPage />} />
          <Route path="repos" element={<ReposPage />} />
          {/* Static before dynamic: where the install deeplink lands. */}
          <Route path="repos/install" element={<InstallRepoPage />} />
          <Route path="repos/:id" element={<RepoPage />} />
          <Route path="pods" element={<PodsPage />} />
          <Route path="pods/:id" element={<PodPage />} />
          <Route path="definitions/:id" element={<DefinitionPage />} />
          <Route path="resources/:id" element={<ResourcePage />} />
          <Route path="backends/:id" element={<BackendPage />} />
          <Route path="releases/:id" element={<ReleasePage />} />
          <Route path="flavours/:id" element={<FlavourPage />} />
          <Route index element={<HomePage />} />
          <Route path="home" element={<HomePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ModuleLayout>
    </KabinetGuard>
  );
};

export default KabinetModule;
