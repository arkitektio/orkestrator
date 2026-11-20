import { MikroArrayDataset } from "@/core/linkers";
import React from "react";
import { useArrayDatasetFilterBar } from "../components/filter/ArrayDatasetFilterBar";
import ArrayDatasetList from "../components/lists/ArrayDatasetList";
import { MIKRO_HELP } from "../help";

export type IArrayDatasetsScreenProps = {};

const Page: React.FC<IArrayDatasetsScreenProps> = () => {
  const { filters, ordering, bar } = useArrayDatasetFilterBar();

  return (
    <MikroArrayDataset.ListPage title="Spatial Datasets" help={MIKRO_HELP.arrayDatasets}>
      <div className="p-3 flex flex-col gap-3">
        {/* Under the header, over the list it narrows: the Mikro home's filter row. */}
        {bar}
        <ArrayDatasetList filters={filters} ordering={ordering} />
      </div>
    </MikroArrayDataset.ListPage>
  );
};

export default Page;
