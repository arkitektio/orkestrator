import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { RekuestTask } from "@/linkers";
import { Ordering, TaskEventKind } from "@/rekuest/api/graphql";
import TaskList from "@/rekuest/components/lists/TaskList";
import { OrgTasksUpdater } from "@/rekuest/components/updaters/OrgTasksUpdater";
import {
  TASK_DONE_FILTER_OPTIONS as DONE_OPTIONS,
  TASK_STATE_FILTER_OPTIONS as STATE_OPTIONS,
} from "@/rekuest/lib/taskStatus";
import { X } from "lucide-react";
import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsIsoDateTime,
  parseAsStringLiteral,
  useQueryState,
} from "@/hooks/use-search-param-state";

/**
 * Org-wide tasks view: every root task across the organization (the `tasks`
 * query, unscoped), paginated and filterable. This is intentionally separate
 * from the per-user "Tasks" page, which is driven by the caller-scoped
 * `mytasks` stream.
 */
const OrgTasksPage = () => {
  const [createdAfter, setCreatedAfter] = useQueryState(
    "after",
    parseAsIsoDateTime,
  );
  const [createdBefore, setCreatedBefore] = useQueryState(
    "before",
    parseAsIsoDateTime,
  );

  const [isDone, setIsDone] = useQueryState("done", parseAsBoolean);

  const [stateFilter, setStateFilter] = useQueryState<TaskEventKind[]>(
    "state",
    parseAsArrayOf(
      parseAsStringLiteral(Object.values(TaskEventKind)),
    ).withDefault([]),
  );

  const toggleDone = (value: boolean) =>
    setIsDone((prev) => (prev === value ? null : value));

  const toggleState = (value: TaskEventKind) =>
    setStateFilter((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
    );

  const hasActiveFilters =
    createdAfter || createdBefore || isDone !== null || stateFilter.length > 0;

  const clearFilters = () => {
    setCreatedAfter(null);
    setCreatedBefore(null);
    setIsDone(null);
    setStateFilter([]);
  };

  return (
    <RekuestTask.ListPage
      title={"Org Tasks"}
      pageActions={
        <DateTimeRangePicker
          initialDateFrom={createdAfter ?? undefined}
          initialDateTo={createdBefore ?? undefined}
          onUpdate={({ range }) => {
            setCreatedAfter(range.from || null);
            setCreatedBefore(range.to || null);
          }}
        />
      }
    >
      <div className="flex h-full flex-col gap-4 p-6">
        <div>
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            Organization Tasks
          </h1>
          <p className="mt-3 text-xl text-muted-foreground">
            Every task running across the organization.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-muted-foreground">
              Status:
            </span>
            {DONE_OPTIONS.map(({ label, value }) => (
              <Badge
                key={label}
                variant={isDone === value ? "default" : "outline"}
                className="cursor-pointer select-none"
                onClick={() => toggleDone(value)}
              >
                {label}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-muted-foreground">
              State:
            </span>
            {STATE_OPTIONS.map(({ label, value }) => (
              <Badge
                key={value}
                variant={stateFilter.includes(value) ? "default" : "outline"}
                className="cursor-pointer select-none"
                onClick={() => toggleState(value)}
              >
                {label}
              </Badge>
            ))}
          </div>

          {hasActiveFilters && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Clear filters
              </Button>
            </div>
          )}
        </div>

        <OrgTasksUpdater />
        <TaskList
          order={{ createdAt: Ordering.Desc }}
          filters={{
            createdAfter: createdAfter ?? undefined,
            createdBefore: createdBefore ?? undefined,
            isDone: isDone ?? undefined,
            state: stateFilter.length > 0 ? stateFilter : undefined,
          }}
        />
      </div>
    </RekuestTask.ListPage>
  );
};

export default OrgTasksPage;
