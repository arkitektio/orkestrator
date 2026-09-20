import { NotFound } from "@/app/components/fallbacks/NotFound";
import { ModuleLayout } from "@/components/layout/ModuleLayout";
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { SettingsLayout } from "./components/SettingsLayout";
import AccountPage from "./pages/AccountPage";
import AppearancePage from "./pages/AppearancePage";
import DeveloperPage from "./pages/DeveloperPage";
import GeneralPage from "./pages/GeneralPage";
import PalettePage from "./pages/PalettePage";
import ServicesPage from "./pages/ServicesPage";
import VoicePage from "./pages/VoicePage";
import { DEFAULT_SECTION, SETTINGS_SECTIONS } from "./sections";

/** One page per section in `sections.ts`; the slugs there are the routes here. */
const PAGES: Record<string, React.FC> = {
  account: AccountPage,
  general: GeneralPage,
  appearance: AppearancePage,
  voice: VoicePage,
  palette: PalettePage,
  services: ServicesPage,
  developer: DeveloperPage,
};

export const SettingsModule: React.FC = () => (
  <ModuleLayout>
    <Routes>
      <Route element={<SettingsLayout />}>
        <Route index element={<Navigate to={DEFAULT_SECTION} replace />} />
        {SETTINGS_SECTIONS.map(({ slug }) => {
          const Page = PAGES[slug];
          return <Route key={slug} path={slug} element={Page ? <Page /> : <NotFound />} />;
        })}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  </ModuleLayout>
);

export default SettingsModule;
