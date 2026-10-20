import { FlussPythonFlow } from "@/core/linkers";
import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { Button } from "@/core/ui/button";
import { Input } from "@/core/ui/input";
import Timestamp from "@/core/ui/timestamp";
import { cn } from "@/core/util/utils";
import { Ordering, PythonFlowStatus, usePythonFlowsQuery } from "@/fluss/api/graphql";
import { AlertTriangle, Code2, Loader2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FLUSS_HELP } from "../help";
import { PythonFlowStatusBadge } from "../python/StatusBadges";

const STATUS_FILTERS: { label: string; value: PythonFlowStatus[] | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Drafts", value: [PythonFlowStatus.Draft] },
  { label: "Published", value: [PythonFlowStatus.Published] },
  { label: "Archived", value: [PythonFlowStatus.Archived] },
];

/** Every Python flow, one row per flow: its newest version that matches. */
const Page = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(0);
  const { data, loading, error, refetch } = usePythonFlowsQuery({
    variables: {
      filters: { search: search || undefined, status: STATUS_FILTERS[status].value },
      ordering: [{ createdAt: Ordering.Desc }],
      pagination: { limit: 200 },
    },
    // A save elsewhere adds versions this cached list does not know of.
    fetchPolicy: "cache-and-network",
  });

  const latest = useMemo(() => {
    const seen = new Set<string>();
    return (data?.pythonFlows ?? []).filter((flow) => {
      if (seen.has(flow.lineage)) return false;
      seen.add(flow.lineage);
      return true;
    });
  }, [data]);

  return (
    <FlussPythonFlow.ListPage
      title="Python flows"
      help={FLUSS_HELP.pythonFlows}
      pageActions={
        <Button size="sm" className="gap-1.5" onClick={() => navigate("/fluss/python/new")}>
          <Plus className="h-4 w-4" /> New Python flow
        </Button>
      }
    >
      <div className="flex flex-col gap-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or meaning…"
            className="h-8 max-w-sm"
          />
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

        {error && !data && <QueryError error={error} onRetry={() => refetch()} resource="Python flows" />}

        {data && latest.length === 0 && (
          <div className="py-6 text-sm text-muted-foreground">
            {search || status ? "No Python flow matches." : "No Python flows yet. Press New Python flow to write one."}
          </div>
        )}

        <div className="flex flex-col divide-y">
          {latest.map((flow) => (
            <FlussPythonFlow.Smart key={flow.id} object={flow}>
              <div className="flex items-center gap-3 py-2">
                <Code2 className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <FlussPythonFlow.DetailLink object={flow} className="block truncate text-sm font-medium hover:text-primary">
                    {flow.title}
                  </FlussPythonFlow.DetailLink>
                  {flow.description && (
                    <div className="truncate text-xs text-muted-foreground">{flow.description}</div>
                  )}
                </div>
                {flow.physical && (
                  <span
                    className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
                    title="Calls an action whose effect is irreversible"
                  >
                    <AlertTriangle className="h-3 w-3" /> Irreversible
                  </span>
                )}
                <PythonFlowStatusBadge status={flow.status} />
                <span className="w-28 text-right text-xs text-muted-foreground">
                  <Timestamp date={flow.createdAt} relative />
                </span>
              </div>
            </FlussPythonFlow.Smart>
          ))}
        </div>
      </div>
    </FlussPythonFlow.ListPage>
  );
};

export default Page;
