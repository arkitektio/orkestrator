import { useDialog } from "@/core/dialogs/registry";
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
import { BlokArgsForm } from "@/rekuest/components/BlokArgsForm";
import { ArgPortRows, SignatureColumn } from "@/rekuest/components/action/ActionSignature";
import {
  BLOK_ARGS_PARAM,
  blokArgsSearch,
  missingBlokArgs,
  readBlokArgs,
  type BlokArgs,
} from "@/rekuest/components/blokArgs";
import { BlokTravelProvider } from "@/rekuest/travel/context";
import { TravelBar } from "@/rekuest/travel/TravelBar";
import { useBlokTravel } from "@/rekuest/travel/useBlokTravel";
import { History, Pin, SlidersHorizontal } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MaterializedBlokFragment, useMaterializedBlokQuery } from "../api/graphql";
import { REKUEST_HELP } from "../help";

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

    {materializedBlok.blok.args.length > 0 && (
      <SignatureColumn title="Opened for">
        <ArgPortRows ports={materializedBlok.blok.args} />
      </SignatureColumn>
    )}

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

    {materializedBlok.unboundDependencies.length > 0 && (
      <div className="flex flex-col gap-1">
        <div className="text-xs text-muted-foreground">Not bound</div>
        {materializedBlok.unboundDependencies.map((key) => (
          <div key={key} className="flex items-center gap-2 py-1 text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full border border-muted-foreground/60" />
            <span className="font-mono text-xs">{key}</span>
            <span className="ml-auto text-xs">its controls are grayed out</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

/**
 * What the blok is opened for lives in the link (`?args=`): "Open in…" writes
 * it, a reload keeps it, and what the tree picks (a picker bound to
 * `args.<key>`) replaces it, so the history steps back through items.
 */
const useBlokArgs = () => {
  const [search, setSearch] = useSearchParams();
  const args = useMemo(() => readBlokArgs(search), [search]);
  // Only `args`: whatever else the page keeps in its search string stays.
  const setArgs = useCallback(
    (next: BlokArgs) =>
      setSearch((previous) => {
        const merged = new URLSearchParams(previous);
        const value = new URLSearchParams(blokArgsSearch(next)).get(BLOK_ARGS_PARAM);
        if (value === null) merged.delete(BLOK_ARGS_PARAM);
        else merged.set(BLOK_ARGS_PARAM, value);
        return merged;
      }),
    [setSearch],
  );
  return [args, setArgs] as const;
};

export const MaterializedBlokPage = asDetailQueryRoute(useMaterializedBlokQuery, ({ data }) => {
  const materializedBlok = data.materializedBlok;
  const travel = useBlokTravel();
  const { openDialog } = useDialog();
  const [args, setArgs] = useBlokArgs();
  const ports = materializedBlok.blok.args;
  // Asked for on the way in, and again on "Reinstantiate"; between those
  // changing the item is the tree's to do.
  const [asking, setAsking] = useState(() => missingBlokArgs(ports, args).length > 0);
  // Back to what is open, once there is something complete to go back to.
  const complete = missingBlokArgs(ports, args).length === 0;
  const openFor = useCallback(
    (next: BlokArgs) => {
      setArgs(next);
      setAsking(false);
    },
    [setArgs],
  );
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
          {ports.length > 0 && (
            <PageAction
              size="sm"
              variant={asking ? "secondary" : "outline"}
              onClick={() => setAsking(true)}
              disabled={asking}
              title="Choose again what this blok is opened for"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Reinstantiate
            </PageAction>
          )}
          {materializedBlok.revision && (
            <PageAction
              size="sm"
              variant={materializedBlok.pinnedRevision ? "secondary" : "outline"}
              onClick={() => openDialog("pinrevision", { id: materializedBlok.id })}
              title={
                materializedBlok.pinnedRevision
                  ? "It stays at this revision of its blok. Choose another, or follow the latest again."
                  : "It follows its blok's latest revision. Keep it at one instead."
              }
            >
              <Pin className="h-4 w-4" />
              {materializedBlok.pinnedRevision
                ? `Pinned · rev ${materializedBlok.pinnedRevision.number}`
                : `Rev ${materializedBlok.revision.number} · latest`}
            </PageAction>
          )}
          <LocalActionButton
            name={"rekuest-rematerialize-blok" as keyof typeof registry}
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
        <div className="min-h-0 flex-1">
          {/* Around the renderer, not in it: the cards a scene opens are bloks of their own and follow the same clock. */}
          {asking ? (
            <BlokArgsForm
              name={materializedBlok.name || materializedBlok.blok.name}
              ports={ports}
              args={args}
              onOpen={openFor}
              onCancel={complete ? () => setAsking(false) : undefined}
            />
          ) : (
            <BlokTravelProvider source={travel.source}>
              <MaterializedBlokRenderer
                key={materializedBlok.id}
                materializedBlok={materializedBlok}
                surfaceId={materializedBlok.id}
                chrome="minimal"
                args={args}
                onArgsChange={setArgs}
              />
            </BlokTravelProvider>
          )}
        </div>
        {travel.open && <TravelBar travel={travel} names={agentNames} revisions className="mt-2 shrink-0" />}
      </div>
    </RekuestMaterializedBlok.ModelPage>
  );
});

export default MaterializedBlokPage;
