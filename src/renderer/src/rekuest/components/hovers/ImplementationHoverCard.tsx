import { useDialog } from "@/core/dialogs/registry";
import {
  HoverRow,
  HoverSectionLabel,
  HoverShell,
  HoverSkeleton,
} from "@/core/components/hover/HoverShell";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/lib/utils";
import { Object } from "@/core/types";
import { Zap } from "lucide-react";
import { PortKind, useHoverImplementationQuery } from "../../api/graphql";

const portKindLabel: Record<PortKind, string> = {
  [PortKind.String]: "str",
  [PortKind.Int]: "int",
  [PortKind.Float]: "float",
  [PortKind.Quantity]: "quantity",
  [PortKind.Bool]: "bool",
  [PortKind.Structure]: "structure",
  [PortKind.List]: "list",
  [PortKind.Dict]: "dict",
  [PortKind.Enum]: "enum",
  [PortKind.Date]: "date",
  [PortKind.Model]: "model",
  [PortKind.Interface]: "interface",
  [PortKind.MemoryStructure]: "memory",
  [PortKind.Union]: "union",
};

export const ImplementationHoverCard = ({ object }: { object: Object }) => {
  const { openDialog } = useDialog();
  const { data, error } = useHoverImplementationQuery({
    variables: { id: object.id },
    fetchPolicy: "cache-first",
  });

  if (error) {
    return (
      <div className="p-3 text-xs text-destructive">
        Could not load implementation details.
      </div>
    );
  }

  if (!data) {
    return <HoverSkeleton />;
  }

  const impl = data.implementation;
  const action = impl.action;

  const requiredArgs = action.args.filter((a) => !a.nullable && a.default == null);
  const optionalArgs = action.args.filter((a) => a.nullable || a.default != null);

  return (
    <HoverShell
      title={action.name}
      subtitle={`${impl.interface} · ${impl.agent.name}`}
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
        {impl.pinned && (
          <Badge variant="secondary" className="text-[10px]">
            pinned
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <HoverRow
          label="Agent"
          value={
            <span className="inline-flex items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  impl.agent.active && impl.agent.connected
                    ? "bg-green-500"
                    : impl.agent.active
                      ? "bg-yellow-500"
                      : "bg-muted-foreground/40",
                )}
              />
              {impl.agent.name}
            </span>
          }
        />
        <HoverRow label="App" value={action.app.identifier} />
      </div>

      {action.args.length > 0 && (
        <div className="flex flex-col gap-1">
          {requiredArgs.length > 0 && (
            <>
              <HoverSectionLabel>Required params</HoverSectionLabel>
              <div className="flex flex-col gap-0.5">
                {requiredArgs.map((arg) => (
                  <div
                    key={arg.key}
                    className="flex flex-row items-center justify-between text-xs gap-2"
                  >
                    <span className="font-mono text-[10px] truncate">
                      {arg.label || arg.key}
                    </span>
                    <span className="text-muted-foreground shrink-0">
                      {portKindLabel[arg.kind] ?? arg.kind.toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
          {optionalArgs.length > 0 && (
            <HoverRow
              label="Optional params"
              value={`${optionalArgs.length}`}
            />
          )}
        </div>
      )}
      <Button
        size="sm"
        variant="outline"
        className="mt-1 w-full gap-2"
        onClick={() => openDialog("createshortcut", { id: action.id }, {})}
      >
        <Zap className="h-3.5 w-3.5" />
        Create shortcut
      </Button>
    </HoverShell>
  );
};

export default ImplementationHoverCard;
