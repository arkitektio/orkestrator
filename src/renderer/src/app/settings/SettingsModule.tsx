import { NotFound } from "@/core/layout/fallbacks/NotFound";
import { RoleRoute } from "@/core/layout/fallbacks/NotPermitted";
import { ModuleLayout } from "@/core/layout/ModuleLayout";
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { SettingsLayout } from "./components/SettingsLayout";
import AccountPage from "./pages/AccountPage";
import AppearancePage from "./pages/AppearancePage";
import DeveloperPage from "./pages/DeveloperPage";
import GeneralPage from "./pages/GeneralPage";
import MeshPage from "./pages/MeshPage";
import PalettePage from "./pages/PalettePage";
import RendererPage from "./pages/RendererPage";
import ResetPage from "./pages/ResetPage";
import ServicesPage from "./pages/ServicesPage";
import TelemetryPage from "./pages/TelemetryPage";
import VoicePage from "./pages/VoicePage";
import { DEFAULT_SECTION, SETTINGS_SECTIONS } from "./sections";

/** One page per section in `sections.ts`; the slugs there are the routes here. */
const PAGES: Record<string, React.FC> = {
  account: AccountPage,
  general: GeneralPage,
  appearance: AppearancePage,
  renderer: RendererPage,
  voice: VoicePage,
  palette: PalettePage,
  services: ServicesPage,
  mesh: MeshPage,
  telemetry: TelemetryPage,
  developer: DeveloperPage,
  reset: ResetPage,
};

export const SettingsModule: React.FC = () => (
  <ModuleLayout>
    <Routes>
      <Route element={<SettingsLayout />}>
        <Route index element={<Navigate to={DEFAULT_SECTION} replace />} />
        {SETTINGS_SECTIONS.map(({ slug, roles }) => {
          const Page = PAGES[slug];
          return (
            <Route
              key={slug}
              path={slug}
              element={Page ? <RoleRoute roles={roles}><Page /></RoleRoute> : <NotFound />}
            />
          );
        })}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  </ModuleLayout>
);

export default SettingsModule;
