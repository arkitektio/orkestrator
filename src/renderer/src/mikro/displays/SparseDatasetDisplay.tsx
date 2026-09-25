import { DisplayWidgetProps } from "@/core/lib/display/registry";
import { MikroSparseDataset } from "@/core/linkers";
import { useGetSparseDatasetQuery } from "@/mikro/api/graphql";
import { describeShape, sparseDatasetTitle } from "@/mikro/components/sparse/sparseFacts";

export const SparseDatasetDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetSparseDatasetQuery({ variables: { id: props.id } });

  if (!data?.sparseDataset) {
    return (
      <div className="text-xs text-muted-foreground">Sparse dataset not found</div>
    );
  }

  const dataset = data.sparseDataset;
  const shape = describeShape(dataset.axisNames, dataset.shape);

  if (props.context === "command") {
    return (
      <MikroSparseDataset.DetailLink object={{ id: props.id }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{sparseDatasetTitle(dataset.name)}</span>
          <span className="text-xs text-muted-foreground shrink-0 font-mono">
            {shape}
          </span>
        </div>
      </MikroSparseDataset.DetailLink>
    );
  }

  return (
    <MikroSparseDataset.DetailLink object={{ id: props.id }}>
      <div className="w-full rounded-lg border border-border/60 bg-card p-3 space-y-2">
        <div className="font-semibold text-sm">{sparseDatasetTitle(dataset.name)}</div>
        <div className="font-mono text-xs text-muted-foreground">{shape}</div>
        {dataset.indexableAxes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {dataset.indexableAxes.map((axis) => (
              <span
                key={axis}
                className="text-xs bg-muted/60 rounded px-1.5 py-0.5 font-mono"
              >
                indexed on {axis}
              </span>
            ))}
          </div>
        )}
      </div>
    </MikroSparseDataset.DetailLink>
  );
};

export default SparseDatasetDisplay;
