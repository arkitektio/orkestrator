import type { ViewerWidgetProps } from "@/core/smart/display/registry";
import { useGetLensQuery } from "../api/graphql";
import { ViewerNotice } from "./EmbeddedScene";
import TableDatasetViewer from "./TableDatasetViewer";

/**
 * The viewer for `@mikro/tablelens`: the rows of the table the lens selects over.
 * A lens that windows its table still shows the whole table: the grid does not
 * narrow to a lens' windows.
 */
const TableLensViewer = ({ id, className, ...rest }: ViewerWidgetProps) => {
  const { data, loading, error } = useGetLensQuery({ variables: { id } });
  const lens = data?.lens;

  if (!lens) {
    return (
      <ViewerNotice className={className}>
        {loading ? "Loading lens…" : (error?.message ?? "This lens could not be loaded.")}
      </ViewerNotice>
    );
  }
  if (lens.__typename !== "TableLens") {
    return <ViewerNotice className={className}>This lens is not a table lens.</ViewerNotice>;
  }
  return (
    <TableDatasetViewer
      {...rest}
      identifier="@mikro/tabledataset"
      id={lens.tableDataset.id}
      className={className}
    />
  );
};

export default TableLensViewer;
