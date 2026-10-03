import { useDialog } from "@/core/dialogs/registry";
import { RekuestStructure } from "@/core/linkers";
import { Button } from "@/core/ui/button";
import { useSignalDeclarationsQuery } from "@/rekuest/api/graphql";
import { KIND_LABELS } from "@/rekuest/lib/triggerConditions";
import { Zap } from "lucide-react";
import { useMemo } from "react";

/**
 * What this hub's services declare they signal — what a trigger can wait
 * for — grouped by service. Queried only while the tab is open.
 */
export const SignalDeclarationsSidebar = () => {
  const { data, error } = useSignalDeclarationsQuery();
  const { openDialog } = useDialog();

  const byService = useMemo(() => {
    const groups = new Map<string, NonNullable<typeof data>["signalDeclarations"]>();
    for (const declaration of data?.signalDeclarations ?? []) {
      groups.set(declaration.service.name, [...(groups.get(declaration.service.name) ?? []), declaration]);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  if (error) return <p className="p-3 text-xs text-destructive">{error.message}</p>;
  if (byService.length === 0) return null;

  return (
    <div className="flex flex-col gap-5 p-3">
      {byService.map(([service, declarations]) => (
        <section key={service}>
          <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {service}
          </h3>
          <ul className="flex flex-col">
            {declarations.map((declaration) => (
              <li
                key={declaration.id}
                className="group flex items-start gap-2 rounded-md px-1.5 py-1 hover:bg-muted/50"
                title={declaration.description ?? undefined}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">
                    <RekuestStructure.DetailLink object={{ id: declaration.identifier }} className="font-mono text-xs hover:underline">
                      {declaration.identifier}
                    </RekuestStructure.DetailLink>{" "}
                    <span className="text-muted-foreground">{KIND_LABELS[declaration.kind]}</span>
                  </div>
                  {declaration.descriptorKeys.length > 0 && (
                    <div className="truncate text-xs text-muted-foreground/70">
                      {declaration.descriptorKeys.join(", ")}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                  title="New trigger on this signal"
                  onClick={() =>
                    openDialog(
                      "createtrigger",
                      { identifier: declaration.identifier, kind: declaration.kind },
                      { size: "medium" },
                    )
                  }
                >
                  <Zap className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
