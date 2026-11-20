import { MikroSparseDataset } from "@/core/linkers";
import React from "react";
import { useSparseDatasetFilterBar } from "../components/filter/SparseDatasetFilterBar";
import SparseDatasetList from "../components/lists/SparseDatasetList";
import { MIKRO_HELP } from "../help";

export type ISparseDatasetsScreenProps = {};

const Page: React.FC<ISparseDatasetsScreenProps> = () => {
  const { filters, ordering, actions } = useSparseDatasetFilterBar();

  return (
    <MikroSparseDataset.ListPage title="Sparse Datasets" pageActions={actions} help={MIKRO_HELP.sparseDatasets}>
      <div className="p-3 flex flex-col gap-3">
        <SparseDatasetList filters={filters} ordering={ordering} />
      </div>
    </MikroSparseDataset.ListPage>
  );
};

export default Page;
