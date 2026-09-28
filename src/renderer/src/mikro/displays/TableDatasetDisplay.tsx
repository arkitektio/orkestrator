import { DisplayWidgetProps } from "@/core/smart/display/registry";
import { MikroTableDataset } from "@/core/linkers";
import { useGetTableDatasetQuery } from "@/mikro/api/graphql";

export const TableDatasetDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetTableDatasetQuery({ variables: { id: props.id } });

  if (!data?.tableDataset) {
    return (
      <div className="text-xs text-muted-foreground">Table dataset not found</div>
    );
  }

  const dataset = data.tableDataset;
  const columnCount = dataset.columns?.length ?? 0;

  if (props.context === "command") {
    return (
      <MikroTableDataset.DetailLink object={{ id: props.id }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{dataset.name}</span>
          {columnCount > 0 && (
            <span className="text-xs text-muted-foreground shrink-0">
              {columnCount} {columnCount === 1 ? "column" : "columns"}
            </span>
          )}
        </div>
      </MikroTableDataset.DetailLink>
    );
  }

  return (
    <MikroTableDataset.DetailLink object={{ id: props.id }}>
      <div className="w-full rounded-lg border border-border/60 bg-card p-3 space-y-2">
        <div className="font-semibold text-sm">{dataset.name}</div>
        {dataset.axisNames.length > 0 && (
          <div className="font-mono text-xs text-muted-foreground">
            {dataset.axisNames.join(" × ")}
          </div>
        )}
        {columnCount > 0 && (
          <div className="flex flex-wrap gap-1">
            {dataset.columns.slice(0, 6).map((col) => (
              <span
                key={col.id}
                className="text-xs bg-muted/60 rounded px-1.5 py-0.5 font-mono"
              >
                {col.name}
              </span>
            ))}
            {columnCount > 6 && (
              <span className="text-xs text-muted-foreground">
                +{columnCount - 6} more
              </span>
            )}
          </div>
        )}
      </div>
    </MikroTableDataset.DetailLink>
  );
};

export default TableDatasetDisplay;
