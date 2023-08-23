import React from "react";
import { Route, Routes } from "react-router";
import { ModuleLayout } from "../layout/ModuleLayout";
import { RunScreen } from "../pages/detail/RunScreen";
import { FlussGuard } from "./guard";
import FlowHome from "./pages/FlowHome";
import { FlowTimeline } from "./pages/timelines/FlowTimeline";
import { FlowDiagram } from "./pages/workspace/FlowDiagram";
import { FlowDiagramFlow } from "./pages/workspace/FlowDiagramFlow";
import { FlowDiagramHome } from "./pages/workspace/FlowDiagramHome";
import SidePane from "./panes/FlowSidebar";
interface Props {}

export const FlussModule: React.FC<Props> = (props) => {
  return (
    <FlussGuard fallback={<>Loading</>}>
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
          <Route index element={<FlowHome />} />
          <Route path="workspaces/:diagram" element={<FlowDiagram />}>
            <Route index element={<FlowDiagramHome />} />
          </Route>
          <Route path="flows/:flow" element={<FlowDiagramFlow />} />
          <Route path="runs/:runid" element={<RunScreen />} />
          <Route path="timelines/:id" element={<FlowTimeline />} />
          <Route path="runs/:runid" element={<RunScreen />} />
        </Routes>
      </ModuleLayout>
    </FlussGuard>
  );
};

export default FlussModule;
