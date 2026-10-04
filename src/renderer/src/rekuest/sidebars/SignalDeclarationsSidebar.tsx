import { RekuestService } from "@/core/linkers";
import { useSignalDeclarationsQuery } from "@/rekuest/api/graphql";
import { useMemo } from "react";
import { DeclarationRow } from "../components/automation/DeclarationRow";

/**
 * What this hub's services declare they signal — what a trigger can wait
 * for — grouped by service. Queried only while the tab is open.
 */
export const SignalDeclarationsSidebar = () => {
  const { data, error } = useSignalDeclarationsQuery();

  const byService = useMemo(() => {
    type Declarations = NonNullable<typeof data>["signalDeclarations"];
    const groups = new Map<string, { service: Declarations[number]["service"]; declarations: Declarations }>();
    for (const declaration of data?.signalDeclarations ?? []) {
      const group = groups.get(declaration.service.id);
      groups.set(declaration.service.id, {
        service: declaration.service,
        declarations: [...(group?.declarations ?? []), declaration],
      });
    }
    return [...groups.values()].sort((a, b) => a.service.name.localeCompare(b.service.name));
  }, [data]);

  if (error) return <p className="p-3 text-xs text-destructive">{error.message}</p>;
  if (byService.length === 0) return null;

  return (
    <div className="flex flex-col gap-5 p-3">
      {byService.map(({ service, declarations }) => (
        <section key={service.id}>
          <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <RekuestService.DetailLink object={service} className="hover:text-foreground">
              {service.name}
            </RekuestService.DetailLink>
          </h3>
          <ul className="flex flex-col">
            {declarations.map((declaration) => (
              <DeclarationRow key={declaration.id} declaration={declaration} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
