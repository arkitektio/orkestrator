import { ListRender } from "@/core/layout/ListRender";
import { PageLayout } from "@/core/layout/PageLayout";
import { Sidebars } from "@/core/layout/Sidebars";
import { HelpSidebar } from "@/core/layout/help";
import { HomeSectionHeading, ModuleHome } from "@/core/layout/ModuleHome";
import { Button } from "@/core/ui/button";
import { FilterClear } from "@/core/ui/filter-bar";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/core/ui/empty";
import { RekuestAgent } from "@/core/linkers";
import { ListAgentFragment, Ordering, useAgentsQuery } from "@/rekuest/api/graphql";
import AgentCard from "@/rekuest/components/cards/AgentCard";
import TaskList from "@/rekuest/components/lists/TaskList";
import { Loader2, Podcast } from "lucide-react";
import { useMemo } from "react";
import { AgentFilterBar, useAgentFilters } from "../components/home/AgentFilters";
import { OrgTasksUpdater } from "../components/updaters/OrgTasksUpdater";
import { HomeOverviewSidebar } from "../sidebars/HomeOverviewSidebar";
import { REKUEST_HELP } from "../help";

/**
 * Live apps first, then recently active ones, then the rest; by name within
 * each. Never by `lastSeen`: it moves with every heartbeat, so the rows would
 * keep changing places. A row only moves when its agent's status does.
 */
const rank = (a: ListAgentFragment) => (a.blocked ? 3 : a.connected ? 0 : a.active ? 1 : 2);
const sortAgents = (agents: ListAgentFragment[]) =>
  [...agents].sort(
    (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  );

const Page = () => {
  const filters = useAgentFilters();
  const { search, user: userFilter, kind: kindFilter, app, device, supervisor, onlineOnly } = filters.resolved;
  const hasFilter = filters.active;

  const { data, error, refetch } = useAgentsQuery({
    variables: {
      filters: {
        search: search || undefined,
        user: userFilter ?? undefined,
        appIdentifier: app ?? undefined,
        deviceId: device ?? undefined,
        supervisor: supervisor ?? undefined,
      },
      ordering: [{ lastSeen: Ordering.Desc }],
    },
    skip: filters.pending,
  });

  // The server has no kind filter, and a newly connected agent is inserted
  // into every cached `agents(...)` list (AgentUpdater), so the type, the user
  // and the supervisor are narrowed here too.
  const visible = useMemo(
    () =>
      (data?.agents ?? []).filter(
        (a) =>
          (!kindFilter || a.kind === kindFilter) &&
          (!userFilter || a.user.sub === userFilter) &&
          (!supervisor || a.supervisor === supervisor),
      ),
    [data, kindFilter, userFilter, supervisor],
  );
  const agents = useMemo(() => {
    const all = sortAgents(visible);
    return onlineOnly ? all.filter((a) => a.connected) : all;
  }, [visible, onlineOnly]);
  const onlineCount = visible.filter((a) => a.connected).length;
  const loaded = data !== undefined;

  return (
    <PageLayout
      title="Rekuest"
      help={REKUEST_HELP.home}
      sidebars={
        <Sidebars defaultTab="Overview">
          {/* rekuest's pages live here, with their numbers, so the stage is the apps and tasks. */}
          <Sidebars.Tab label="Overview">
            <HomeOverviewSidebar />
          </Sidebars.Tab>
          <Sidebars.Tab label="Help">
            <HelpSidebar />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <OrgTasksUpdater />
      <ModuleHome
        moduleKey="rekuest"
        title="Rekuest"
        pages={false}
        description="Run what your apps can do: actions, tasks and the apps that carry them out."
        // The apps come first: what is connected is what can run anything.
        lead={
          <section>
            <HomeSectionHeading className="justify-between">
              <span>Your apps</span>
              <span className="flex items-center gap-2 font-normal normal-case tracking-normal">
                {loaded && (
                  <span>
                    <span className="font-semibold text-foreground">{onlineCount}</span> online ·{" "}
                    <span className="font-semibold text-foreground">{visible.length}</span> total
                  </span>
                )}
                <RekuestAgent.ListLink className="hover:text-foreground">All agents →</RekuestAgent.ListLink>
              </span>
            </HomeSectionHeading>
            {/* The filter row belongs to the grid it narrows, not to the page. */}
            <div className="mb-3">
              <AgentFilterBar filters={filters} onlineCount={onlineCount} />
            </div>
  
            {loaded && agents.length === 0 ? (
              <Empty className="border py-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Podcast />
                  </EmptyMedia>
                  <EmptyTitle>
                    {hasFilter
                      ? "No apps match your filters"
                      : visible.length > 0
                        ? "None of your apps is online"
                        : "No apps connected yet"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {hasFilter
                      ? "Try a different search or clear the active filters."
                      : visible.length > 0
                        ? "Only online apps are listed. Turn Online off to see the ones that are not reachable right now."
                        : "Start an Arkitekt app and log it into this instance. It will show up here as soon as it connects. Apps of other users and webhooks are in the filter row."}
                  </EmptyDescription>
                </EmptyHeader>
                {hasFilter ? (
                  <FilterClear onClear={filters.clear} />
                ) : (
                  visible.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => filters.setOnlineOnly(false)}>
                      Show offline apps
                    </Button>
                  )
                )}
              </Empty>
            ) : (
              <ListRender
                array={loaded ? agents : undefined}
                refetch={refetch}
                error={error}
                limit={40}
              >
                {(agent) => <AgentCard key={agent.id} item={agent} />}
              </ListRender>
            )}
          </section>
        }
      >

        <section className="space-y-6">
          <TaskList
            title={
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Ongoing Tasks
              </span>
            }
            filters={{ isDone: false, rootIsnull: true }}
            order={{ createdAt: Ordering.Desc }}
          />
          <TaskList
            filters={{ rootIsnull: true }}
            order={{ createdAt: Ordering.Desc }}
            pagination={{ limit: 5 }}
          />
        </section>

      </ModuleHome>
    </PageLayout>
  );
};

export default Page;
