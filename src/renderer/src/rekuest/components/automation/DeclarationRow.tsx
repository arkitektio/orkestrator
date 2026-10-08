import { useDialog } from "@/core/dialogs/registry";
import { RekuestTrigger } from "@/core/linkers";
import { Button } from "@/core/ui/button";
import { SignalDeclarationFragment } from "@/rekuest/api/graphql";
import { KIND_LABELS } from "@/rekuest/lib/triggerConditions";
import { Zap } from "lucide-react";

/**
 * One signal a service declares it sends: the structure, what happens to
 * it, and the descriptors it carries. Hovering offers a rule on it. With
 * `triggers`, the rules already waiting for it are named underneath.
 */
export const DeclarationRow = ({
  declaration,
}: {
  declaration: SignalDeclarationFragment & { triggers?: readonly { id: string; name: string }[] };
}) => {
  const { openDialog } = useDialog();
  return (
    <li
      className="group flex items-start gap-2 rounded-md px-1.5 py-1 hover:bg-muted/50"
      title={declaration.description ?? undefined}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">
          <span className="font-mono text-xs">{declaration.identifier}</span>{" "}
          <span className="text-muted-foreground">{KIND_LABELS[declaration.kind]}</span>
        </div>
        {declaration.descriptorKeys.length > 0 && (
          <div className="truncate text-xs text-muted-foreground/70">
            {declaration.descriptorKeys.join(", ")}
          </div>
        )}
        {declaration.triggers && declaration.triggers.length > 0 && (
          <div className="flex flex-wrap gap-x-3 text-xs">
            {declaration.triggers.map((trigger) => (
              <span key={trigger.id} className="min-w-0 truncate">
                <span className="text-muted-foreground">→ </span>
                <RekuestTrigger.DetailLink object={trigger} className="hover:text-primary">
                  {trigger.name}
                </RekuestTrigger.DetailLink>
              </span>
            ))}
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
        title="Run something on this signal"
        onClick={() =>
          openDialog("createautomation", {
            kind: "signal",
            identifier: declaration.identifier,
            signalKind: declaration.kind,
          })
        }
      >
        <Zap className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
};
