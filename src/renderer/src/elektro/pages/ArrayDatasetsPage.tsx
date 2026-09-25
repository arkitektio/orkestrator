import { Explainer } from "@/core/layout/Explainer";
import { ElektroArrayDataset } from "@/core/linkers";
import React from "react";
import ArrayDatasetList from "../components/lists/ArrayDatasetList";

const ArrayDatasetsPage: React.FC = () => {
  return (
    <ElektroArrayDataset.ListPage title="Datasets">
      <div className="p-3">
        <Explainer
          title="Datasets"
          description="Array datasets are recorded or simulated signals — traces over time, per channel. Open one to see it on a timeline, in any experiment that draws it."
        />
        <ArrayDatasetList defaultLimit={30} />
      </div>
    </ElektroArrayDataset.ListPage>
  );
};

export default ArrayDatasetsPage;
