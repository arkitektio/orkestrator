import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/ui/select";

type RunsOnImplementation = {
  id: string;
  interface: string;
  agent: { id: string; name?: string | null };
};

/**
 * The agent a stateful action runs on: its state lives there, so the run names it. The only one
 * that can take it now is said, several are a choice, and none is why the run cannot start.
 */
export const RunsOn = ({
  live,
  value,
  onChange,
}: {
  /** The implementations whose agent can take work now. */
  live: readonly RunsOnImplementation[];
  value?: string;
  onChange: (implementation: string) => void;
}) => {
  if (live.length === 0) {
    return <div className="text-xs text-destructive">No agent that runs this is online</div>;
  }
  if (live.length === 1) {
    return (
      <div className="text-xs text-muted-foreground">
        Runs on <span className="text-foreground">{live[0].agent.name ?? live[0].agent.id}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      Runs on
      {/* "": controlled from the start, with the placeholder showing. */}
      <Select value={value ?? ""} onValueChange={onChange}>
        <SelectTrigger size="sm" className="min-w-40" aria-label="Agent to run on">
          <SelectValue placeholder="Choose an agent" />
        </SelectTrigger>
        <SelectContent>
          {live.map((implementation) => (
            <SelectItem key={implementation.id} value={implementation.id}>
              {implementation.agent.name ?? implementation.agent.id}
              <span className="text-muted-foreground">{implementation.interface}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
