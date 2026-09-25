import { Explainer } from "@/components/explainer/Explainer";
import { MikroTableDataset } from "@/linkers";
import React from "react";
import TableDatasetList from "../components/lists/TableDatasetList";

export type ITableDatasetsScreenProps = {};

const Page: React.FC<ITableDatasetsScreenProps> = () => {
  return (
    <MikroTableDataset.ListPage title="Table Datasets">
      <div className="p-3">
        <Explainer
          title="Table Datasets"
          description="Tables that carry their own coordinate system. Their coordinate columns are the axes of the space their rows live in, while measurement columns hold the values sampled at each position."
        />
        <TableDatasetList pagination={{ limit: 30 }} />
      </div>
    </MikroTableDataset.ListPage>
  );
};

export default Page;
