import { NotFound } from "@/core/layout/fallbacks/NotFound";
import { RoleRoute } from "@/core/layout/fallbacks/NotPermitted";
import { ModuleLayout } from "@/core/layout/ModuleLayout";
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { SettingsLayout } from "./components/SettingsLayout";
import AccountPage from "./pages/AccountPage";
import AppearancePage from "./pages/AppearancePage";
import ConnectionPage from "./pages/ConnectionPage";
import DeveloperPage from "./pages/DeveloperPage";
import ExperimentsPage from "./pages/ExperimentsPage";
import MeshPage from "./pages/MeshPage";
import PalettePage from "./pages/PalettePage";
import RendererPage from "./pages/RendererPage";
import ResetPage from "./pages/ResetPage";
import HubPage from "./pages/HubPage";
import ServiceDetailPage from "./pages/ServiceDetailPage";
import ShortcutsPage from "./pages/ShortcutsPage";
import TelemetryPage from "./pages/TelemetryPage";
import UpdatesPage from "./pages/UpdatesPage";
import VoicePage from "./pages/VoicePage";
import { DEFAULT_SECTION, MOVED_SECTIONS, SETTINGS_SECTIONS, settingsLink } from "./sections";

/** One page per section in `sections.ts`; the slugs there are the routes here. */
const PAGES: Record<string, React.FC> = {
  account: AccountPage,
  appearance: AppearancePage,
  renderer: RendererPage,
  voice: VoicePage,
  shortcuts: ShortcutsPage,
  palette: PalettePage,
  connection: ConnectionPage,
  hub: HubPage,
  mesh: MeshPage,
  telemetry: TelemetryPage,
  updates: UpdatesPage,
  experiments: ExperimentsPage,
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
        <Route path="hub/:service" element={<ServiceDetailPage />} />
        {Object.entries(MOVED_SECTIONS).map(([from, to]) => (
          <Route key={from} path={from} element={<Navigate to={settingsLink(to)} replace />} />
        ))}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  </ModuleLayout>
);

export default SettingsModule;
