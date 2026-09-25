import {
  HoverRow,
  HoverShell,
  HoverSkeleton,
} from "@/core/components/hover/HoverShell";
import { Object } from "@/core/types";
import { formatDistanceToNow } from "date-fns";
import { useGetExperimentSceneQuery } from "../../api/graphql";

export const ExperimentHoverCard = ({ object }: { object: Object }) => {
  const { data, error } = useGetExperimentSceneQuery({
    variables: { id: object.id },
    fetchPolicy: "cache-first",
  });

  if (error) {
    return (
      <div className="p-3 text-xs text-destructive">
        Could not load experiment details.
      </div>
    );
  }

  if (!data) {
    return <HoverSkeleton />;
  }

  const experiment = data.experiment;
  const count = (typename: string) =>
    experiment.layers.filter((layer) => layer.__typename === typename).length;
  // Only the kinds it has: an experiment with no spike layers shows no "Spikes 0".
  const kinds = [
    { label: "Traces", value: count("TraceLayer") },
    { label: "Spikes", value: count("SpikesLayer") },
    { label: "Events", value: count("EventsLayer") },
    { label: "Annotations", value: count("AnnotationLayer") },
  ].filter((kind) => kind.value > 0);

  return (
    <HoverShell title={experiment.name} subtitle="Experiment">
      {experiment.description && (
        <p className="text-xs text-muted-foreground line-clamp-3">
          {experiment.description}
        </p>
      )}

      <div className="flex flex-col gap-1">
        {kinds.map((kind) => (
          <HoverRow key={kind.label} label={kind.label} value={kind.value} />
        ))}
        <HoverRow
          label="Created"
          value={
            experiment.createdAt
              ? formatDistanceToNow(new Date(experiment.createdAt), {
                  addSuffix: true,
                })
              : "—"
          }
        />
      </div>
    </HoverShell>
  );
};

export default ExperimentHoverCard;
