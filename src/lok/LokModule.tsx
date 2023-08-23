import React from "react";
import { Route, Routes } from "react-router";
import { ModuleLayout } from "../layout/ModuleLayout";

import { LokGuard } from "./LokGuard";
import TeamHome from "./pages/TeamHome";
import { LokApp } from "./pages/apps/LokApp";
import { LokApps } from "./pages/apps/LokApps";
import { LokClient } from "./pages/clients/LokClient";
import { LokClients } from "./pages/clients/LokClients";
import { LokRelease } from "./pages/releases/LokRelease";
import { LokReleases } from "./pages/releases/LokReleases";
import { ManTeam } from "./pages/teams/ManTeam";
import { ManTeams } from "./pages/teams/ManTeams";
import { ManUser } from "./pages/users/ManUser";
import { ManUsers } from "./pages/users/ManUsers";
import SidePane from "./panes/SidePane";
interface Props {}

export const MikroModule: React.FC<Props> = (props) => {
  return (
    <LokGuard fallback={<>Loading</>}>
      <ModuleLayout
        sidebars={[
          {
            key: "search",
            label: "Search",
            content: <SidePane />,
          },
        ]}
      >
        <Routes>
          <Route index element={<TeamHome />} />
          <Route path="teams/:team" element={<ManTeam />} />
          <Route path="teams" element={<ManTeams />} />
          <Route path="users/:user" element={<ManUser />} />
          <Route path="users" element={<ManUsers />} />
          <Route path="apps/:id" element={<LokApp />} />
          <Route path="apps" element={<LokApps />} />
          <Route path="clients/:id" element={<LokClient />} />
          <Route path="clients" element={<LokClients />} />
          <Route path="releases/:id" element={<LokRelease />} />
          <Route path="releases" element={<LokReleases />} />
        </Routes>
      </ModuleLayout>
    </LokGuard>
  );
};

export default MikroModule;
