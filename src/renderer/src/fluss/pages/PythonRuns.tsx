import { FlussPythonFlow, FlussPythonRun, RekuestTask } from "@/core/linkers";
import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { PageLayout } from "@/core/layout/PageLayout";
import Timestamp from "@/core/ui/timestamp";
import { cn } from "@/core/util/utils";
import { Ordering, PythonRunStatus, usePythonRunsQuery } from "@/fluss/api/graphql";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { FLUSS_HELP } from "../help";
import { PythonRunStatusBadge } from "../python/StatusBadges";

const STATUS_FILTERS: { label: string; value: PythonRunStatus[] | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Running", value: [PythonRunStatus.Running] },
  { label: "Completed", value: [PythonRunStatus.Completed] },
  { label: "Failed", value: [PythonRunStatus.Failed, PythonRunStatus.Cancelled] },
];

const duration = (from: string, to: string | null | undefined) => {
  const ms = new Date(to ?? Date.now()).getTime() - new Date(from).getTime();
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min ${s % 60} s` : `${Math.floor(m / 60)} h ${m % 60} min`;
};

/** Every run of a Python flow, newest first. */
const Page = () => {
  const [status, setStatus] = useState(0);
  const { data, loading, error, refetch } = usePythonRunsQuery({
    variables: {
      filters: { status: STATUS_FILTERS[status].value },
      ordering: [{ createdAt: Ordering.Desc }],
      pagination: { limit: 100 },
    },
    pollInterval: 10_000,
  });

  return (
    <PageLayout title="Python runs" help={FLUSS_HELP.pythonRuns}>
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 rounded-md border p-0.5">
            {STATUS_FILTERS.map((filter, index) => (
              <button
                key={filter.label}
                type="button"
                onClick={() => setStatus(index)}
                className={cn(
                  "rounded px-2 py-0.5 text-xs",
                  index === status ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {error && !data && <QueryError error={error} onRetry={() => refetch()} resource="Python runs" />}
        {data && data.pythonRuns.length === 0 && (
          <div className="py-6 text-sm text-muted-foreground">No Python runs yet.</div>
        )}

        <div className="flex flex-col divide-y">
          {data?.pythonRuns.map((run) => (
            <FlussPythonRun.Smart key={run.id} object={run}>
              <div className="flex items-center gap-3 py-2 text-sm">
                <PythonRunStatusBadge status={run.status} />
                <FlussPythonRun.DetailLink object={run} className="min-w-0 flex-1 truncate font-medium hover:text-primary">
                  {run.flow.title}
                </FlussPythonRun.DetailLink>
                <FlussPythonFlow.DetailLink object={run.flow} className="text-xs text-muted-foreground hover:text-primary">
                  version
                </FlussPythonFlow.DetailLink>
                <RekuestTask.DetailLink object={{ id: run.taskId }} className="text-xs text-muted-foreground hover:text-primary">
                  task
                </RekuestTask.DetailLink>
                <span className="w-24 text-right text-xs text-muted-foreground">
                  {duration(run.createdAt, run.finishedAt)}
                </span>
                <span className="w-28 text-right text-xs text-muted-foreground">
                  <Timestamp date={run.createdAt} relative />
                </span>
              </div>
            </FlussPythonRun.Smart>
          ))}
        </div>
      </div>
    </PageLayout>
  );
};

export default Page;
