import { QuietPage } from "@/app/components/fallbacks/QuietPage";
import { ShellSignInNotice } from "@/app/components/shell/ShellSignInNotice";
import { ConnectingFallback } from "@/app/components/fallbacks/Connecting";
import { Guard } from "@/app/Arkitekt";
import { ModuleLayout } from "@/components/layout/ModuleLayout";
import React from "react";
import { Route, Routes } from "react-router-dom";
import AppPage from "./pages/AppPage";
import AppsPage from "./pages/AppsPage";
import ClientPage from "./pages/ClientPage";
import DevicePage from "./pages/DevicePage";
import DevicesPage from "./pages/DevicesPage";
import HomePage from "./pages/HomePage";
import InstancesPage from "./pages/InstancesPage";
import LayerPage from "./pages/LayerPage";
import LayersPage from "./pages/LayersPage";
import MePage from "./pages/MePage";
import OrganizationPage from "./pages/OrganizationPage";
import OrganizationsPage from "./pages/OrganizationsPage";
import RecordPage from "./pages/RecordPage";
import RedeemTokenPage from "./pages/RedeemTokenPage";
import RedeemTokensPage from "./pages/RedeemTokensPage";
import ReleasePage from "./pages/ReleasePage";
import ServiceInstancePage from "./pages/ServiceInstancePage";
import ServicePage from "./pages/ServicePage";
import ServicesPage from "./pages/ServicesPage";
import UserPage from "./pages/UserPage";
import UsersPage from "./pages/UsersPage";
import StandardPane from "./panes/StandardPane";
import { NotFound } from "@/app/components/fallbacks/NotFound";
interface Props { }

export const LokNextModule: React.FC<Props> = () => {
  return (
    // `Guard.Lok` IS `Arkitekt.Guard` (the session), not a service guard: the
    // shell owns both of these surfaces now, so this route stays quiet while a
    // launch is still proving its token and defers to the shell's notice when
    // one has failed.
    <Guard.Lok
      notConnectedFallback={<ShellSignInNotice />}
      bootingFallback={<QuietPage />}
      connectingFallback={<ConnectingFallback />}
    >
      <ModuleLayout pane={<StandardPane />}>
        <Routes>
          <Route path="me" element={<MePage />} />
          <Route path="record" element={<RecordPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="users/:id" element={<UserPage />} />
          <Route path="apps" element={<AppsPage />} />
          <Route path="devices/:id" element={<DevicePage />} />
          <Route path="devices" element={<DevicesPage />} />
          <Route path="apps/:id" element={<AppPage />} />
          <Route path="releases/:id" element={<ReleasePage />} />
          <Route path="clients/:id" element={<ClientPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="instances" element={<InstancesPage />} />
          <Route path="layers" element={<LayersPage />} />
          <Route path="layers/:id" element={<LayerPage />} />
          <Route path="organizations/:id" element={<OrganizationPage />} />
          <Route path="organizations" element={<OrganizationsPage />} />
          <Route path="services/:id" element={<ServicePage />} />
          <Route path="redeemtokens" element={<RedeemTokensPage />} />
          <Route path="redeemtokens/:id" element={<RedeemTokenPage />} />
          <Route
            path="serviceinstances/:id"
            element={<ServiceInstancePage />}
          />
          <Route index element={<HomePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ModuleLayout>
    </Guard.Lok>
  );
};

export default LokNextModule;
