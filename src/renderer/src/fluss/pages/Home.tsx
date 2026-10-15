import { Sidebars } from "@/core/layout/Sidebars";
import { PageLayout } from "@/core/layout/PageLayout";
import { HelpSidebar } from "@/core/layout/help";
import { Badge } from "@/core/ui/badge";
import { HomeEmpty, ModuleHome } from "@/core/layout/ModuleHome";
import { DialogButton } from "@/core/ui/dialog-button";
import { FlussWorkspace } from "@/core/linkers";
import {
  Ordering,
  RunOrder,
  RunStatus,
  useHomePageStatsQuery,
  useListRunsQuery,
  WorkspaceOrder,
} from "@/fluss/api/graphql";
import { Activity, Loader2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import RunCard from "../components/cards/RunCard";
import RunList from "../components/lists/RunList";
import WorkspaceList from "../components/lists/WorkspaceList";
import { HomePageStatisticsSidebar } from "../sidebars/HomePageStatisticsSidebar";
import { FLUSS_HELP } from "../help";
import { ListRender } from "@/core/layout/ListRender";

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

/** Newest first: the dashboard shows what just happened, the list pages the rest. */
const RECENT_RUNS: RunOrder[] = [{ createdAt: Ordering.Desc }];
const RECENT_WORKSPACES: WorkspaceOrder[] = [{ createdAt: Ordering.Desc }];

/**
 * Fluss' front door: its pages, then what is running, the newest workspaces
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
      <ModuleHome
        moduleKey="fluss"
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
