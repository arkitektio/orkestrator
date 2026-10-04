import { KraphScatterPlot } from "@/core/linkers";
import ScatterPlotList from "../components/lists/ScatterPlotList";

const Page = () => {
  return (
    <KraphScatterPlot.ListPage title="Scatter plots">
      <div className="p-3">
        <ScatterPlotList pagination={{ limit: 30 }} />
      </div>
    </KraphScatterPlot.ListPage>
  );
};

export default Page;
