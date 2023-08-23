import React from "react";
import { Route, Routes } from "react-router";
import { ModuleLayout } from "../layout/ModuleLayout";
import { RekuestGuard } from "./RekuestGuard";
import DashBoardHome from "./pages/DashboardHome";
import { DashboardAgent } from "./pages/agents/DashboardAgent";
import { DashboardAgents } from "./pages/agents/DashboardAgents";
import { DashboardAssignation } from "./pages/assignations/DashboardAssignation";
import { DashboardAssignations } from "./pages/assignations/DashboardAssignations";
import { DashboardCollection } from "./pages/collections/DashboardCollection";
import { DashboardCollections } from "./pages/collections/DashboardCollections";
import { DashboardHistory } from "./pages/history/DashboardHistory";
import { DashboardNode } from "./pages/nodes/DashboardNode";
import { DashboardNodes } from "./pages/nodes/DashboardNodes";
import { DashboardProvision } from "./pages/provisions/DashboardProvision";
import { DashboardProvisions } from "./pages/provisions/DashboardProvisions";
import { DashboardRepositories } from "./pages/repositories/DashboardRepositories";
import { DashboardRepository } from "./pages/repositories/DashboardRepository";
import { DashboardReservation } from "./pages/reservations/DashboardReservation";
import { DashboardReservations } from "./pages/reservations/DashboardReservations";
import { DashboardTemplate } from "./pages/templates/DashboardTemplate";
import { DashboardTemplates } from "./pages/templates/DashboardTemplates";
import SidePane from "./panes/DashboardSidebar";
interface Props {}

export const RekuestModule: React.FC<Props> = (props) => {
  return (
    <RekuestGuard fallback={<>Loading</>}>
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
          <Route
            path="reservations/:reservation"
            element={<DashboardReservation />}
          />

          <Route path="agents" element={<DashboardAgents />} />
          <Route path="history" element={<DashboardHistory />} />
          <Route path="agents/:id" element={<DashboardAgent />} />
          <Route path="reservations" element={<DashboardReservations />} />
          <Route path="assignations" element={<DashboardAssignations />} />
          <Route path="assignations/:id" element={<DashboardAssignation />} />
          <Route
            path="provisions/:provision"
            element={<DashboardProvision />}
          />
          <Route path="repositories/:id" element={<DashboardRepository />} />
          <Route path="repositories" element={<DashboardRepositories />} />
          <Route path="collections/:id" element={<DashboardCollection />} />
          <Route path="collections" element={<DashboardCollections />} />
          <Route path="provisions" element={<DashboardProvisions />} />
          <Route path="nodes/:id" element={<DashboardNode />} />
          <Route path="nodes" element={<DashboardNodes />} />
          <Route path="templates/:id" element={<DashboardTemplate />} />
          <Route path="templates" element={<DashboardTemplates />} />

          <Route index element={<DashBoardHome />} />
        </Routes>
      </ModuleLayout>
    </RekuestGuard>
  );
};

export default RekuestModule;
