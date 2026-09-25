import { ServiceUnavailable } from "@/core/app/components/fallbacks/ServiceUnavailable";
import { ModuleLayout } from "@/core/components/layout/ModuleLayout";
import { Guard } from "@/core/app/Arkitekt";
import React from "react";
import { Route, Routes } from "react-router-dom";
import Action from "./pages/ActionPage";
import Actions from "./pages/ActionsPage";
import AgentPage from "./pages/AgentPage";
import TaskPage from "./pages/TaskPage";
import Blok from "./pages/Blok";
import Bloks from "./pages/Bloks";
import Dashboard from "./pages/Dashboard";
import Dashboards from "./pages/Dashboards";
import Dependency from "./pages/Dependency";
import AgentsPage from "./pages/AgentsPage";
import Home from "./pages/Home";
import Implementation from "./pages/ImplementationPage";
import MemoryShelve from "./pages/MemoryShelve";
import MaterializedBlokPage from "./pages/MaterializedBlok";
import MaterializedBloks from "./pages/MaterializedBloks";
import Shortcut from "./pages/Shortcut";
import Shortcuts from "./pages/Shortcuts";
import Toolbox from "./pages/Toolbox";
import Toolboxes from "./pages/Toolboxes";
import Standardpane from "./panes/StandardPane";
import StructurePackages from "./pages/StructurePackages";
import StructurePackage from "./pages/StructurePackage";
import StructurePage from "./pages/StructurePage";
import InterfacePage from "./pages/InterfacePage";
import InterfacesPage from "./pages/InterfacesPage";
import StructuresPage from "./pages/StructuresPage";
import TaskLogPage from "./pages/task/TaskLogPage";
import TaskSpacePage from "./pages/task/TaskSpacePage";
import TasksPage from "./pages/TasksPage";
import OrgTasksPage from "./pages/OrgTasksPage";
import ImplementationsPage from "./pages/ImplementationsPage";
import TaskTimelinePage from "./pages/task/TaskTimelinePage";
import { ResolutionPage } from "./pages/ResolutionPage";
import AgentSpacePage from "./pages/agent/AgentSpacePage";
import AgentStatesPage from "./pages/agent/AgentStatesPage";
import AgentTasksPage from "./pages/agent/AgentTasksPage";
import AgentBloksPage from "./pages/agent/AgentBloksPage";
import StatePage from "./pages/StatePage";
import SpaceEditPage from "./pages/SpaceEditPage";
import SpacePage from "./pages/SpacePage";
import SpacesPage from "./pages/SpacesPage";
import { NotFound } from "@/core/app/components/fallbacks/NotFound";

/**
 *
 * The Rekuest Module is the entrypoint to all specfic rekuest functionality.
 * It provides the routes for the rekuest module.
 */
const Module: React.FC = () => {
  return (
      <ModuleLayout pane={<Guard.Rekuest fallback={<ServiceUnavailable serviceKey="rekuest" />} key={"rekuest"}><Standardpane /></Guard.Rekuest>}>

    <Guard.Rekuest fallback={<ServiceUnavailable serviceKey="rekuest" />} key={"rekuest"}>
        <Routes>
          <Route index element={<Home />} />
          <Route path="home" element={<Home />} />
          <Route path="actions/:id" element={<Action />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="shortcuts/:id" element={<Shortcut />} />
          <Route path="shortcuts" element={<Shortcuts />} />
          <Route path="toolboxes" element={<Toolboxes />} />
          <Route path="toolboxes/:id" element={<Toolbox />} />
          <Route path="actions" element={<Actions />} />
          <Route path="dashboards" element={<Dashboards />} />
          <Route path="dashboards/:id" element={<Dashboard />} />
          <Route path="structurepackages" element={<StructurePackages />} />
          <Route path="structurepackages/:id" element={<StructurePackage />} />
          <Route path="resolutions/:id" element={<ResolutionPage />} />
          <Route path="structures/:id" element={<StructurePage />} />
          <Route path="structures" element={<StructuresPage />} />
          <Route path="interfaces/:id" element={<InterfacePage />} />
          <Route path="interfaces" element={<InterfacesPage />} />
          <Route path="memoryshelves/:id" element={<MemoryShelve />} />
          <Route path="bloks/:id" element={<Blok />} />
          <Route path="bloks" element={<Bloks />} />
          <Route path="materialized_bloks" element={<MaterializedBloks />} />
          <Route path="materialized_bloks/:id" element={<MaterializedBlokPage />} />
          <Route path="dependencies/:id" element={<Dependency />} />
          <Route path="implementations" element={<ImplementationsPage />} />
          <Route path="implementations/:id" element={<Implementation />} />
          <Route path="agents/:id" element={<AgentPage />} />
          <Route path="agents/:id/space" element={<AgentSpacePage />} />
          <Route path="agents/:id/states" element={<AgentStatesPage />} />
          <Route path="agents/:id/tasks" element={<AgentTasksPage />} />
          <Route path="agents/:id/bloks" element={<AgentBloksPage />} />
          <Route path="spaces" element={<SpacesPage />} />
          <Route path="spaces/:id/edit" element={<SpaceEditPage />} />
          <Route path="spaces/:id" element={<SpacePage />} />

          <Route path="states/:id" element={<StatePage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="org-tasks" element={<OrgTasksPage />} />
          <Route path="tasks/:id" element={<TaskPage />} />
          <Route path="tasks/:id/log" element={<TaskLogPage />} />
          <Route path="tasks/:id/space" element={<TaskSpacePage />} />
          <Route path="tasks/:id/timeline" element={<TaskTimelinePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>

      </Guard.Rekuest>
      </ModuleLayout>
  );
};

export default Module;
