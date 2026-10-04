import { ModuleLayout } from "@/core/layout/ModuleLayout";
import { NotFound } from "@/core/layout/fallbacks/NotFound";
import React from "react";
import { Route, Routes } from "react-router-dom";
import InsightsPage from "./pages/InsightsPage";
import PlacePage from "./pages/PlacePage";
import PlacesPage from "./pages/PlacesPage";
import PrivacyPage from "./pages/PrivacyPage";
import TimelinePage from "./pages/TimelinePage";
import TripPage from "./pages/TripPage";
import VisitPage from "./pages/VisitPage";
import VisitsPage from "./pages/VisitsPage";
import TripsPage from "./pages/TripsPage";

export const LokateModule: React.FC = () => (
  <ModuleLayout>
    <Routes>
      <Route index element={<TimelinePage />} />
      <Route path="places" element={<PlacesPage />} />
      <Route path="places/:id" element={<PlacePage />} />
      <Route path="visits/:id" element={<VisitPage />} />
      <Route path="trips/:id" element={<TripPage />} />
      <Route path="insights" element={<InsightsPage />} />
      <Route path="privacy" element={<PrivacyPage />} />
      <Route path="visits" element={<VisitsPage />} />
      <Route path="trips" element={<TripsPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </ModuleLayout>
);

export default LokateModule;
