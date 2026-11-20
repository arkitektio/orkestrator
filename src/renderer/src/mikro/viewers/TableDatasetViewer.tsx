import type { ViewerWidgetProps } from "@/core/smart/display/registry";
import { cn } from "@/core/util/utils";
import { useGetTableDatasetQuery } from "../api/graphql";
import { TableDatasetTable } from "../components/tables/TableDatasetTable";
import { AttributeServiceProvider } from "../lib/attributes/AttributeServiceProvider";
import { ViewerNotice } from "./EmbeddedScene";

/**
 * The viewer for `@mikro/tabledataset`: the table's rows, as its page shows them
 * (search, paging, column popovers, export), without the page around them.
 */
const TableDatasetViewer = ({ id, className }: ViewerWidgetProps) => {
  const { data, loading, error } = useGetTableDatasetQuery({ variables: { id } });
  const table = data?.tableDataset;

  if (!table) {
    return (
      <ViewerNotice className={className}>
        {loading ? "Loading table…" : (error?.message ?? "This table could not be loaded.")}
      </ViewerNotice>
    );
  }
  return (
    // The column popovers read a column's values through the shared parquet
    // engine, which the table's page provides around itself.
    <AttributeServiceProvider>
      <div className={cn("h-full w-full min-h-0 overflow-hidden p-2", className)}>
        <TableDatasetTable table={table} />
      </div>
    </AttributeServiceProvider>
  );
};

export default TableDatasetViewer;
