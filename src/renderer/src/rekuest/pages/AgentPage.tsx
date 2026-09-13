import { useRekuest } from "@/app/Arkitekt";
import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { VerticalListRender } from "@/components/layout/VerticalListRender";
import { Sidebars } from "@/components/layout/Sidebars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RekuestAgent, RekuestState } from "@/linkers";
import {
  AgentFragment,
  useAgentQuery,
  useBounceMutation,
  usePinAgentMutation,
  WatchImplementationsDocument,
  WatchImplementationsSubscription,
  WatchImplementationsSubscriptionVariables,
  WatchAgentTasksDocument,
  WatchAgentTasksSubscription,
  WatchAgentTasksSubscriptionVariables,
} from "@/rekuest/api/graphql";
import { Pin, PinOff } from "lucide-react";
import { useEffect } from "react";
import Timestamp from "@/components/ui/timestamp";
import {
  applyTaskChangeScalars,
  hydrateAndInsertAgentTask,
} from "../lib/taskCache";
import { AgentHeroScene } from "../components/AgentHeroScene";
import { CopyAgentPythonButton } from "../components/copy-agent-python";
import AgentImplementationCard from "../components/cards/AgentImplementationCard";
import AgentTaskCard from "../components/cards/AgentTaskCard";
import { AgentTasksSidebar } from "../sidebars/AgentTasksSidebar";

export const PinAgent = (props: { agent: AgentFragment }) => {
  const [pin] = usePinAgentMutation();

  return (
    <Button
      variant={props.agent.pinned ? "default" : "outline"}
      size="sm"
      onClick={() => {
        pin({
          variables: {
            input: { id: props.agent.id, pin: !props.agent.pinned },
          },
        });
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
        });
      }}
    >
      Bounce
    </Button>
  );
};




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

    // `agentTasks` streams thin, non-traversable `TaskChange` deltas (scalar ids
    // only), so this cannot go through `subscribeToMore` — a create has to be
    // hydrated, and `updateQuery` is synchronous. Subscribe directly and merge
    // into the cache, exactly like the global `TaskUpdater`.
    const client = useRekuest();
    const agentId = data.agent.id;

    useEffect(() => {
      if (!client) return undefined;

      const subscription = client
        .subscribe<
          WatchAgentTasksSubscription,
          WatchAgentTasksSubscriptionVariables
        >({
          query: WatchAgentTasksDocument,
          variables: { agent: agentId },
        })
        .subscribe((res) => {
          const change = res.data?.agentTasks;
          if (!change) return;

          // An update merges onto the normalized `Task:<id>` entity, which is
          // what the list rows read — so they refresh in place.
          if (change.update) {
            applyTaskChangeScalars(client, change.update);
          }

          if (change.create) {
            void hydrateAndInsertAgentTask(client, change.create, agentId);
          }
        });

      return () => subscription.unsubscribe();
    }, [client, agentId]);

    const recentTasks = data.agent.tasks.slice(0, 5);

    return (
      <RekuestAgent.ModelPage
        title={data.agent.name}
        object={data.agent}
        variant={"black"}
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <RekuestAgent.Knowledge object={data?.agent} />
            </Sidebars.Tab>
            <Sidebars.Tab label="States">
              <>
                {/* States Section */}
                {data.agent.states.length > 0 && (
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Agent States
                    </h3>
                    <div className="space-y-3">
                      {data.agent.states.map((state) => (
                        <RekuestState.DetailLink object={state} key={state.id}>
                          <Button variant="outline" size="sm">
                            {state.id}
                          </Button>
                        </RekuestState.DetailLink>
                      ))}
                    </div>
                  </div>
                )}
              </>
            </Sidebars.Tab>
            <Sidebars.Tab label="Tasks">
              <AgentTasksSidebar agent={data.agent.id} />
            </Sidebars.Tab>
          </Sidebars>
        }
        pageActions={
          <>
            <PinAgent agent={data.agent} />
            <BounceAgentButton agent={data.agent} />
            <CopyAgentPythonButton agent={data.agent} />
                        <RekuestAgent.DetailLink
                          object={data?.agent}
                          subroute="states"
                          className="font-semibold"
                        >
                          <Button
                            variant={"outline"}
                            size={"sm"}
                          >
                            States
                          </Button>
                        </RekuestAgent.DetailLink>
                        <RekuestAgent.DetailLink
                          object={data?.agent}
                          subroute="tasks"
                          className="font-semibold"
                        >
                          <Button
                            variant={"outline"}
                            size={"sm"}
                          >
                            Tasks
                          </Button>
                        </RekuestAgent.DetailLink>
                        <RekuestAgent.DetailLink
                          object={data?.agent}
                          subroute="bloks"
                          className="font-semibold"
                        >
                          <Button
                            variant={"outline"}
                            size={"sm"}
                          >
                            Bloks
                          </Button>
                        </RekuestAgent.DetailLink>
          </>
        }
      >
        <div className="relative h-full w-full overflow-hidden  shadow-[0_30px_120px_-48px_rgba(15,23,42,0.55)]">


          <div>
            {data.agent.placements.map((plc) => (
              <>{plc.model?.file && <AgentHeroScene placement={plc} />}</>

            ))}

          </div>

          <div className="absolute inset-y-0 left-0 z-20 flex w-full max-w-[620px] items-stretch">
            <div className="flex w-full flex-col justify-between gap-6 p-6">
              <div className="space-y-1">
                <div className="space-y-4">
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
                            ? "bg-green-500 shadow-[0_0_14px_rgba(34,197,94,0.75)]"
                            : "bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.75)]",
                        )}
                      />
                      <span className="text-lg font-semibold">
                        {data.agent.connected ? "Online" : "Offline"}
                      </span>
                      <div className="font-light text-sm">
                      <Timestamp date={data.agent.lastSeen} relative />
                      </div>
                                       </div>
                    {(data.agent.active !== data.agent.connected || data.agent.blocked) && (
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
                      </div>
                    )}


                </div>
              </div>


        <div className="mt-4 flex flex-col gap-4 min-h-0 flex-1">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <VerticalListRender title="Actions" array={data.agent.implementations}>
              {(item) => <AgentImplementationCard key={item.id} item={item} />}
            </VerticalListRender>
          </div>

          <div className="shrink-0">
            <VerticalListRender title="Recent Tasks" array={recentTasks}>
              {(item) => <AgentTaskCard key={item.id} item={item} />}
            </VerticalListRender>
          </div>
        </div>
              </div>
            </div>

        </div>

      </RekuestAgent.ModelPage>
    );
  },
);


export default AgentPage;
