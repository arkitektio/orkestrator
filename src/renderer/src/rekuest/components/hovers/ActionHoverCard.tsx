import { useDialog } from "@/core/dialogs/registry";
import {
  HoverRow,
  HoverSectionLabel,
  HoverShell,
  HoverSkeleton,
} from "@/core/ui/HoverShell";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { RekuestImplementation } from "@/core/linkers";
import { Object } from "@/core/types";
import { Zap } from "lucide-react";
import { TaskEventKind, useHoverActionQuery } from "../../api/graphql";
import { deriveAvailability } from "../../lib/actionBrowse";
import { AgentStatusDot, agentStatus } from "../displays/AgentStatusDot";

export const ActionHoverCard = ({ object }: { object: Object }) => {
  const { openDialog } = useDialog();
  const { data, error } = useHoverActionQuery({
    variables: { id: object.id },
    fetchPolicy: "cache-first",
  });

  if (error) {
    return (
      <div className="p-3 text-xs text-destructive">
        Could not load action details.
      </div>
    );
  }

  if (!data) {
    return <HoverSkeleton />;
  }

  const action = data.action;
  const done = action.tasks.filter(
    (a) => a.isDone || a.latestEventKind === TaskEventKind.Completed,
  ).length;
  const failed = action.tasks.filter(
    (a) =>
      a.latestEventKind === TaskEventKind.Failed ||
      a.latestEventKind === TaskEventKind.Critical,
  ).length;
  const availability = deriveAvailability(action.implementations);

  return (
    <HoverShell
      title={action.name}
      subtitle={action.app.identifier}
    >
      {action.description && (
        <p className="text-xs text-muted-foreground line-clamp-3">
          {action.description}
        </p>
      )}

      <div className="flex flex-row flex-wrap gap-1">
        <Badge variant="secondary" className="text-[10px]">
          {action.kind.toLowerCase()}
        </Badge>
        {action.stateful && (
          <Badge variant="secondary" className="text-[10px]">
            stateful
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <HoverRow
          label="Implementations"
          value={`${availability.total} (${availability.online} online)`}
        />
        <HoverRow
          label="Recent runs"
          value={
            <span className="inline-flex gap-2">
              <span className="text-green-500">{done} done</span>
              {failed > 0 && (
                <span className="text-destructive">{failed} failed</span>
              )}
            </span>
          }
        />
      </div>

      {action.implementations.length > 0 && (
        <div className="flex flex-col gap-1">
          <HoverSectionLabel>Provided by</HoverSectionLabel>
          <div className="flex flex-col gap-0.5">
            {action.implementations.slice(0, 6).map((impl) => (
              <RekuestImplementation.DetailLink
                key={impl.id}
                object={impl}
                className="flex flex-row items-center gap-2 text-xs rounded px-1 py-0.5 hover:bg-muted transition-colors"
              >
                <AgentStatusDot status={agentStatus(impl.agent)} />
                <span className="line-clamp-1">{impl.agent.name}</span>
              </RekuestImplementation.DetailLink>
            ))}
          </div>
        </div>
      )}

      <Button
        size="sm"
        variant="outline"
        className="mt-1 w-full gap-2"
        onClick={() => openDialog("createshortcut", { id: action.id })}
      >
        <Zap className="h-3.5 w-3.5" />
        Create shortcut
      </Button>
    </HoverShell>
  );
};

export default ActionHoverCard;
