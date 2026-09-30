import { ServiceUnavailable } from "@/core/layout/fallbacks/ServiceUnavailable";
import { ModuleLayout } from "@/core/layout/ModuleLayout";
import { NotFound } from "@/core/layout/fallbacks/NotFound";
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LokateGuard } from "./api/funcs";
import PrivacyPage from "./pages/PrivacyPage";

export const LokateModule: React.FC = () => (
  <LokateGuard fallback={<ServiceUnavailable serviceKey="lokate" />}>
    <ModuleLayout>
      <Routes>
        <Route path="privacy" element={<PrivacyPage />} />
        {/* The timeline takes the index once the service reads by range. */}
        <Route index element={<Navigate to="privacy" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ModuleLayout>
  </LokateGuard>
);

export default LokateModule;
