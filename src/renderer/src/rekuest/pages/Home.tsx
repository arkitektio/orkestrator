import { ListRender } from "@/core/components/layout/ListRender";
import { PageLayout } from "@/core/components/layout/PageLayout";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { HelpSidebar } from "@/core/components/sidebars/help";
import { Badge } from "@/core/components/ui/badge";
import { Button, buttonVariants } from "@/core/components/ui/button";
import { CollapsibleSearch } from "@/core/components/ui/collapsible-search";
import {
  ActionLabel,
  ActionTrigger,
  PageAction,
  PageActionPolicy,
} from "@/core/components/ui/page-action";
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
} from "@/core/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/core/components/ui/empty";
import { parseAsBoolean, parseAsString, useQueryState } from "@/core/hooks/use-search-param-state";
import { RekuestAgent } from "@/core/linkers";
import { useStructureOptionList } from "@/core/modules/hooks/useStructureOptions";
import { ListAgentFragment, Ordering, useAgentsQuery } from "@/rekuest/api/graphql";
import AgentCard from "@/rekuest/components/cards/AgentCard";
import ActionList from "@/rekuest/components/lists/ActionList";
import TaskList from "@/rekuest/components/lists/TaskList";
import { Filter, Loader2, Podcast, Wifi, X } from "lucide-react";
import { useMemo } from "react";
import { OrgTasksUpdater } from "../components/updaters/OrgTasksUpdater";
import { HomePageStatisticsSidebar } from "../sidebars/HomePageStatisticsSidebar";

const ALL = "__all__";

type Filters = {
  user: string | null;
  app: string | null;
  device: string | null;
};

/**
 * One dropdown for every server-side agent filter (user / app / device). The
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

  const userLabel = users.find((u) => u.value === filters.user)?.label;
  const deviceLabel = devices.find((d) => d.value === filters.device)?.label;
  const active = [filters.user, filters.app, filters.device].filter(Boolean).length;

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
            {userLabel && (
              <span className="ml-2 max-w-24 truncate text-xs text-muted-foreground">
                {userLabel}
              </span>
            )}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
            <DropdownMenuRadioGroup
              value={filters.user ?? ALL}
              onValueChange={(v) => onChange({ user: v === ALL ? null : v })}
            >
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
              onSelect={() => onChange({ user: null, app: null, device: null })}
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
  const [onlineOnly, setOnlineOnly] = useQueryState("online", parseAsBoolean.withDefault(false));

  const filters: Filters = { user, app, device };
  const setFilters = (next: Partial<Filters>) => {
    if ("user" in next) setUser(next.user ?? null);
    if ("app" in next) setApp(next.app ?? null);
    if ("device" in next) setDevice(next.device ?? null);
  };
  const hasFilter = Boolean(search || user || app || device || onlineOnly);

  const { data, error, refetch } = useAgentsQuery({
    variables: {
      filters: {
        search: search.trim() || undefined,
        user: user ?? undefined,
        appIdentifier: app ?? undefined,
        deviceId: device ?? undefined,
      },
      ordering: [{ lastSeen: Ordering.Desc }],
    },
  });

  const agents = useMemo(() => {
    const all = sortAgents(data?.agents ?? []);
    return onlineOnly ? all.filter((a) => a.connected) : all;
  }, [data, onlineOnly]);
  const onlineCount = data?.agents.filter((a) => a.connected).length ?? 0;
  const loaded = data !== undefined;

  return (
    <PageLayout
      title="Home"
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
      <div className="space-y-10 p-3">
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
                <Podcast className="h-8 w-8 text-primary" />
                Your Apps
              </h1>
              <p className="mt-1 text-muted-foreground">
                Every app connected to this Rekuest instance. Online apps can run actions right now.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {loaded && (
                <span>
                  <span className="font-semibold text-foreground">{onlineCount}</span> online ·{" "}
                  <span className="font-semibold text-foreground">{data.agents.length}</span> total
                </span>
              )}
              <RekuestAgent.ListLink className={buttonVariants({ variant: "ghost", size: "sm" })}>
                All agents
              </RekuestAgent.ListLink>
            </div>
          </div>

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
                    : "Start an Arkitekt app and log it into this instance. It will show up here as soon as it connects."}
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
                    setFilters({ user: null, app: null, device: null });
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
          <TaskList />
        </section>

        <section>
          <ActionList />
        </section>
      </div>
    </PageLayout>
  );
};

export default Page;
