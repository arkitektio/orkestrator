import { MikroTableDataset } from "@/core/linkers";
import React from "react";
import { TableDatasetFilterRow, useTableDatasetFilters } from "../components/filter/TableDatasetFilterRow";
import { TableDatasetGrid } from "../components/lists/TableDatasetGrid";
import { MIKRO_HELP } from "../help";

/**
 * Every table dataset, laid out like the Mikro home: the filter row over the
 * grid it narrows (search, who made it, what kind of table, when, the order),
 * then the tables as cards with "Show more" at the foot.
 */
const Page: React.FC = () => {
  const tableFilters = useTableDatasetFilters();

  return (
    <MikroTableDataset.ListPage title="Table Datasets" help={MIKRO_HELP.tableDatasets}>
      <div className="flex flex-col gap-3 p-3">
        <TableDatasetFilterRow filters={tableFilters} />
        <TableDatasetGrid
          filters={tableFilters.filters}
          ordering={tableFilters.ordering}
          filtered={tableFilters.active}
          onClear={tableFilters.clear}
        />
      </div>
    </MikroTableDataset.ListPage>
  );
};

export default Page;
