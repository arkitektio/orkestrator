import { ModuleLayout } from "@/core/layout/ModuleLayout";
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppPage from "./pages/AppPage";
import AppsPage from "./pages/AppsPage";
import ClientPage from "./pages/ClientPage";
import DevicePage from "./pages/DevicePage";
import DevicesPage from "./pages/DevicesPage";
import HomePage from "./pages/HomePage";
import InstancesPage from "./pages/InstancesPage";
import LayerPage from "./pages/LayerPage";
import LayersPage from "./pages/LayersPage";
import MandatePage from "./pages/MandatePage";
import MandatesPage from "./pages/MandatesPage";
import MePage from "./pages/MePage";
import RecordPage from "./pages/RecordPage";
import RedeemTokenPage from "./pages/RedeemTokenPage";
import RedeemTokensPage from "./pages/RedeemTokensPage";
import ReleasePage from "./pages/ReleasePage";
import ServiceInstancePage from "./pages/ServiceInstancePage";
import ServicePage from "./pages/ServicePage";
import ServicesPage from "./pages/ServicesPage";
import UserPage from "./pages/UserPage";
import UsersPage from "./pages/UsersPage";
import TeamHomePage from "./pages/TeamHomePage";
import { NotFound } from "@/core/layout/fallbacks/NotFound";
import { RoleRoute } from "@/core/layout/fallbacks/NotPermitted";
import { ADMIN_ROLE } from "@/core/connection/roles";
interface Props { }

export const LokNextModule: React.FC<Props> = () => {
  return (
    <ModuleLayout>
      <Routes>
        <Route path="me" element={<MePage />} />
        <Route path="record" element={<RecordPage />} />
        <Route path="users" element={<RoleRoute roles={ADMIN_ROLE}><UsersPage /></RoleRoute>} />
        {/* A member's profile. `users/:id` is its older address. */}
        <Route path="members/:id" element={<UserPage />} />
        <Route path="users/:id" element={<UserPage />} />
        <Route path="apps" element={<RoleRoute roles={ADMIN_ROLE}><AppsPage /></RoleRoute>} />
        <Route path="devices/:id" element={<DevicePage />} />
        <Route path="devices" element={<RoleRoute roles={ADMIN_ROLE}><DevicesPage /></RoleRoute>} />
        <Route path="apps/:id" element={<AppPage />} />
        <Route path="releases/:id" element={<ReleasePage />} />
        <Route path="clients/:id" element={<ClientPage />} />
        <Route path="services" element={<RoleRoute roles={ADMIN_ROLE}><ServicesPage /></RoleRoute>} />
        <Route path="instances" element={<RoleRoute roles={ADMIN_ROLE}><InstancesPage /></RoleRoute>} />
        <Route path="layers" element={<LayersPage />} />
        <Route path="layers/:id" element={<LayerPage />} />
        {/* A profile acts in exactly one organization, and Team's start
            page IS it — there is no other organization to list or open. */}
        <Route path="organizations/*" element={<Navigate replace to="/lok" />} />
        <Route path="services/:id" element={<ServicePage />} />
        <Route path="mandates" element={<MandatesPage />} />
        <Route path="mandates/:id" element={<MandatePage />} />
        <Route path="redeemtokens" element={<RoleRoute roles={ADMIN_ROLE}><RedeemTokensPage /></RoleRoute>} />
        <Route path="redeemtokens/:id" element={<RedeemTokenPage />} />
        <Route
          path="serviceinstances/:id"
          element={<ServiceInstancePage />}
        />
        <Route path="overview" element={<HomePage />} />
        <Route index element={<TeamHomePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ModuleLayout>
  );
};

export default LokNextModule;
