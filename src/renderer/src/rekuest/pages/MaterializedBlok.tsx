import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { registry } from "@/core/smart/localactions/registry";
import { Sidebars } from "@/core/layout/Sidebars";
import { LocalActionButton } from "@/core/ui/localactionbutton";
import { PageAction } from "@/core/ui/page-action";
import {
  RekuestAgent,
  RekuestBlok,
  RekuestMaterializedBlok,
} from "@/core/linkers";
import { cn } from "@/core/util/utils";
import MaterializedBlokRenderer from "@/rekuest/components/MaterializedBlokRenderer";
import { BlokTravelProvider } from "@/rekuest/travel/context";
import { TravelBar } from "@/rekuest/travel/TravelBar";
import { useBlokTravel } from "@/rekuest/travel/useBlokTravel";
import { History } from "lucide-react";
import { useMemo } from "react";
import { MaterializedBlokFragment, useMaterializedBlokQuery } from "../api/graphql";
import { REKUEST_HELP } from "../help";

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

    {materializedBlok.declaredBy && (
      <div className="flex flex-col gap-1">
        <div className="text-xs text-muted-foreground">Belongs to</div>
        <RekuestAgent.DetailLink object={materializedBlok.declaredBy} className="font-medium">
          {materializedBlok.declaredBy.name || materializedBlok.declaredBy.id}
        </RekuestAgent.DetailLink>
        <p className="text-xs text-muted-foreground">
          Its app provides the blok; the agent keeps this in step with its registrations.
        </p>
      </div>
    )}

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
  const travel = useBlokTravel();
  const agentNames = useMemo(
    () =>
      new Map(
        materializedBlok.agentMappings.map((mapping) => [
          mapping.agent.id,
          mapping.agent.name || mapping.key,
        ]),
      ),
    [materializedBlok.agentMappings],
  );

  return (
    <RekuestMaterializedBlok.ModelPage
      title={materializedBlok.name || materializedBlok.blok.name || materializedBlok.id}
      help={REKUEST_HELP.materializedBlok}
      object={materializedBlok}
      pageActions={(
        <>
          <PageAction
            size="sm"
            variant={travel.open ? "secondary" : "outline"}
            onClick={travel.toggle}
            title={travel.open ? "Back to live, and hide the history bar" : "Show this blok as it was at an earlier time"}
          >
            <History className="h-4 w-4" />
            History
          </PageAction>
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
        </>
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
          {/* Around the renderer, not in it: the cards a scene opens are bloks of their own and follow the same clock. */}
          <BlokTravelProvider source={travel.source}>
            <MaterializedBlokRenderer
              key={materializedBlok.id}
              materializedBlok={materializedBlok}
              surfaceId={materializedBlok.id}
              chrome="minimal"
            />
          </BlokTravelProvider>
        </div>
        {travel.open && <TravelBar travel={travel} names={agentNames} revisions className="mt-2 shrink-0" />}
      </div>
    </RekuestMaterializedBlok.ModelPage>
  );
});

export default MaterializedBlokPage;
