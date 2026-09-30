import { ServiceUnavailable } from "@/core/layout/fallbacks/ServiceUnavailable";
import { ModuleLayout } from "@/core/layout/ModuleLayout";
import { NotFound } from "@/core/layout/fallbacks/NotFound";
import React from "react";
import { Route, Routes } from "react-router-dom";
import { LokateGuard } from "./api/funcs";
import InsightsPage from "./pages/InsightsPage";
import PlacePage from "./pages/PlacePage";
import PlacesPage from "./pages/PlacesPage";
import PrivacyPage from "./pages/PrivacyPage";
import TimelinePage from "./pages/TimelinePage";
import TripPage from "./pages/TripPage";
import VisitPage from "./pages/VisitPage";

export const LokateModule: React.FC = () => (
  <LokateGuard fallback={<ServiceUnavailable serviceKey="lokate" />}>
    <ModuleLayout>
      <Routes>
        <Route index element={<TimelinePage />} />
        <Route path="places" element={<PlacesPage />} />
        <Route path="places/:id" element={<PlacePage />} />
        <Route path="visits/:id" element={<VisitPage />} />
        <Route path="trips/:id" element={<TripPage />} />
        <Route path="insights" element={<InsightsPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ModuleLayout>
  </LokateGuard>
);

export default LokateModule;
