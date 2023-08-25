import React from "react";
import { Route, Routes } from "react-router";
import { Live } from "../dashboard/Dashboard";
import { ModuleLayout } from "../layout/ModuleLayout";
import { MikroGuard } from "./MikroGuard";
import { DataChannel } from "./pages/channels/DataChannel";
import { DataDataset } from "./pages/datasets/DataDataset";
import { DataDatasets } from "./pages/datasets/DataDatasets";
import { DataEra } from "./pages/eras/DataEra";
import { DataEras } from "./pages/eras/DataEras";
import { DataFile } from "./pages/files/DataFile";
import { DataFiles } from "./pages/files/DataFiles";
import DataGraph from "./pages/graphs/DataGraph";
import DataGraphs from "./pages/graphs/DataGraphs";
import { DataInstrument } from "./pages/instruments/DataInstrument";
import { DataInstruments } from "./pages/instruments/DataInstruments";
import { DataLabel } from "./pages/labels/DataLabel";
import { DataLabels } from "./pages/labels/DataLabels";
import { DataLive } from "./pages/live/DataLive";
import { DataLives } from "./pages/live/DataLives";
import { DataMetric } from "./pages/metrics/DataMetric";
import { DataMetrics } from "./pages/metrics/DataMetrics";
import { DataObjective } from "./pages/objectives/DataObjective";
import { DataObjectives } from "./pages/objectives/DataObjectives";
import { DataPlot } from "./pages/plots/DataPlot";
import { DataPlots } from "./pages/plots/DataPlots";
import { DataPosition } from "./pages/positions/DataPosition";
import { DataPositions } from "./pages/positions/DataPositions";
import { DataProvenance } from "./pages/provenance/DataProvenance";
import { DataRepresentation } from "./pages/representations/DataRepresentation";
import { DataRepresentations } from "./pages/representations/DataRepresentations";
import { DataRoi } from "./pages/rois/DataRoi";
import { DataSample } from "./pages/samples/DataSample";
import { DataSamples } from "./pages/samples/DataSamples";
import { DataStage } from "./pages/stages/DataStage";
import { DataStages } from "./pages/stages/DataStages";
import { DataTable } from "./pages/tables/DataTable";
import { DataTables } from "./pages/tables/DataTables";
import DataThumbnail from "./pages/thumbnails/DataThumbnail";
import DataThumbnails from "./pages/thumbnails/DataThumbnails";
import { DataTimepoint } from "./pages/timepoints/DataTimepoint";
import { DataTimepoints } from "./pages/timepoints/DataTimepoints";
import DataVideo from "./pages/videos/DataVideo";
import DataVideos from "./pages/videos/DataVideos";
import DataSidePanel from "./sidepanels/DataSidePanel";
export const DataHome = React.lazy(() => import("./pages/Home"));
export const DataExperiments = React.lazy(
  () => import("./pages/experiments/DataExperiments")
);
export const DataExperiment = React.lazy(
  () => import("./pages/experiments/DataExperiment")
);
export const DataModels = React.lazy(() => import("./pages/models/DataModels"));
export const DataModel = React.lazy(() => import("./pages/models/DataModel"));
export const DataContexts = React.lazy(
  () => import("./pages/contexts/DataContexts")
);
export const DataContext = React.lazy(
  () => import("./pages/contexts/DataContext")
);

export const DataLink = React.lazy(() => import("./pages/links/DataLink"));
export const DataLinks = React.lazy(() => import("./pages/links/DataLinks"));

interface Props {}

export const MikroModule: React.FC<Props> = (props) => {
  return (
    <MikroGuard fallback={<>Loading</>}>
      <ModuleLayout
        sidebars={[
          {
            key: "search",
            label: "Search",
            content: <DataSidePanel />,
          },
        ]}
      >
        <Routes>
          <Route index element={<DataHome />} />
          <Route path="experiments/:experiment" element={<DataExperiment />} />
          <Route path="experiments" element={<DataExperiments />} />
          <Route path="live" element={<Live id={"47"} />} />
          <Route path="datasets/:dataset" element={<DataDataset />} />
          <Route path="datasets" element={<DataDatasets />} />
          <Route path="contexts/:context" element={<DataContext />} />
          <Route path="provenances/:id" element={<DataProvenance />} />
          <Route path="contexts" element={<DataContexts />} />

          <Route path="models/:model" element={<DataModel />} />
          <Route path="models" element={<DataModels />} />

          <Route path="graphs/:graph" element={<DataGraph />} />
          <Route path="graphs" element={<DataGraphs />} />

          <Route path="graphs/:graph" element={<DataGraph />} />
          <Route path="graphs" element={<DataGraphs />} />

          <Route path="thumbnails/:thumbnail" element={<DataThumbnail />} />
          <Route path="thumbnails" element={<DataThumbnails />} />

          <Route path="videos/:video" element={<DataVideo />} />
          <Route path="videos" element={<DataVideos />} />

          <Route path="links/:link" element={<DataLink />} />
          <Route path="links" element={<DataLinks />} />

          <Route path="samples/:sample" element={<DataSample />} />
          <Route path="samples" element={<DataSamples />} />
          <Route
            path="representations/:representation"
            element={<DataRepresentation />}
          />
          <Route path="representations" element={<DataRepresentations />} />
          <Route path="stages/:stage" element={<DataStage />} />
          <Route path="stages" element={<DataStages />} />
          <Route path="eras/:id" element={<DataEra />} />
          <Route path="eras" element={<DataEras />} />
          <Route path="timepoints/:id" element={<DataTimepoint />} />
          <Route path="timepoints" element={<DataTimepoints />} />
          <Route path="instruments/:instrument" element={<DataInstrument />} />
          <Route path="instruments" element={<DataInstruments />} />
          <Route path="objectives/:objective" element={<DataObjective />} />
          <Route path="channels/:channel" element={<DataChannel />} />
          <Route path="objectives" element={<DataObjectives />} />
          <Route path="positions/:position" element={<DataPosition />} />
          <Route path="positions" element={<DataPositions />} />
          <Route path="lives/:id" element={<DataLive />} />
          <Route path="lives" element={<DataLives />} />
          <Route path="tables/:table" element={<DataTable />} />
          <Route path="tables" element={<DataTables />} />
          <Route path="files/:file" element={<DataFile />} />
          <Route path="labels/:label" element={<DataLabel />} />
          <Route path="labels" element={<DataLabels />} />
          <Route path="metrics/:metric" element={<DataMetric />} />
          <Route path="metrics" element={<DataMetrics />} />
          <Route path="files" element={<DataFiles />} />
          <Route path="rois/:roi" element={<DataRoi />} />
          <Route path="plots" element={<DataPlots />} />
          <Route path="plots/:plot" element={<DataPlot />} />

          <Route index element={<DataHome />} />
        </Routes>
      </ModuleLayout>
    </MikroGuard>
  );
};

export default MikroModule;
