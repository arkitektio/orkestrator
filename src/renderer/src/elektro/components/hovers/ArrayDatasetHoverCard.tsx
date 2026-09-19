import { HoverRow, HoverShell, HoverSkeleton } from "@/components/hover/HoverShell";
import { formatShape } from "@/lib/arrays/formatShape";
import { formatDisplay } from "@/lib/quantities";
import { Object } from "@/types";
import { useGetArrayDatasetQuery } from "../../api/graphql";

export const ArrayDatasetHoverCard = ({ object }: { object: Object }) => {
  const { data, error } = useGetArrayDatasetQuery({
    variables: { id: object.id },
    fetchPolicy: "cache-first",
  });

  if (error) {
    return <div className="p-3 text-xs text-destructive">Could not load dataset details.</div>;
  }
  if (!data) return <HoverSkeleton />;

  const dataset = data.arrayDataset;
  const experiments = new Set(dataset.experimentLayers.map((layer) => layer.experiment.id)).size;

  return (
    <HoverShell title={dataset.name} subtitle="Array Dataset">
      {dataset.description && (
        <p className="line-clamp-3 text-xs text-muted-foreground">{dataset.description}</p>
      )}
      <div className="flex flex-col gap-1">
        <HoverRow label="Shape" value={formatShape(dataset.axisNames, dataset.shape)} />
        <HoverRow label="Unit" value={dataset.valueUnit} />
        {dataset.simulation && (
          <>
            <HoverRow label="Model" value={dataset.simulation.model.name} />
            <HoverRow label="Duration" value={formatDisplay(dataset.simulation.duration)} />
          </>
        )}
        <HoverRow label="Experiments" value={experiments} />
      </div>
    </HoverShell>
  );
};

export default ArrayDatasetHoverCard;
