import { asDetailQueryRoute } from "@/core/app/routes/DetailQueryRoute";
import { registry } from "@/core/app/localactions";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { LocalActionButton } from "@/core/components/ui/localactionbutton";
import {
  RekuestAgent,
  RekuestBlok,
  RekuestMaterializedBlok,
} from "@/core/linkers";
import { cn } from "@/core/lib/utils";
import MaterializedBlokRenderer from "@/rekuest/components/MaterializedBlokRenderer";
import { MaterializedBlokFragment, useMaterializedBlokQuery } from "../api/graphql";

/**
 * Only what stops the blok from working: a declared dependency nobody is
 * bound to, or a bound agent that is offline. Renders nothing otherwise.
 */
const BindingNotice = ({ materializedBlok }: { materializedBlok: MaterializedBlokFragment }) => {
  const bound = new Set(materializedBlok.agentMappings.map((mapping) => mapping.key));
  const unbound = materializedBlok.blok.dependencies
    .filter((dependency) => !bound.has(dependency.key))
    .map((dependency) => dependency.key);
  const offline = materializedBlok.agentMappings.filter((mapping) => !mapping.agent.connected);

  if (unbound.length === 0 && offline.length === 0) return null;

  return (
    <div className="mb-2 flex flex-col gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
      {unbound.length > 0 && (
        <span>
          Not bound: <span className="font-mono text-xs">{unbound.join(", ")}</span> — actions
          on {unbound.length === 1 ? "it" : "them"} won't run.
        </span>
      )}
      {offline.map((mapping) => (
        <span key={mapping.key}>
          {mapping.agent.name || mapping.agent.id} is offline — its actions won't run and its
          state won't update.
        </span>
      ))}
    </div>
  );
};

const BindingsSidebar = ({ materializedBlok }: { materializedBlok: MaterializedBlokFragment }) => (
  <div className="flex flex-col gap-4 p-3 text-sm">
    <div className="flex flex-col gap-1">
      <div className="text-xs text-muted-foreground">Blok</div>
      <RekuestBlok.DetailLink object={materializedBlok.blok} className="font-medium">
        {materializedBlok.blok.name}
      </RekuestBlok.DetailLink>
      {materializedBlok.blok.description && (
        <p className="text-xs text-muted-foreground">{materializedBlok.blok.description}</p>
      )}
    </div>

    {materializedBlok.agentMappings.length > 0 && (
      <div className="flex flex-col gap-1">
        <div className="text-xs text-muted-foreground">Bound agents</div>
        {materializedBlok.agentMappings.map((mapping) => (
          <div key={mapping.key} className="flex items-center gap-2 py-1">
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                mapping.agent.connected ? "bg-emerald-500" : "bg-muted-foreground/40",
              )}
              title={mapping.agent.connected ? "Connected" : "Offline"}
            />
            <RekuestAgent.DetailLink object={mapping.agent} className="truncate">
              {mapping.agent.name || mapping.agent.id}
            </RekuestAgent.DetailLink>
            <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
              {mapping.key}
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
);

export const MaterializedBlokPage = asDetailQueryRoute(useMaterializedBlokQuery, ({ data }) => {
  const materializedBlok = data.materializedBlok;

  return (
    <RekuestMaterializedBlok.ModelPage
      title={materializedBlok.name || materializedBlok.blok.name || materializedBlok.id}
      object={materializedBlok}
      pageActions={(
        <LocalActionButton
          name={"rekuest-delete-materialized-blok" as keyof typeof registry}
          state={{
            left: [
              {
                identifier: '@rekuest/materialized_blok',
                id: materializedBlok.id,
              },
            ],
            isCommand: false,
          }}
        />
      )}
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Bindings">
            <BindingsSidebar materializedBlok={materializedBlok} />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <div className="flex h-full w-full flex-col p-3">
        <BindingNotice materializedBlok={materializedBlok} />
        <div className="min-h-0 flex-1">
          <MaterializedBlokRenderer
            key={materializedBlok.id}
            materializedBlok={materializedBlok}
            surfaceId={materializedBlok.id}
            chrome="minimal"
          />
        </div>
      </div>
    </RekuestMaterializedBlok.ModelPage>
  );
});

export default MaterializedBlokPage;
