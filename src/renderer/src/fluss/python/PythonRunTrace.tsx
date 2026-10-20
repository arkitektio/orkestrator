import { FlussPythonFlow } from "@/core/linkers";
import Timestamp from "@/core/ui/timestamp";
import { DetailPythonRunFragment } from "@/fluss/api/graphql";
import { useDetailTaskQuery } from "@/rekuest/api/graphql";
import { useMemo } from "react";
import { PythonSourceEditor } from "./PythonSourceEditor";
import { PythonRunStatusBadge } from "./StatusBadges";
import { callMarks } from "./trace";

/**
 * A Python run on its source: each line that calls an action is marked with
 * the state of that action's calls, read off the run's task in rekuest
 * (whose children are the calls). The task's own page lists the calls and
 * their log; this is where they sit in the code.
 */
export const PythonRunTrace = ({ run }: { run: DetailPythonRunFragment }) => {
  // The task page has fetched the task already: this reads the cache, and
  // ChildTaskUpdater there keeps its children live.
  const { data } = useDetailTaskQuery({ variables: { id: run.taskId }, fetchPolicy: "cache-first" });
  const marks = useMemo(
    () => callMarks(run.flow.source, run.flow.manifest, data?.task.children ?? []),
    [run.flow.source, run.flow.manifest, data?.task.children],
  );

  return (
    <div className="flex h-full min-h-[24rem] flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-3 px-3 py-2 text-sm">
        <PythonRunStatusBadge status={run.status} />
        <FlussPythonFlow.DetailLink object={run.flow} className="font-medium hover:text-primary">
          {run.flow.title}
        </FlussPythonFlow.DetailLink>
        <span className="text-xs text-muted-foreground">
          started <Timestamp date={run.createdAt} relative />
          {run.finishedAt && (
            <>
              {" "}
              · finished <Timestamp date={run.finishedAt} relative />
            </>
          )}
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <PythonSourceEditor value={run.flow.source} readOnly lineMarks={marks} />
      </div>
    </div>
  );
};
