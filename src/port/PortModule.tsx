import React from "react";
import { Route, Routes } from "react-router";
import { ModuleLayout } from "../layout/ModuleLayout";
import { PortGuard } from "./PortGuard";
import { PortHome } from "./pages/PortHome";
import { PortContainer } from "./pages/containers/PortContainer";
import { PortContainers } from "./pages/containers/PortContainers";
import { PortGithubRepo } from "./pages/githubrepos/PortGithubRepo";
import { PortGithubRepos } from "./pages/githubrepos/PortGithubRepos";
import { PortRepoScan } from "./pages/reposcans/PortRepoScan";
import { PortRepoScans } from "./pages/reposcans/PortRepoScans";
import { PortWhale } from "./pages/whales/PortWhale";
import { PortWhales } from "./pages/whales/PortWhales";
import SidePane from "./panes/PortSidebar";
interface Props {}

export const PortModule: React.FC<Props> = (props) => {
  return (
    <PortGuard fallback={<>Loading</>}>
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
          <Route index element={<PortHome />} />
          <Route path="containers/:container" element={<PortContainer />} />
          <Route path="containers" element={<PortContainers />} />
          <Route path="whales/:whale" element={<PortWhale />} />

          <Route path="whales" element={<PortWhales />} />
          <Route path="githubrepos" element={<PortGithubRepos />} />
          <Route path="githubrepos/:repo" element={<PortGithubRepo />} />

          <Route path="reposcans" element={<PortRepoScans />} />
          <Route path="reposcans/:scan" element={<PortRepoScan />} />
        </Routes>
      </ModuleLayout>
    </PortGuard>
  );
};

export default PortModule;
