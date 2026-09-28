import { Explainer } from "@/core/layout/Explainer";
import { MikroSparseDataset } from "@/core/linkers";
import React from "react";
import { useSparseDatasetFilterBar } from "../components/filter/SparseDatasetFilterBar";
import SparseDatasetList from "../components/lists/SparseDatasetList";

export type ISparseDatasetsScreenProps = {};

const Page: React.FC<ISparseDatasetsScreenProps> = () => {
  const { filters, ordering, actions } = useSparseDatasetFilterBar();

  return (
    <MikroSparseDataset.ListPage title="Sparse Datasets" pageActions={actions}>
      <div className="p-3 flex flex-col gap-3">
        <Explainer
          title="Sparse Datasets"
          description="Matrices stored by their non-zero cells: one enumeration against another, such as cells against genes. Each stored layout indexes one axis, so a single position along it is one contiguous read, and a table can name the positions of an axis."
        />
        <SparseDatasetList filters={filters} ordering={ordering} />
      </div>
    </MikroSparseDataset.ListPage>
  );
};

export default Page;
