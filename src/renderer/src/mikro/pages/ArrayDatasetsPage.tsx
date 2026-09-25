import { Explainer } from "@/components/explainer/Explainer";
import { MikroArrayDataset } from "@/linkers";
import React from "react";
import { useArrayDatasetFilterBar } from "../components/filter/ArrayDatasetFilterBar";
import ArrayDatasetList from "../components/lists/ArrayDatasetList";

export type IArrayDatasetsScreenProps = {};

const Page: React.FC<IArrayDatasetsScreenProps> = () => {
  const { filters, ordering, actions } = useArrayDatasetFilterBar();

  return (
    <MikroArrayDataset.ListPage title="Spatial Datasets" pageActions={actions}>
      <div className="p-3 flex flex-col gap-3">
        <Explainer
          title="Spatial Datasets"
          description="N-dimensional arrays with named dimensions. trinsic coordinate system, their physical units on the calibrated spaces they also live in, and their pyramid levels are data arrays."
        />
        <ArrayDatasetList filters={filters} ordering={ordering} />
      </div>
    </MikroArrayDataset.ListPage>
  );
};

export default Page;
