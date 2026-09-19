import {
  HoverRow,
  HoverShell,
  HoverSkeleton,
} from "@/components/hover/HoverShell";
import { Badge } from "@/components/ui/badge";
import { Object } from "@/types";
import { useDetailNeuronModelQuery } from "../../api/graphql";

export const NeuronModelHoverCard = ({ object }: { object: Object }) => {
  const { data, error } = useDetailNeuronModelQuery({
    variables: { id: object.id },
    fetchPolicy: "cache-first",
  });

  if (error) {
    return (
      <div className="p-3 text-xs text-destructive">
        Could not load neuron model details.
      </div>
    );
  }

  if (!data) {
    return <HoverSkeleton />;
  }

  const model = data.neuronModel;
  const { config } = model;

  return (
    <HoverShell title={model.name} subtitle="Neuron Model">
      {model.description && (
        <p className="text-xs text-muted-foreground line-clamp-3">
          {model.description}
        </p>
      )}

      {config.label && (
        <div className="flex flex-row flex-wrap gap-1">
          <Badge variant="secondary" className="text-[10px]">
            {config.label}
          </Badge>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <HoverRow label="Temperature" value={config.temperature} />
        <HoverRow label="V init" value={config.vInit} />
        <HoverRow label="Cells" value={config.cells.length} />
        <HoverRow label="Sessions" value={model.sessions.filter((session) => session.clock).length} />
        <HoverRow label="Environment" value={model.environment.name} />
      </div>
    </HoverShell>
  );
};

export default NeuronModelHoverCard;
