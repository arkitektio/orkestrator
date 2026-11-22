import { PageLayout } from "@/core/layout/PageLayout";
import { Badge } from "@/core/ui/badge";
import { HomeEmpty, ModuleHome, ModuleHomeSidebars } from "@/core/layout/ModuleHome";
import { DialogButton } from "@/core/ui/dialog-button";
import { FlussWorkspace } from "@/core/linkers";
import {
  Ordering,
  RunOrder,
  RunStatus,
  useHomePageStatsQuery,
  useListRunsQuery,
  useWatchRunsSubscription,
  WorkspaceOrder,
} from "@/fluss/api/graphql";
import { Activity, Loader2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import RunCard from "../components/cards/RunCard";
import RunList from "../components/lists/RunList";
import WorkspaceList from "../components/lists/WorkspaceList";
import { FLUSS_HELP } from "../help";
import { ListRender } from "@/core/layout/ListRender";
import { activeRunChange } from "../runEvents";

const ACTIVE_RUNS_SHOWN = 30;

/**
 * Runs that are still executing, however old: the server filters by status.
 * The `runs` subscription keeps the list: a run that stops running (or is
 * deleted) leaves it in place, and only a run that starts, or one not listed
 * yet, re-reads it. Renders nothing when there is nothing in flight.
 */
const ActiveRuns = () => {
  const { data, error, refetch, updateQuery } = useListRunsQuery({
    variables: {
      filters: { status: [RunStatus.Running] },
      pagination: { limit: ACTIVE_RUNS_SHOWN },
      ordering: [{ createdAt: Ordering.Desc }],
    },
  });
  useWatchRunsSubscription({
    onData: ({ data: event }) => {
      const change = activeRunChange(data?.runs ?? [], event.data?.runs);
      if (change.kind === "refetch") void refetch();
      if (change.kind === "remove") updateQuery((prev) => ({ ...prev, runs: prev.runs.filter((run) => run.id !== change.id) }));
    },
  });

  const active = data?.runs ?? [];
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

/** Newest first: the dashboard shows what just happened, the list pages the rest. */
const RECENT_RUNS: RunOrder[] = [{ createdAt: Ordering.Desc }];
const RECENT_WORKSPACES: WorkspaceOrder[] = [{ createdAt: Ordering.Desc }];

/**
 * Fluss' front door (its pages are the sidebar's Overview tab): what is running, the newest workspaces
 * and the newest runs. Search, sort and date ranges are the list pages'.
 */
const Page = () => {
  const { data: stats, loading: statsLoading } = useHomePageStatsQuery();
  const showEmpty = !statsLoading && (stats?.workspaceStats.count ?? 0) === 0;

  return (
    <PageLayout
      title="Fluss"
      help={FLUSS_HELP.home}
      pageActions={<CreateWorkspaceButton variant="outline" />}
      sidebars={
        <ModuleHomeSidebars
          moduleKey="fluss"
          stats={stats ? { "/fluss/workspaces": { count: stats.workspaceStats.count } } : undefined}
        />
      }
    >
      <ModuleHome
        moduleKey="fluss"
        pages={false}
        title="Fluss"
        description="Wire actions together into reactive workflows, and run them as tasks."
      >
        {showEmpty ? (
          <HomeEmpty title="No workspaces yet">
            A workspace holds flows: build one on its canvas and run it. Press{" "}
            <b>New workspace</b> to start.
          </HomeEmpty>
        ) : (
          <>
            <ActiveRuns />
            <WorkspaceList
              ordering={RECENT_WORKSPACES}
              pagination={{ limit: 8 }}
            />
            <RunList
              title={
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Recent runs
                </span>
              }
              ordering={RECENT_RUNS}
              pagination={{ limit: 8 }}
            />
          </>
        )}
      </ModuleHome>
    </PageLayout>
  );
};

export default Page;
