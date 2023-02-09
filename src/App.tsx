import React, { CSSProperties } from "react";
import { HTML5Backend } from "react-dnd-html5-backend";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import { FaktsGuard } from "@jhnnsrs/fakts";
import { FaktsProvider } from "@jhnnsrs/fakts";
import { HealthzGuard } from "./healthz/guard";
import { HerreProvider } from "herre";
import { QueryParamProvider } from "use-query-params";
import { ReactRouter6Adapter } from "use-query-params/adapters/react-router-6";

import { Dashboard } from "./pages/Dashboard";
import { DashboardAssignation } from "./pages/dashboard/assignations/DashboardAssignation";
import { DashboardAssignations } from "./pages/dashboard/assignations/DashboardAssignations";
import DashBoardHome from "./pages/dashboard/DashboardHome";
import { DashboardNode } from "./pages/dashboard/nodes/DashboardNode";
import { DashboardNodes } from "./pages/dashboard/nodes/DashboardNodes";
import { DashboardProvision } from "./pages/dashboard/provisions/DashboardProvision";
import { DashboardProvisions } from "./pages/dashboard/provisions/DashboardProvisions";
import { DashboardReservation } from "./pages/dashboard/reservations/DashboardReservation";
import { DashboardReservations } from "./pages/dashboard/reservations/DashboardReservations";
import { DashboardTemplate } from "./pages/dashboard/templates/DashboardTemplate";
import { DashboardTemplates } from "./pages/dashboard/templates/DashboardTemplates";
import { Data } from "./pages/Data";
import { DataDataset } from "./pages/data/datasets/DataDataset";
import { DataDatasets } from "./pages/data/datasets/DataDatasets";
import { DataFile } from "./pages/data/files/DataFile";
import { DataFiles } from "./pages/data/files/DataFiles";
import { DataHome } from "./pages/data/Home";
import { DataRepresentation } from "./pages/data/representations/DataRepresentation";
import { DataRepresentations } from "./pages/data/representations/DataRepresentations";
import { DataSample } from "./pages/data/samples/DataSample";
import { DataSamples } from "./pages/data/samples/DataSamples";
import { DataTable } from "./pages/data/tables/DataTable";
import { DataTables } from "./pages/data/tables/DataTables";
import { FileScreen } from "./pages/detail/FileScreen";
import { RunScreen } from "./pages/detail/RunScreen";
import { SnapshotScreen } from "./pages/detail/SnapshotScreen";
import { TableScreen } from "./pages/detail/TableScreen";
import { NoRoute } from "./pages/fallbacks/NoRoute";
import FlowHome from "./pages/flows/FlowHome";
import { Home } from "./pages/Home";
import TeamHome from "./pages/lok/TeamHome";
import { Search } from "./pages/Search";
import { SearchHome } from "./pages/search/SearchHome";
import { Team } from "./pages/Team";
import { Port } from "./pages/Port";
import { PortHome } from "./pages/port/PortHome";
import "./popping.css";

import "allotment/dist/style.css";
import { MouseTransition, Preview } from "react-dnd-multi-backend";
import { Callback } from "./pages/Callback";
import "./index.css";
import { DashboardAgent } from "./pages/dashboard/agents/DashboardAgent";
import { DashboardAgents } from "./pages/dashboard/agents/DashboardAgents";
import { DashboardRepositories } from "./pages/dashboard/repositories/DashboardRepositories";
import { DashboardRepository } from "./pages/dashboard/repositories/DashboardRepository";
import { DataLabel } from "./pages/data/labels/DataLabel";
import { DataLabels } from "./pages/data/labels/DataLabels";
import { DataMetric } from "./pages/data/metrics/DataMetric";
import { DataMetrics } from "./pages/data/metrics/DataMetrics";
import { DataPlot } from "./pages/data/plots/DataPlot";
import { DataPlots } from "./pages/data/plots/DataPlots";
import { DataRoi } from "./pages/data/rois/DataRoi";
import { FlowDiagram } from "./pages/flows/workspace/FlowDiagram";
import { FlowDiagramFlow } from "./pages/flows/workspace/FlowDiagramFlow";
import { FlowDiagramHome } from "./pages/flows/workspace/FlowDiagramHome";
import { Fluss } from "./pages/Fluss";
import { ManTeam } from "./pages/lok/teams/ManTeam";
import { ManTeams } from "./pages/lok/teams/ManTeams";
import { ManUser } from "./pages/lok/users/ManUser";
import { ManUsers } from "./pages/lok/users/ManUsers";
import { PublicFakts } from "./pages/public/PublicFakts";
import { PublicHome } from "./pages/public/PublicHome";
import { Settings } from "./pages/Settings";
import { SettingsHome } from "./pages/settings/SettingsHome";
import { ProtectedApp } from "./ProtectedApp";
import { PublicApp } from "./PublicApp";
import { TauriProvider } from "./tauri/provider";
import { PublicHealthz } from "./pages/public/PublicHealthz";
import { HealthzProvider } from "./healthz/provider";
import { FaktsHerreProvider } from "./bridges/FaktsHerreProvider";
import { TauriHerreCallback } from "./bridges/TauriHerreCallback";
import { TauriFaktsFallback } from "./bridges/TauriFaktsFallback";
import { ConfirmerProvider } from "./components/confirmer/confirmer-provider";
import { AlerterProvider } from "./components/alerter/alerter-provider";
import { PortWhale } from "./pages/port/whales/PortWhale";
import { PortWhales } from "./pages/port/whales/PortWhales";
import { DialogProvider } from "./layout/dialog/DialogProvider";
import { LokApp } from "./pages/lok/apps/LokApp";
import { LokApps } from "./pages/lok/apps/LokApps";
import { PortContainer } from "./pages/port/containers/PortContainer";
import { PortContainers } from "./pages/port/containers/PortContainers";
import { PortGithubRepos } from "./pages/port/githubrepos/PortGithubRepos";
import { PortGithubRepo } from "./pages/port/githubrepos/PortGithubRepo";
import { PortRepoScans } from "./pages/port/reposcans/PortRepoScans";
import { PortRepoScan } from "./pages/port/reposcans/PortRepoScan";
import { DataStage } from "./pages/data/stages/DataStage";
import { DataStages } from "./pages/data/stages/DataStages";
import { DataPosition } from "./pages/data/positions/DataPosition";
import { DataPositions } from "./pages/data/positions/DataPositions";
import { DataInstrument } from "./pages/data/instruments/DataInstrument";
import { DataInstruments } from "./pages/data/instruments/DataInstruments";
import { DataObjective } from "./pages/data/objectives/DataObjective";
import { DataObjectives } from "./pages/data/objectives/DataObjectives";
import { DataContext } from "./pages/data/contexts/DataContext";
import { DataContexts } from "./pages/data/contexts/DataContexts";
import { DataModel } from "./pages/data/models/DataModel";
import { DataModels } from "./pages/data/models/DataModels";
import { DataLink } from "./pages/data/links/DataLink";
import { DataLinks } from "./pages/data/links/DataModels";
import { DataExperiment } from "./pages/data/experiments/DataExperiment";
import { DataExperiments } from "./pages/data/experiments/DataExperiments";
import { ExperimentalProvider } from "./providers/experimental/provider";

export const HTML5toTouch = {
  backends: [
    {
      id: "html5",
      backend: HTML5Backend,
      preview: true,
      transition: MouseTransition,
    },
  ],
};
interface Props {}

const Block = ({
  row,
  item,
  style,
}: {
  row: number;
  item: any;
  style: CSSProperties;
}): JSX.Element => {
  return (
    <div className="bg-primary-300 rounded-sm">{JSON.stringify(item)}</div>
  );
};

const ComponentPreview = ({ text }: { text: string }): JSX.Element => {
  return (
    <Preview
      generator={({ item, style }): JSX.Element => {
        return (
          <div
            className="bg-primary-300 rounded-full px-1  text-white text-xs"
            style={{ ...style, top: 0, left: "45px" }}
          ></div>
        );
      }}
    />
  );
};

export const MainApp: React.FC<Props> = (props) => {
  return (
    <Router>
      <ExperimentalProvider>
        <QueryParamProvider adapter={ReactRouter6Adapter}>
          <ConfirmerProvider>
            <AlerterProvider>
              <TauriProvider>
                <FaktsProvider>
                  <FaktsGuard
                    fallback={
                      window.__TAURI__ ? (
                        <TauriFaktsFallback />
                      ) : (
                        <PublicFakts />
                      )
                    }
                  >
                    <HealthzProvider>
                      <HealthzGuard fallback={<PublicHealthz />}>
                        <FaktsHerreProvider>
                          {window.__TAURI__ && <TauriHerreCallback />}
                          <Routes>
                            {/* Public */}
                            <Route path="/" element={<PublicApp />}>
                              <Route path="callback" element={<Callback />} />
                              <Route index element={<PublicHome />} />
                            </Route>
                            {/* Private */}

                            <Route path="/user" element={<ProtectedApp />}>
                              <Route index element={<Home />} />

                              {/* Mikro */}
                              <Route path="mikro" element={<Data />}>
                                <Route
                                  path="experiments/:experiment"
                                  element={<DataExperiment />}
                                />
                                <Route
                                  path="experiments"
                                  element={<DataExperiments />}
                                />
                                <Route
                                  path="datasets/:dataset"
                                  element={<DataDataset />}
                                />
                                <Route
                                  path="datasets"
                                  element={<DataDatasets />}
                                />
                                <Route
                                  path="contexts/:context"
                                  element={<DataContext />}
                                />
                                <Route
                                  path="contexts"
                                  element={<DataContexts />}
                                />

                                <Route
                                  path="models/:model"
                                  element={<DataModel />}
                                />
                                <Route path="models" element={<DataModels />} />

                                <Route
                                  path="links/:link"
                                  element={<DataLink />}
                                />
                                <Route path="links" element={<DataLinks />} />

                                <Route
                                  path="samples/:sample"
                                  element={<DataSample />}
                                />
                                <Route
                                  path="samples"
                                  element={<DataSamples />}
                                />
                                <Route
                                  path="representations/:representation"
                                  element={<DataRepresentation />}
                                />
                                <Route
                                  path="representations"
                                  element={<DataRepresentations />}
                                />
                                <Route
                                  path="stages/:stage"
                                  element={<DataStage />}
                                />
                                <Route path="stages" element={<DataStages />} />
                                <Route
                                  path="instruments/:instrument"
                                  element={<DataInstrument />}
                                />
                                <Route
                                  path="instruments"
                                  element={<DataInstruments />}
                                />
                                <Route
                                  path="objectives/:objective"
                                  element={<DataObjective />}
                                />
                                <Route
                                  path="objectives"
                                  element={<DataObjectives />}
                                />
                                <Route
                                  path="positions/:position"
                                  element={<DataPosition />}
                                />
                                <Route
                                  path="positions"
                                  element={<DataPositions />}
                                />
                                <Route
                                  path="tables/:table"
                                  element={<DataTable />}
                                />
                                <Route path="tables" element={<DataTables />} />
                                <Route
                                  path="files/:file"
                                  element={<DataFile />}
                                />
                                <Route
                                  path="labels/:label"
                                  element={<DataLabel />}
                                />
                                <Route path="labels" element={<DataLabels />} />
                                <Route
                                  path="metrics/:metric"
                                  element={<DataMetric />}
                                />
                                <Route
                                  path="metrics"
                                  element={<DataMetrics />}
                                />
                                <Route path="files" element={<DataFiles />} />
                                <Route path="rois/:roi" element={<DataRoi />} />
                                <Route path="plots" element={<DataPlots />} />
                                <Route
                                  path="plots/:plot"
                                  element={<DataPlot />}
                                />
                                <Route
                                  path="omerofiles/:file"
                                  element={<FileScreen />}
                                />

                                <Route index element={<DataHome />} />
                              </Route>

                              {/* lok */}
                              <Route path="lok" element={<Team />}>
                                <Route index element={<TeamHome />} />
                                <Route
                                  path="teams/:team"
                                  element={<ManTeam />}
                                />
                                <Route path="teams" element={<ManTeams />} />
                                <Route
                                  path="users/:user"
                                  element={<ManUser />}
                                />
                                <Route path="users" element={<ManUsers />} />
                                <Route
                                  path="publicfakts/:id"
                                  element={<ManUsers />}
                                />
                                <Route
                                  path="publicfakts"
                                  element={<ManUsers />}
                                />
                                <Route
                                  path="privatefakts/:id"
                                  element={<ManUsers />}
                                />
                                <Route
                                  path="privatefakts"
                                  element={<ManUsers />}
                                />
                                <Route path="apps/:id" element={<LokApp />} />
                                <Route path="apps" element={<LokApps />} />
                              </Route>

                              {/* Fluss */}

                              <Route path="fluss" element={<Fluss />}>
                                <Route index element={<FlowHome />} />
                                <Route
                                  path="workspaces/:diagram"
                                  element={<FlowDiagram />}
                                >
                                  <Route index element={<FlowDiagramHome />} />
                                </Route>
                                <Route
                                  path="flows/:flow"
                                  element={<FlowDiagramFlow />}
                                />
                                <Route
                                  path="runs/:runid"
                                  element={<RunScreen />}
                                />
                              </Route>

                              {/* Rekuest */}
                              <Route path="rekuest" element={<Dashboard />}>
                                <Route index element={<DashBoardHome />} />
                                <Route
                                  path="reservations/:reservation"
                                  element={<DashboardReservation />}
                                />

                                <Route
                                  path="agents"
                                  element={<DashboardAgents />}
                                />
                                <Route
                                  path="agents/:id"
                                  element={<DashboardAgent />}
                                />
                                <Route
                                  path="reservations"
                                  element={<DashboardReservations />}
                                />
                                <Route
                                  path="assignations"
                                  element={<DashboardAssignations />}
                                />
                                <Route
                                  path="assignations/:id"
                                  element={<DashboardAssignation />}
                                />
                                <Route
                                  path="provisions/:provision"
                                  element={<DashboardProvision />}
                                />
                                <Route
                                  path="repositories/:id"
                                  element={<DashboardRepository />}
                                />
                                <Route
                                  path="repositories"
                                  element={<DashboardRepositories />}
                                />
                                <Route
                                  path="provisions"
                                  element={<DashboardProvisions />}
                                />
                                <Route
                                  path="nodes/:id"
                                  element={<DashboardNode />}
                                />
                                <Route
                                  path="nodes"
                                  element={<DashboardNodes />}
                                />
                                <Route
                                  path="templates/:id"
                                  element={<DashboardTemplate />}
                                />
                                <Route
                                  path="templates"
                                  element={<DashboardTemplates />}
                                />
                              </Route>

                              {/* port */}
                              <Route path="port" element={<Port />}>
                                <Route index element={<PortHome />} />
                                <Route
                                  path="containers/:container"
                                  element={<PortContainer />}
                                />
                                <Route
                                  path="containers"
                                  element={<PortContainers />}
                                />
                                <Route
                                  path="whales/:whale"
                                  element={<PortWhale />}
                                />

                                <Route path="whales" element={<PortWhales />} />
                                <Route
                                  path="githubrepos"
                                  element={<PortGithubRepos />}
                                />
                                <Route
                                  path="githubrepos/:repo"
                                  element={<PortGithubRepo />}
                                />

                                <Route
                                  path="reposcans"
                                  element={<PortRepoScans />}
                                />
                                <Route
                                  path="reposcans/:scan"
                                  element={<PortRepoScan />}
                                />
                              </Route>

                              <Route
                                path="table/:table"
                                element={<TableScreen />}
                              />

                              <Route
                                path="snapshot/:id"
                                element={<SnapshotScreen />}
                              />
                              <Route path="search" element={<Search />}>
                                <Route index element={<SearchHome />} />
                              </Route>

                              {/* Settings */}
                              <Route path="settings" element={<Settings />}>
                                <Route index element={<SettingsHome />} />
                              </Route>

                              <Route element={<NoRoute />} />
                            </Route>
                          </Routes>
                        </FaktsHerreProvider>
                      </HealthzGuard>
                    </HealthzProvider>
                  </FaktsGuard>
                </FaktsProvider>
              </TauriProvider>
            </AlerterProvider>
          </ConfirmerProvider>
        </QueryParamProvider>
      </ExperimentalProvider>
    </Router>
  );
};

function App() {
  return <MainApp />;
}

export default App;
