import { AgentLogo } from "@/rekuest/components/logo/BlokLogo";
import { reportErrorAs } from "@/core/notify";
import { useRekuest } from "@/rekuest/api/hooks";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { VerticalListRender } from "@/core/layout/VerticalListRender";
import { PageSections } from "@/core/layout/PageSections";
import { Sidebars } from "@/core/layout/Sidebars";
import { BlokDebugTab, useBlokDebugTab } from "../components/BlokDebugTab";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/util/utils";
import { RekuestAgent } from "@/core/linkers";
import { ObjectButton } from "@/core/smart/ObjectButton";
import { agentStructure } from "@/rekuest/smart/agent";
import {
  AgentFragment,
  ComponentContext,
  ListMaterializedBlokFragment,
  useAgentQuery,
  useBounceMutation,
  useListMaterializedBloksQuery,
  usePinAgentMutation,
  WatchImplementationsDocument,
  WatchImplementationsSubscription,
  WatchImplementationsSubscriptionVariables,
  TaskChangeFragment,
} from "@/rekuest/api/graphql";
import { toTaskChange, type ListSnapshot, type WireTaskChange } from "@/rekuest/session/frames";
import { useRekuestSession } from "@/rekuest/session/hooks";
import { LayoutPanelTop, Pin, PinOff } from "lucide-react";
import { Link } from "react-router-dom";
import { PageAction } from "@/core/ui/page-action";
import { useEffect, useMemo } from "react";
import Timestamp from "@/core/ui/timestamp";
import {
  applyTaskChangeScalars,
  hydrateAndInsertAgentTask,
} from "../lib/taskCache";
import MaterializedBlokById from "../components/MaterializedBlokById";
import AgentImplementationCard from "../components/cards/AgentImplementationCard";
import AgentTaskCard from "../components/cards/AgentTaskCard";
import { AgentFacts } from "../sidebars/AgentInfoSidebar";
import { AgentTasksSidebar } from "../sidebars/AgentTasksSidebar";
import { REKUEST_HELP } from "../help";
import { agentPanelLink } from "./agent/AgentPanelPage";

export const PinAgent = (props: { agent: AgentFragment }) => {
  const [pin] = usePinAgentMutation({ refetchQueries: ["Pinned"] });

  return (
    <Button
      variant={props.agent.pinned ? "default" : "outline"}
      size="sm"
      onClick={() => {
        pin({
          variables: {
            input: { id: props.agent.id, pin: !props.agent.pinned },
          },
        }).catch(reportErrorAs(props.agent.pinned ? "Couldn't unpin the agent" : "Couldn't pin the agent"));
      }}
    >
      {props.agent.pinned ? (
        <>
          <PinOff className="h-4 w-4 mr-2" />
          Unpin
        </>
      ) : (
        <>
          <Pin className="h-4 w-4 mr-2" />
          Pin
        </>
      )}
    </Button>
  );
};

export const BounceAgentButton = (props: { agent: AgentFragment }) => {
  const [bounce] = useBounceMutation();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        bounce({
          variables: {
            input: { agent: props.agent.id },
          },
        }).catch(reportErrorAs("Couldn't bounce the agent"));
      }}
    >
      Bounce
    </Button>
  );
};


const NO_PANELS: ListMaterializedBlokFragment[] = [];

/**
 * The agent's bloks the page shows, read once: its default blok for the scene
 * context, if it declared one, and its panels (what it brings to control it,
 * linked from the title bar).
 * `settled` is false until that is known, so no other scene is mounted first.
 */
const useAgentBloks = (agent: string) => {
  const { data, loading } = useListMaterializedBloksQuery({
    variables: {
      filters: { agent, contexts: [ComponentContext.Scene, ComponentContext.Panel] },
    },
  });
  const bloks = data?.materializedBloks;
  const scene = bloks?.find(
    (blok) => blok.isDefault && blok.blok.context === ComponentContext.Scene,
  )?.id;
  const panels = useMemo(
    () =>
      bloks
        ?.filter((blok) => blok.blok.context === ComponentContext.Panel)
        // The default one first, as the one most likely wanted.
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault)) ?? NO_PANELS,
    [bloks],
  );
  return { scene, panels, settled: !!data || !loading };
};

/**
 * The agent's default scene, on the right of the page, starting just inside
 * the content column (620px wide). It has no backdrop of its own: the scene
 * draws on a clear canvas, so the model and its ground grid stand directly on
 * the page's background, in either theme. Its left edge fades into the backdrop
 * of the lists over a short stretch, so the two meet without a seam.
 */
const AgentBackgroundScene = (props: { materializedBlok: string }) => (
  <div className="absolute inset-y-0 right-0 left-[min(540px,45%)] z-0">
    <MaterializedBlokById
      key={props.materializedBlok}
      materializedBlokId={props.materializedBlok}
      surfaceId={props.materializedBlok}
      chrome="none"
    />
    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-linear-to-r from-background to-transparent" />
  </div>
);

export const AgentPage = asDetailQueryRoute(
  useAgentQuery,
  ({ data, subscribeToMore }) => {
    useEffect(() => {
      return subscribeToMore<
        WatchImplementationsSubscription,
        WatchImplementationsSubscriptionVariables
      >({
        document: WatchImplementationsDocument,
        variables: { agent: data.agent.id },
        updateQuery: (prev, { subscriptionData }) => {
          if (!subscriptionData.data) return prev;
          const create = subscriptionData.data.implementations.create;
          const update = subscriptionData.data.implementations.update;
          const remove = subscriptionData.data.implementations.delete;
          if (create) {
            return {
              agent: {
                ...prev.agent,
                implementations: [...prev.agent.implementations, create],
              },
            };
          }
          if (update) {
            return {
              agent: {
                ...prev.agent,
                implementations: prev.agent.implementations.map((x) =>
                  x.id == update.id ? update : x,
                ),
              },
            };
          }
          if (remove) {
            return {
              agent: {
                ...prev.agent,
                implementations: prev.agent.implementations.filter((x) => x.id != remove),
              },
            };
          }
          return prev;
        },
      });
    }, [subscribeToMore, data.agent.id]);

    // The agent's tasks over the window's session (`agent:<id>/tasks`): thin
    // `TaskChange` deltas; a create is hydrated, an update merged into the cache,
    // exactly like the global `TaskUpdater`.
    const client = useRekuest();
    const agentId = data.agent.id;

    const session = useRekuestSession();

    useEffect(() => {
      if (!client) return undefined;

      const onChange = (change: {
        create?: TaskChangeFragment | null;
        update?: TaskChangeFragment | null;
      }) => {
        // An update merges onto the normalized `Task:<id>` entity, which is
        // what the list rows read — so they refresh in place.
        if (change.update) {
          applyTaskChangeScalars(client, change.update);
        }
        if (change.create) {
          void hydrateAndInsertAgentTask(client, change.create, agentId);
        }
      };

      return session.watch(`agent:${agentId}/tasks`, {
        onData: (item) => {
          const change = item as { create?: WireTaskChange | null; update?: WireTaskChange | null };
          onChange({
            create: change.create ? toTaskChange(change.create) : null,
            update: change.update ? toTaskChange(change.update) : null,
          });
        },
        onResync: (snapshot, reason) => {
          if (reason === "new") return;
          // Back after a drop: its tasks as they are now (newest first); one it
          // started meanwhile joins the list.
          for (const row of (snapshot as ListSnapshot<WireTaskChange>).rows ?? []) {
            const change = toTaskChange(row);
            applyTaskChangeScalars(client, change);
            void hydrateAndInsertAgentTask(client, change, agentId);
          }
        },
      });
    }, [client, agentId, session]);

    const recentTasks = data.agent.tasks.slice(0, 5);
    const bloks = useAgentBloks(agentId);
    const blokDebug = useBlokDebugTab();

    return (
     <BlokDebugTab.Scope scope={blokDebug.scope}>
      <RekuestAgent.ModelPage
        title={data.agent.name}
        help={REKUEST_HELP.agent}
        object={data.agent}
        // The breadcrumb reads the agent's name, not its number.
        crumbs={{ [data.agent.id]: data.agent.name }}
        sidebars={
          <Sidebars sidebarKey="AgentDetail" defaultTab="Info">
            <Sidebars.Tab label="Info">
              <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
                <AgentFacts agent={data.agent} />
              </div>
            </Sidebars.Tab>
            <Sidebars.Tab label="Knowledge">
              <RekuestAgent.Knowledge object={data?.agent} />
            </Sidebars.Tab>
            <Sidebars.Tab label="Tasks">
              <AgentTasksSidebar agent={data.agent.id} />
            </Sidebars.Tab>
            {blokDebug.enabled && (
              <Sidebars.Tab label="Debug">
                <BlokDebugTab scope={blokDebug.scope} />
              </Sidebars.Tab>
            )}
          </Sidebars>
        }
        pageActions={
          <>
            {/* What other apps offer on this agent, its supervisor's stop / start /
                restart under "Supervisor" (the structure carries @rekuest/supervisor). */}
            <ObjectButton objects={[agentStructure(data.agent)]} />
            {/* The panels the agent brings to control it, each on its own page. */}
            {bloks.panels.map((panel) => (
              <PageAction
                key={panel.id}
                asChild
                size="sm"
                collapse="icon"
                icon={<LayoutPanelTop className="h-4 w-4" />}
                menuLabel={panel.name || panel.blok.name}
              >
                <Link
                  to={agentPanelLink(agentId, panel.id)}
                  title={panel.description ?? panel.blok.description ?? undefined}
                >
                  {panel.name || panel.blok.name}
                </Link>
              </PageAction>
            ))}
            <PinAgent agent={data.agent} />
            <BounceAgentButton agent={data.agent} />
            {/* The agent's tasks, states and bloks pages and its Python
                protocol are in the Info tab, to keep the header short. */}
          </>
        }
      >
        <div className="relative h-full w-full overflow-hidden">


          {bloks.scene && <AgentBackgroundScene materializedBlok={bloks.scene} />}

          <div className="absolute inset-y-0 left-0 z-20 flex w-full max-w-[620px] items-stretch">
            <div className="flex w-full flex-col justify-between gap-6 p-6">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <AgentLogo agent={data.agent} className="h-10 w-10 lg:h-12 lg:w-12" />
                  <RekuestAgent.DetailLink object={data.agent}>
                    <h1 className="scroll-m-20 text-2xl font-bold tracking-tight transition-colors hover:text-primary lg:text-4xl cursor-pointer">
                      {data.agent.name}
                    </h1>
                  </RekuestAgent.DetailLink>
                </div>

                <div className="grid grid-cols-3 gap-1  ">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          data.agent.connected
                            ? "bg-success shadow-[0_0_14px_var(--success)]"
                            : "bg-destructive shadow-[0_0_14px_var(--destructive)]",
                        )}
                      />
                      <span className="text-lg font-semibold">
                        {data.agent.connected ? "Online" : "Offline"}
                      </span>
                      <div className="font-light text-sm">
                      <Timestamp date={data.agent.lastSeen} relative />
                      </div>
                                       </div>
                    {(data.agent.active !== data.agent.connected ||
                      data.agent.blocked ||
                      data.agent.supervisor) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {data.agent.active !== data.agent.connected && (
                          <Badge variant="outline" className="text-xs">
                            Mismatch
                          </Badge>
                        )}
                        {data.agent.blocked && (
                          <Badge variant="destructive" className="text-xs">
                            Blocked
                          </Badge>
                        )}
                        {data.agent.supervisor && (
                          <Badge
                            variant="secondary"
                            className="text-xs"
                            title="Self-declared by the agent; its supervisor checks before acting on it"
                          >
                            Supervised by {data.agent.supervisor}
                          </Badge>
                        )}
                      </div>
                    )}


                </div>
              </div>


        <div className="mt-4 flex flex-col gap-4 min-h-0 flex-1">
          {/* What other modules show about this agent, given the app instance
              it runs as. Nothing does for now: its live streams are not shown
              here by choice. */}
          <PageSections
            placement="main"
            identifier="@rekuest/agent"
            object={{ id: data.agent.id, clientId: data.agent.client.clientId, userSub: data.agent.user.sub }}
          />
          <div className="flex-1 min-h-0 overflow-y-auto">
            <VerticalListRender
              title={
                <RekuestAgent.DetailLink object={data.agent} subroute="actions" className="hover:underline">
                  Actions
                </RekuestAgent.DetailLink>
              }
              array={data.agent.implementations}
            >
              {(item) => <AgentImplementationCard key={item.id} item={item} />}
            </VerticalListRender>
          </div>

          <div className="shrink-0">
            <VerticalListRender
              title={
                <RekuestAgent.DetailLink object={data.agent} subroute="tasks" className="hover:underline">
                  Recent Tasks
                </RekuestAgent.DetailLink>
              }
              array={recentTasks}
            >
              {(item) => <AgentTaskCard key={item.id} item={item} />}
            </VerticalListRender>
          </div>
        </div>
              </div>
            </div>

        </div>

      </RekuestAgent.ModelPage>
     </BlokDebugTab.Scope>
    );
  },
);


export default AgentPage;
