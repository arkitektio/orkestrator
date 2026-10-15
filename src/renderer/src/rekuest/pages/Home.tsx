import { ListRender } from "@/core/layout/ListRender";
import { PageLayout } from "@/core/layout/PageLayout";
import { Sidebars } from "@/core/layout/Sidebars";
import { HelpSidebar } from "@/core/layout/help";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { HomeSectionHeading, ModuleHome } from "@/core/layout/ModuleHome";
import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import {
  ActionLabel,
  ActionTrigger,
  PageAction,
  PageActionPolicy,
} from "@/core/ui/page-action";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/core/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/core/ui/empty";
import { parseAsBoolean, parseAsString, useQueryState } from "@/core/util/hooks/use-search-param-state";
import { RekuestAgent } from "@/core/linkers";
import { useStructureOptionList } from "@/core/modules/hooks/useStructureOptions";
import { useSelf } from "@/core/connection/useSelf";
import { AgentKind, ListAgentFragment, Ordering, useAgentsQuery } from "@/rekuest/api/graphql";
import AgentCard from "@/rekuest/components/cards/AgentCard";
import MaterializedBlokList from "@/rekuest/components/lists/MaterializedBlokList";
import TaskList from "@/rekuest/components/lists/TaskList";
import { Filter, Loader2, Podcast, Wifi, X } from "lucide-react";
import { useMemo } from "react";
import { OrgTasksUpdater } from "../components/updaters/OrgTasksUpdater";
import { HomePageStatisticsSidebar } from "../sidebars/HomePageStatisticsSidebar";
import { REKUEST_HELP } from "../help";

const ALL = "__all__";
/** Radio value of the default "mine" choice; the URL just omits `user`. */
const MINE = "__mine__";

/**
 * `user` and `kind` have a default that is NOT "everything": null means the
 * signed-in user's agents / the non-hook ones, and `ALL` lifts the filter.
 */
type Filters = {
  user: string | null;
  app: string | null;
  device: string | null;
  kind: string | null;
};

const DEFAULT_KIND = AgentKind.Websocket;
const KIND_LABELS: Record<AgentKind, string> = {
  [AgentKind.Websocket]: "Apps",
  [AgentKind.Webhook]: "Webhooks",
};

/**
 * One dropdown for every agent filter (type / user / app / device). The
 * active selections are echoed as badges on the trigger so the reader always
 * knows why the grid looks the way it does.
 */
const FilterMenu = ({
  filters,
  onChange,
}: PageActionPolicy & {
  filters: Filters;
  onChange: (next: Partial<Filters>) => void;
}) => {
  // Lok's users, apps and devices, answered by lok (its option sources).
  const users = useStructureOptionList("@lok/user");
  const apps = useStructureOptionList("@lok/app", "identifier");
  const devices = useStructureOptionList("@lok/device", "nodeId");

  const userLabel =
    filters.user === ALL
      ? "Everyone"
      : filters.user === null
        ? "Mine"
        : (users.find((u) => u.value === filters.user)?.label ?? filters.user);
  const deviceLabel = devices.find((d) => d.value === filters.device)?.label;
  const kindLabel =
    filters.kind === ALL ? "All" : KIND_LABELS[(filters.kind as AgentKind | null) ?? DEFAULT_KIND];
  // Only what departs from the defaults counts as an active filter.
  const active = [filters.user, filters.app, filters.device, filters.kind].filter(Boolean).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ActionTrigger aria-label="Filter">
          <Filter className="h-4 w-4" />
          <ActionLabel>
            Filter
            {active > 0 && <Badge variant="secondary">{active}</Badge>}
          </ActionLabel>
        </ActionTrigger>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Show apps</DropdownMenuLabel>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span className="flex-1">By type</span>
            <span className="ml-2 max-w-24 truncate text-xs text-muted-foreground">
              {kindLabel}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={filters.kind ?? DEFAULT_KIND}
              onValueChange={(v) => onChange({ kind: v === DEFAULT_KIND ? null : v })}
            >
              <DropdownMenuRadioItem value={AgentKind.Websocket}>
                {KIND_LABELS[AgentKind.Websocket]}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value={AgentKind.Webhook}>
                {KIND_LABELS[AgentKind.Webhook]}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value={ALL}>All types</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span className="flex-1">By app</span>
            {filters.app && (
              <span className="ml-2 max-w-24 truncate text-xs text-muted-foreground">
                {filters.app}
              </span>
            )}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
            <DropdownMenuRadioGroup
              value={filters.app ?? ALL}
              onValueChange={(v) => onChange({ app: v === ALL ? null : v })}
            >
              <DropdownMenuRadioItem value={ALL}>All apps</DropdownMenuRadioItem>
              {apps.map((a) => (
                <DropdownMenuRadioItem key={a.value} value={a.value}>
                  {a.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span className="flex-1">By user</span>
            <span className="ml-2 max-w-24 truncate text-xs text-muted-foreground">
              {userLabel}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
            <DropdownMenuRadioGroup
              value={filters.user ?? MINE}
              onValueChange={(v) => onChange({ user: v === MINE ? null : v })}
            >
              <DropdownMenuRadioItem value={MINE}>Mine</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value={ALL}>All users</DropdownMenuRadioItem>
              {users.map((u) => (
                <DropdownMenuRadioItem key={u.value} value={u.value}>
                  {u.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span className="flex-1">By device</span>
            {filters.device && (
              <span className="ml-2 max-w-24 truncate text-xs text-muted-foreground">
                {deviceLabel ?? filters.device}
              </span>
            )}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
            <DropdownMenuRadioGroup
              value={filters.device ?? ALL}
              onValueChange={(v) => onChange({ device: v === ALL ? null : v })}
            >
              <DropdownMenuRadioItem value={ALL}>All devices</DropdownMenuRadioItem>
              {devices.map((d) => (
                <DropdownMenuRadioItem key={d.value} value={d.value}>
                  {d.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {active > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-muted-foreground"
              onSelect={() => onChange({ user: null, app: null, device: null, kind: null })}
            >
              Clear filters
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/** Live apps first, then recently active ones, then everything else by recency. */
const rank = (a: ListAgentFragment) => (a.blocked ? 3 : a.connected ? 0 : a.active ? 1 : 2);
const sortAgents = (agents: ListAgentFragment[]) =>
  [...agents].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    const at = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
    const bt = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
    return bt - at;
  });

const Page = () => {
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [user, setUser] = useQueryState("user", parseAsString);
  const [app, setApp] = useQueryState("app", parseAsString);
  const [device, setDevice] = useQueryState("device", parseAsString);
  const [kind, setKind] = useQueryState("kind", parseAsString);
  const [onlineOnly, setOnlineOnly] = useQueryState("online", parseAsBoolean.withDefault(false));

  const filters: Filters = { user, app, device, kind };
  const setFilters = (next: Partial<Filters>) => {
    if ("user" in next) setUser(next.user ?? null);
    if ("app" in next) setApp(next.app ?? null);
    if ("device" in next) setDevice(next.device ?? null);
    if ("kind" in next) setKind(next.kind ?? null);
  };
  const hasFilter = Boolean(search || user || app || device || kind || onlineOnly);

  // No `user` in the URL means the signed-in user's own agents.
  const { userId } = useSelf();
  const userFilter = user === ALL ? null : (user ?? userId);
  const kindFilter = kind === ALL ? null : (kind ?? DEFAULT_KIND);

  const { data, error, refetch } = useAgentsQuery({
    variables: {
      filters: {
        search: search.trim() || undefined,
        user: userFilter ?? undefined,
        appIdentifier: app ?? undefined,
        deviceId: device ?? undefined,
      },
      ordering: [{ lastSeen: Ordering.Desc }],
    },
    // "Mine" before the identity is known would list everyone's agents.
    skip: user === null && !userId,
  });

  // The server has no kind filter, and a newly connected agent is inserted
  // into every cached `agents(...)` list (AgentUpdater), so both the type and
  // the user are narrowed here too.
  const visible = useMemo(
    () =>
      (data?.agents ?? []).filter(
        (a) =>
          (!kindFilter || a.kind === kindFilter) && (!userFilter || a.user.sub === userFilter),
      ),
    [data, kindFilter, userFilter],
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
      pageActions={
        <>
          <CollapsibleSearch
            alwaysShow
            value={search}
            onChange={(value) => setSearch(value || null)}
            placeholder="Search apps…"
          />
          <PageAction
            priority={10}
            collapse="icon"
            icon={<Wifi className="h-4 w-4" />}
            menuLabel="Online"
            variant={onlineOnly ? "default" : "outline"}
            className="gap-2"
            onClick={() => setOnlineOnly(onlineOnly ? null : true)}
            aria-pressed={onlineOnly}
          >
            Online
            {onlineCount > 0 && (
              <Badge variant={onlineOnly ? "outline" : "secondary"}>{onlineCount}</Badge>
            )}
          </PageAction>
          <FilterMenu collapse="icon" filters={filters} onChange={setFilters} />
        </>
      }
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Statistics">
            <HomePageStatisticsSidebar />
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
  
            {loaded && agents.length === 0 ? (
              <Empty className="border py-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Podcast />
                  </EmptyMedia>
                  <EmptyTitle>
                    {hasFilter ? "No apps match your filters" : "No apps connected yet"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {hasFilter
                      ? "Try a different search or clear the active filters."
                      : "Start an Arkitekt app and log it into this instance. It will show up here as soon as it connects. Apps of other users and webhooks are under Filter."}
                  </EmptyDescription>
                </EmptyHeader>
                {hasFilter && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setSearch(null);
                      setOnlineOnly(null);
                      setFilters({ user: null, app: null, device: null, kind: null });
                    }}
                  >
                    <X className="h-4 w-4" />
                    Clear filters
                  </Button>
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

        <section>
          <MaterializedBlokList pagination={{ limit: 12 }} />
        </section>

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
