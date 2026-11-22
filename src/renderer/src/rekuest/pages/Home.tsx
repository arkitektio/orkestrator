import { CARD_FRAME_MIN_WIDTH } from "@/core/ui/card-frame";
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
import {
  AgentFilter,
  ListAgentFragment,
  Ordering,
  useAgentCountsQuery,
  useAgentsQuery,
} from "@/rekuest/api/graphql";
import AgentCard from "@/rekuest/components/cards/AgentCard";
import TaskList from "@/rekuest/components/lists/TaskList";
import { Loader2, Podcast } from "lucide-react";
import { useMemo } from "react";
import { AgentFilterBar, useAgentFilters } from "../components/home/AgentFilters";
import { PinnedSection } from "../components/home/PinnedSection";
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

/** How many finished tasks the home shows under the ongoing ones. */
const RECENTLY_FINISHED = 3;

const Page = () => {
  const filters = useAgentFilters();
  const { search, user: userFilter, kind: kindFilter, app, device, supervisor, onlineOnly } = filters.resolved;
  const hasFilter = filters.active;

  // Everything but "online" narrows the counts too: "N online · M total" is
  // over the apps the other filters leave.
  const base: AgentFilter = {
    search: search || undefined,
    user: userFilter ?? undefined,
    kind: kindFilter ?? undefined,
    appIdentifier: app ?? undefined,
    deviceId: device ?? undefined,
    supervisor: supervisor ?? undefined,
  };

  const { data, error, refetch } = useAgentsQuery({
    variables: {
      filters: onlineOnly ? { ...base, connected: true } : base,
      ordering: [{ lastSeen: Ordering.Desc }],
    },
    skip: filters.pending,
  });
  const { data: counts } = useAgentCountsQuery({
    variables: { filters: base, online: { ...base, connected: true } },
    skip: filters.pending,
  });

  // The server answers every filter. Only what changed since is checked here:
  // AgentUpdater inserts a new agent into every cached `agents(...)` list and
  // flips `connected` in place, so a row that no longer fits leaves at once.
  const agents = useMemo(
    () =>
      sortAgents(
        (data?.agents ?? []).filter(
          (a) =>
            (!kindFilter || a.kind === kindFilter) &&
            (!userFilter || a.user.sub === userFilter) &&
            (!supervisor || a.supervisor === supervisor) &&
            (!onlineOnly || a.connected),
        ),
      ),
    [data, kindFilter, userFilter, supervisor, onlineOnly],
  );
  const onlineCount = counts?.online.count ?? 0;
  const totalCount = counts?.total.count ?? 0;
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
                {counts && (
                  <span>
                    <span className="font-semibold text-foreground">{onlineCount}</span> online ·{" "}
                    <span className="font-semibold text-foreground">{totalCount}</span> total
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
                      : totalCount > 0
                        ? "None of your apps is online"
                        : "No apps connected yet"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {hasFilter
                      ? "Try a different search or clear the active filters."
                      : totalCount > 0
                        ? "Only online apps are listed. Turn Online off to see the ones that are not reachable right now."
                        : "Start an Arkitekt app and log it into this instance. It will show up here as soon as it connects. Apps of other users and webhooks are in the filter row."}
                  </EmptyDescription>
                </EmptyHeader>
                {hasFilter ? (
                  <FilterClear onClear={filters.clear} />
                ) : (
                  totalCount > 0 && (
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
                minItemWidth={CARD_FRAME_MIN_WIDTH}
              >
                {(agent) => <AgentCard key={agent.id} item={agent} />}
              </ListRender>
            )}
          </section>
        }
      >

        {/* What is running now, then only the last few that finished (failed
            ones included, they are what wants noticing); the whole history is
            the Tasks page, a click on either title. A section with nothing in
            it is not drawn. */}
        <PinnedSection />
        <section className="space-y-6">
          <TaskList
            title={
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Ongoing tasks
              </span>
            }
            filters={{ isDone: false, rootIsnull: true }}
            order={{ createdAt: Ordering.Desc }}
            pagination={{ limit: 24 }}
          />
          <TaskList
            title="Recently finished"
            filters={{ isDone: true, rootIsnull: true }}
            order={{ createdAt: Ordering.Desc }}
            pagination={{ limit: RECENTLY_FINISHED }}
          />
        </section>

      </ModuleHome>
    </PageLayout>
  );
};

export default Page;
