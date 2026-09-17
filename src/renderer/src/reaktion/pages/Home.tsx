import { Sidebars } from "@/components/layout/Sidebars";
import { PageLayout } from "@/components/layout/PageLayout";
import { HelpSidebar } from "@/components/sidebars/help";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleSearch } from "@/components/ui/collapsible-search";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { DialogButton } from "@/components/ui/dialog-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  parseAsIsoDateTime,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "@/hooks/use-search-param-state";
import { FlussWorkspace } from "@/linkers";
import {
  FlowOrder,
  Ordering,
  RunOrder,
  RunStatus,
  useHomePageStatsQuery,
  useListRunsQuery,
  WorkspaceOrder,
} from "@/reaktion/api/graphql";
import {
  Activity,
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpWideNarrow,
  GitBranch,
  Loader2,
  Play,
  Plus,
  Workflow,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import RunCard from "../components/cards/RunCard";
import FlowList from "../components/lists/FlowList";
import RunList from "../components/lists/RunList";
import WorkspaceList from "../components/lists/WorkspaceList";
import WorkspaceCarousel from "../edit/carousels/WorkspaceCarousel";
import { HomePageStatisticsSidebar } from "../sidebars/HomePageStatisticsSidebar";
import { ListRender } from "@/components/layout/ListRender";

const ACTIVE_RUNS_WINDOW = 30;

/**
 * Runs that are still executing, drawn from the most recent runs.
 *
 * The backend has no status filter on `runs`, so this looks at the latest
 * `ACTIVE_RUNS_WINDOW` runs and keeps the running ones client-side. It polls
 * so a run flips to completed without a manual refresh, and renders nothing
 * when there is nothing in flight.
 */
const ActiveRuns = () => {
  const { data, error } = useListRunsQuery({
    variables: {
      pagination: { limit: ACTIVE_RUNS_WINDOW },
      ordering: [{ createdAt: Ordering.Desc }],
    },
    pollInterval: 5000,
  });

  const active = data?.runs.filter((r) => r.status === RunStatus.Running) ?? [];
  if (active.length === 0) return null;

  return (
    <ListRender
      array={active}
      error={error}
      minItemWidth={240}
      title={
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Running now
          <Badge variant="secondary" className="rounded-full">
            {active.length}
          </Badge>
        </span>
      }
    >
      {(item) => <RunCard key={item.id} item={item} />}
    </ListRender>
  );
};

const CreateWorkspaceButton = ({ variant = "default" }: { variant?: "default" | "outline" }) => {
  const navigate = useNavigate();
  return (
    <DialogButton
      name="createworkspace"
      variant={variant}
      className="gap-2"
      dialogProps={{
        onSuccess: (data) =>
          data && navigate(FlussWorkspace.linkBuilder(data.createWorkspace.id)),
      }}
    >
      <Plus className="h-4 w-4" />
      New workspace
    </DialogButton>
  );
};

const EmptyHome = () => (
  <div className="min-h-full w-full flex items-center justify-center">
    <div className="max-w-3xl mx-auto text-center px-6 py-16 space-y-8">
      <div className="flex justify-center">
        <div className="p-5 rounded-3xl bg-primary/10">
          <Workflow className="h-14 w-14 text-primary" />
        </div>
      </div>
      <div className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Welcome to Fluss
          </span>
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
          Fluss lets you wire actions together into reactive workflows. Create a
          workspace, build a flow on its canvas, and run it as a task.
        </p>
      </div>
      <CreateWorkspaceButton />
      <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground pt-4">
        <div className="flex items-center gap-2">
          <Workflow className="h-4 w-4" />
          <span>Workspaces hold flows</span>
        </div>
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          <span>Flows are versioned graphs</span>
        </div>
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4" />
          <span>Runs stream live events</span>
        </div>
      </div>
    </div>
  </div>
);

type SortField = "createdAt" | "title";
type SortDirection = "ASC" | "DESC";

const Page = () => {
  const { data: stats, loading: statsLoading } = useHomePageStatsQuery();

  const [createdAfter, setCreatedAfter] = useQueryState("after", parseAsIsoDateTime);
  const [createdBefore, setCreatedBefore] = useQueryState("before", parseAsIsoDateTime);
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [sortField, setSortField] = useQueryState(
    "sort",
    parseAsStringLiteral(["createdAt", "title"] as const).withDefault("createdAt"),
  );
  const [sortDirection, setSortDirection] = useQueryState(
    "dir",
    parseAsStringLiteral(["ASC", "DESC"] as const).withDefault("DESC"),
  );

  const temporalFilter = {
    createdAfter: createdAfter ?? undefined,
    createdBefore: createdBefore ?? undefined,
  };
  const searchTerm = search.trim();
  const searchFilter = searchTerm ? { search: searchTerm } : {};
  const isFiltering = Boolean(searchTerm || createdAfter || createdBefore);

  const ordering = Ordering[sortDirection === "ASC" ? "Asc" : "Desc"];
  // Workspace and flow orders share createdAt/title; runs only order by date.
  const titledOrder =
    sortField === "createdAt" ? { createdAt: ordering } : { title: ordering };
  const workspaceOrdering: WorkspaceOrder[] = [titledOrder];
  const flowOrdering: FlowOrder[] = [titledOrder];
  const runOrdering: RunOrder[] = [{ createdAt: ordering }];

  const sortFieldLabels: Record<SortField, string> = {
    createdAt: "Date created",
    title: "Title",
  };
  const isCustomOrder = sortField !== "createdAt" || sortDirection !== "DESC";

  const workspaceCount = stats?.workspaceStats.count ?? 0;
  const showEmpty = !statsLoading && workspaceCount === 0 && !isFiltering;

  return (
    <PageLayout
      title="Fluss"
      pageActions={
        <>
          <CreateWorkspaceButton variant="outline" />
          <CollapsibleSearch
            value={search}
            onChange={(value) => setSearch(value || null)}
            placeholder="Search workspaces, flows and runs…"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Sort
                {isCustomOrder && (
                  <Badge variant="secondary" className="gap-1">
                    {sortFieldLabels[sortField]}
                    {sortDirection === "ASC" ? (
                      <ArrowUpWideNarrow />
                    ) : (
                      <ArrowDownWideNarrow />
                    )}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={sortField}
                onValueChange={(value) => setSortField(value as SortField)}
              >
                <DropdownMenuRadioItem value="createdAt">Date created</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="title">Title</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Direction</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={sortDirection}
                onValueChange={(value) => setSortDirection(value as SortDirection)}
              >
                <DropdownMenuRadioItem value="DESC">Descending</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="ASC">Ascending</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DateTimeRangePicker
            initialDateFrom={createdAfter ?? undefined}
            initialDateTo={createdBefore ?? undefined}
            onUpdate={({ range }) => {
              setCreatedAfter(range.from || null);
              setCreatedBefore(range.to || null);
            }}
          />
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
      {showEmpty ? (
        <EmptyHome />
      ) : (
        <div className="space-y-8 p-3">
          <CardHeader className="px-0">
            <CardTitle className="text-3xl flex items-center gap-3">
              <Workflow className="h-8 w-8 text-primary" />
              Your Workflows
            </CardTitle>
            <CardDescription className="text-lg">
              Workspaces, the flows built in them, and the runs they produced.
            </CardDescription>
          </CardHeader>

          {/* The carousel is a showcase of the latest work; it steps aside when
              the user is looking for something specific. */}
          {!isFiltering && <WorkspaceCarousel />}

          <ActiveRuns />

          <WorkspaceList
            filters={{ ...temporalFilter, ...searchFilter }}
            ordering={workspaceOrdering}
            pagination={{ limit: 20 }}
          />

          <FlowList
            filters={{ ...temporalFilter, ...searchFilter }}
            ordering={flowOrdering}
            pagination={{ limit: 20 }}
          />

          <Separator className="my-4" />

          <RunList
            title={
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Recent runs
              </span>
            }
            filters={{ ...temporalFilter, ...searchFilter }}
            ordering={runOrdering}
            pagination={{ limit: 20 }}
          />
        </div>
      )}
    </PageLayout>
  );
};

export default Page;
