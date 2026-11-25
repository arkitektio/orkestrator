import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { RekuestDependency, RekuestImplementation } from "@/core/linkers";
import { Badge } from "@/core/ui/badge";
import { Card } from "@/core/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/core/ui/empty";
import { useImplementationQuery } from "@/rekuest/api/graphql";
import { REKUEST_HELP } from "../../help";

/**
 * What one implementation needs from other agents to run
 * (`implementations/:id/dependencies`). A dependency is its implementation's,
 * so this is where they are listed; `/rekuest/dependencies` has no list of its own.
 */
export const ImplementationDependenciesPage = asDetailQueryRoute(useImplementationQuery, ({ data }) => {
  const implementation = data.implementation;
  const name = `${implementation.action.name} @ ${implementation.interface}`;

  return (
    <RekuestImplementation.ModelPage
      title={`${name} — Dependencies`}
      help={REKUEST_HELP.implementationDependencies}
      object={implementation}
      // The breadcrumb reads the implementation's name, not its number.
      crumbs={{ [implementation.id]: name }}
    >
      <div className="p-6">
        {implementation.dependencies.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No dependencies</EmptyTitle>
              <EmptyDescription>This implementation runs on its own agent alone.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {implementation.dependencies.map((dependency) => (
              <RekuestDependency.Smart key={dependency.id} object={dependency} menuButton>
                <Card className="flex h-full flex-col gap-1.5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <RekuestDependency.DetailLink
                      object={dependency}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {dependency.key}
                    </RekuestDependency.DetailLink>
                    <div className="flex shrink-0 gap-1">
                      {dependency.optional && <Badge variant="outline">optional</Badge>}
                      {dependency.autoResolvable && <Badge variant="outline">auto</Badge>}
                      {dependency.singular && <Badge variant="outline">singular</Badge>}
                    </div>
                  </div>
                  {dependency.description && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{dependency.description}</p>
                  )}
                  {dependency.appFilter && (
                    <div className="truncate font-mono text-xs text-muted-foreground">{dependency.appFilter}</div>
                  )}
                </Card>
              </RekuestDependency.Smart>
            ))}
          </div>
        )}
      </div>
    </RekuestImplementation.ModelPage>
  );
});

export default ImplementationDependenciesPage;
