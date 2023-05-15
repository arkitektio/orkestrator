import { FaktsGuard, FaktsProvider } from "@jhnnsrs/fakts";
import React, { CSSProperties } from "react";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import { QueryParamProvider } from "use-query-params";
import { ReactRouter6Adapter } from "use-query-params/adapters/react-router-6";
import { HealthzGuard } from "./healthz/guard";

import "allotment/dist/style.css";
import { MouseTransition, Preview } from "react-dnd-multi-backend";
import "./index.css";
import { Callback } from "./pages/Callback";
import { Home } from "./pages/Home";
import { Port } from "./pages/Port";
import { Search } from "./pages/Search";
import { Team } from "./pages/Team";
import DashBoardHome from "./pages/dashboard/DashboardHome";
import { DashboardAssignation } from "./pages/dashboard/assignations/DashboardAssignation";
import { DashboardAssignations } from "./pages/dashboard/assignations/DashboardAssignations";
import { DashboardNode } from "./pages/dashboard/nodes/DashboardNode";
import { DashboardNodes } from "./pages/dashboard/nodes/DashboardNodes";
import { DashboardProvision } from "./pages/dashboard/provisions/DashboardProvision";
import { DashboardProvisions } from "./pages/dashboard/provisions/DashboardProvisions";
import { DashboardReservation } from "./pages/dashboard/reservations/DashboardReservation";
import { DashboardReservations } from "./pages/dashboard/reservations/DashboardReservations";
import { DashboardTemplate } from "./pages/dashboard/templates/DashboardTemplate";
import { DashboardTemplates } from "./pages/dashboard/templates/DashboardTemplates";
import { DataChannel } from "./pages/data/channels/DataChannel";
import { DataDataset } from "./pages/data/datasets/DataDataset";
import { DataDatasets } from "./pages/data/datasets/DataDatasets";
import { DataFile } from "./pages/data/files/DataFile";
import { DataFiles } from "./pages/data/files/DataFiles";
import { DataProvenance } from "./pages/data/provenance/DataProvenance";
import { DataRepresentation } from "./pages/data/representations/DataRepresentation";
import { DataRepresentations } from "./pages/data/representations/DataRepresentations";
import { DataSample } from "./pages/data/samples/DataSample";
import { DataSamples } from "./pages/data/samples/DataSamples";
import { DataTable } from "./pages/data/tables/DataTable";
import { DataTables } from "./pages/data/tables/DataTables";
import { RunScreen } from "./pages/detail/RunScreen";
import { SnapshotScreen } from "./pages/detail/SnapshotScreen";
import { TableScreen } from "./pages/detail/TableScreen";
import { NoRoute } from "./pages/fallbacks/NoRoute";
import FlowHome from "./pages/flows/FlowHome";
import TeamHome from "./pages/lok/TeamHome";
import { PortHome } from "./pages/port/PortHome";
import { SearchHome } from "./pages/search/SearchHome";
import "./popping.css";
import { ExperimentalProvider } from "./providers/experimental/provider";

import { ProtectedApp } from "./ProtectedApp";
import { PublicApp } from "./PublicApp";
import { AdaptiveHerreProvider } from "./bridges/AdaptiveHerreProvider";
import { TauriFaktsFallback } from "./bridges/TauriFaktsFallback";
import { TauriHerreCallback } from "./bridges/TauriHerreCallback";
import { AlerterProvider } from "./components/alerter/alerter-provider";
import { ConfirmerProvider } from "./components/confirmer/confirmer-provider";
import { HealthzProvider } from "./healthz/provider";
import { Fluss } from "./pages/Fluss";
import { Local } from "./pages/Local";
import { Settings } from "./pages/Settings";
import { DashboardAgent } from "./pages/dashboard/agents/DashboardAgent";
import { DashboardAgents } from "./pages/dashboard/agents/DashboardAgents";
import { DashboardHistory } from "./pages/dashboard/history/DashboardHistory";
import { DashboardRepositories } from "./pages/dashboard/repositories/DashboardRepositories";
import { DashboardRepository } from "./pages/dashboard/repositories/DashboardRepository";
import { DataEra } from "./pages/data/eras/DataEra";
import { DataEras } from "./pages/data/eras/DataEras";
import { DataInstrument } from "./pages/data/instruments/DataInstrument";
import { DataInstruments } from "./pages/data/instruments/DataInstruments";
import { DataLabel } from "./pages/data/labels/DataLabel";
import { DataLabels } from "./pages/data/labels/DataLabels";
import { DataLive } from "./pages/data/live/DataLive";
import { DataLives } from "./pages/data/live/DataLives";
import { DataMeta } from "./pages/data/metas/DataMeta";
import { DataMetas } from "./pages/data/metas/DataMetas";
import { DataMetric } from "./pages/data/metrics/DataMetric";
import { DataMetrics } from "./pages/data/metrics/DataMetrics";
import { DataObjective } from "./pages/data/objectives/DataObjective";
import { DataObjectives } from "./pages/data/objectives/DataObjectives";
import { DataPlot } from "./pages/data/plots/DataPlot";
import { DataPlots } from "./pages/data/plots/DataPlots";
import { DataPosition } from "./pages/data/positions/DataPosition";
import { DataPositions } from "./pages/data/positions/DataPositions";
import { DataRoi } from "./pages/data/rois/DataRoi";
import { DataStage } from "./pages/data/stages/DataStage";
import { DataStages } from "./pages/data/stages/DataStages";
import { DataTimepoint } from "./pages/data/timepoints/DataTimepoint";
import { DataTimepoints } from "./pages/data/timepoints/DataTimepoints";
import { FlowTimeline } from "./pages/flows/timelines/FlowTimeline";
import { FlowDiagram } from "./pages/flows/workspace/FlowDiagram";
import { FlowDiagramFlow } from "./pages/flows/workspace/FlowDiagramFlow";
import { FlowDiagramHome } from "./pages/flows/workspace/FlowDiagramHome";
import { Test } from "./pages/local/Test";
import { LokApp } from "./pages/lok/apps/LokApp";
import { LokApps } from "./pages/lok/apps/LokApps";
import { LokClient } from "./pages/lok/clients/LokClient";
import { LokClients } from "./pages/lok/clients/LokClients";
import { LokRelease } from "./pages/lok/releases/LokRelease";
import { LokReleases } from "./pages/lok/releases/LokReleases";
import { ManTeam } from "./pages/lok/teams/ManTeam";
import { ManTeams } from "./pages/lok/teams/ManTeams";
import { ManUser } from "./pages/lok/users/ManUser";
import { ManUsers } from "./pages/lok/users/ManUsers";
import { PortContainer } from "./pages/port/containers/PortContainer";
import { PortContainers } from "./pages/port/containers/PortContainers";
import { PortGithubRepo } from "./pages/port/githubrepos/PortGithubRepo";
import { PortGithubRepos } from "./pages/port/githubrepos/PortGithubRepos";
import { PortRepoScan } from "./pages/port/reposcans/PortRepoScan";
import { PortRepoScans } from "./pages/port/reposcans/PortRepoScans";
import { PortWhale } from "./pages/port/whales/PortWhale";
import { PortWhales } from "./pages/port/whales/PortWhales";
import { PublicFakts } from "./pages/public/PublicFakts";
import { PublicHealthz } from "./pages/public/PublicHealthz";
import { PublicLogin } from "./pages/public/PublicLogin";
import { SettingsHome } from "./pages/settings/SettingsHome";
import { TauriProvider } from "./tauri/provider";

export const Dashboard = React.lazy(() => import("./pages/Dashboard"));
export const Data = React.lazy(() => import("./pages/Data"));
export const DataHome = React.lazy(() => import("./pages/data/Home"));
export const DataExperiments = React.lazy(
  () => import("./pages/data/experiments/DataExperiments")
);
export const DataExperiment = React.lazy(
  () => import("./pages/data/experiments/DataExperiment")
);
export const DataModels = React.lazy(
  () => import("./pages/data/models/DataModels")
);
export const DataModel = React.lazy(
  () => import("./pages/data/models/DataModel")
);
export const DataContexts = React.lazy(
  () => import("./pages/data/contexts/DataContexts")
);
export const DataContext = React.lazy(
  () => import("./pages/data/contexts/DataContext")
);

export const DataLink = React.lazy(() => import("./pages/data/links/DataLink"));
export const DataLinks = React.lazy(
  () => import("./pages/data/links/DataLinks")
);

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
                        <AdaptiveHerreProvider>
                          {window.__TAURI__ && <TauriHerreCallback />}
                          <React.Suspense fallback={<>Loading</>}>
                            <Routes>
                              {/* Public */}
                              <Route path="/" element={<PublicApp />}>
                                <Route path="callback" element={<Callback />} />
                                <Route index element={<PublicLogin />} />
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
                                    path="provenances/:id"
                                    element={<DataProvenance />}
                                  />
                                  <Route
                                    path="contexts"
                                    element={<DataContexts />}
                                  />

                                  <Route
                                    path="models/:model"
                                    element={<DataModel />}
                                  />
                                  <Route
                                    path="models"
                                    element={<DataModels />}
                                  />

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
                                  <Route
                                    path="stages"
                                    element={<DataStages />}
                                  />
                                  <Route
                                    path="eras/:id"
                                    element={<DataEra />}
                                  />
                                  <Route path="eras" element={<DataEras />} />
                                  <Route
                                    path="timepoints/:id"
                                    element={<DataTimepoint />}
                                  />
                                  <Route
                                    path="timepoints"
                                    element={<DataTimepoints />}
                                  />
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
                                    path="channels/:channel"
                                    element={<DataChannel />}
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
                                    path="metas/:id"
                                    element={<DataMeta />}
                                  />
                                  <Route path="metas" element={<DataMetas />} />
                                  <Route
                                    path="lives/:id"
                                    element={<DataLive />}
                                  />
                                  <Route path="lives" element={<DataLives />} />
                                  <Route
                                    path="tables/:table"
                                    element={<DataTable />}
                                  />
                                  <Route
                                    path="tables"
                                    element={<DataTables />}
                                  />
                                  <Route
                                    path="files/:file"
                                    element={<DataFile />}
                                  />
                                  <Route
                                    path="labels/:label"
                                    element={<DataLabel />}
                                  />
                                  <Route
                                    path="labels"
                                    element={<DataLabels />}
                                  />
                                  <Route
                                    path="metrics/:metric"
                                    element={<DataMetric />}
                                  />
                                  <Route
                                    path="metrics"
                                    element={<DataMetrics />}
                                  />
                                  <Route path="files" element={<DataFiles />} />
                                  <Route
                                    path="rois/:roi"
                                    element={<DataRoi />}
                                  />
                                  <Route path="plots" element={<DataPlots />} />
                                  <Route
                                    path="plots/:plot"
                                    element={<DataPlot />}
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
                                  <Route path="apps/:id" element={<LokApp />} />
                                  <Route path="apps" element={<LokApps />} />
                                  <Route
                                    path="clients/:id"
                                    element={<LokClient />}
                                  />
                                  <Route
                                    path="clients"
                                    element={<LokClients />}
                                  />
                                  <Route
                                    path="releases/:id"
                                    element={<LokRelease />}
                                  />
                                  <Route
                                    path="releases"
                                    element={<LokReleases />}
                                  />
                                </Route>

                                {/* Fluss */}

                                <Route path="fluss" element={<Fluss />}>
                                  <Route index element={<FlowHome />} />
                                  <Route
                                    path="workspaces/:diagram"
                                    element={<FlowDiagram />}
                                  >
                                    <Route
                                      index
                                      element={<FlowDiagramHome />}
                                    />
                                  </Route>
                                  <Route
                                    path="flows/:flow"
                                    element={<FlowDiagramFlow />}
                                  />
                                  <Route
                                    path="runs/:runid"
                                    element={<RunScreen />}
                                  />
                                  <Route
                                    path="timelines/:id"
                                    element={<FlowTimeline />}
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
                                    path="history"
                                    element={<DashboardHistory />}
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

                                  <Route
                                    path="whales"
                                    element={<PortWhales />}
                                  />
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

                                {/* Tauri */}
                                <Route path="local" element={<Local />}>
                                  <Route index element={<Test />} />
                                </Route>

                                <Route path="*" element={<NoRoute />} />
                              </Route>
                            </Routes>
                          </React.Suspense>
                        </AdaptiveHerreProvider>
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
