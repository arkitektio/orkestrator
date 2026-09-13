import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RekuestAgent } from "@/linkers";
import {
  TaskEventKind,
  Ordering,
  useAgentQuery,
} from "@/rekuest/api/graphql";
import TaskList from "@/rekuest/components/lists/TaskList";
import {
  TASK_DONE_FILTER_OPTIONS as DONE_OPTIONS,
  TASK_STATE_FILTER_OPTIONS as STATE_OPTIONS,
} from "@/rekuest/lib/taskStatus";
import { parseAsBoolean, parseAsIsoDateTime, parseAsStringLiteral, useQueryState, parseAsArrayOf } from "nuqs";
import Timestamp from "@/components/ui/timestamp";
import { X } from "lucide-react";

export const AgentTasksPage = asDetailQueryRoute(
  useAgentQuery,
  ({ data, id }) => {
    const [createdAfter, setCreatedAfter] = useQueryState("after", parseAsIsoDateTime);
    const [createdBefore, setCreatedBefore] = useQueryState("before", parseAsIsoDateTime);

    const [isDone, setIsDone] = useQueryState("done", parseAsBoolean);

    const [stateFilter, setStateFilter] = useQueryState<TaskEventKind[]>(
      "state",
      parseAsArrayOf(
        parseAsStringLiteral(Object.values(TaskEventKind)),
      ).withDefault([]),
    );

    const toggleDone = (value: boolean) => {
      setIsDone((prev) => (prev === value ? null : value));
    };

    const toggleState = (value: TaskEventKind) => {
      setStateFilter((prev) =>
        prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
      );
    };

    const clearFilters = () => {
      setCreatedAfter(null);
      setCreatedBefore(null);
      setIsDone(null);
      setStateFilter([]);
    };

    const hasActiveFilters =
      createdAfter || createdBefore || isDone !== null || stateFilter.length > 0;

    return (
      <RekuestAgent.ModelPage
        title={
          <div className="flex flex-row gap-2 items-center">
            {data?.agent?.name}
            <span className="text-sm font-light text-muted-foreground">— Tasks</span>
            <p className="text-md font-light text-muted-foreground">
              <Timestamp date={data.agent.lastSeen} relative />
            </p>
          </div>
        }
        object={data.agent}
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
          {/* Filter bar */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-muted-foreground">Status:</span>
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
              <span className="text-sm font-medium text-muted-foreground">State:</span>
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

          {/* Task list */}
          <TaskList
            order={{ createdAt: Ordering.Desc }}
            filters={{
              agent: id,
              createdAfter: createdAfter ?? undefined,
              createdBefore: createdBefore ?? undefined,
              isDone: isDone ?? undefined,
              state: stateFilter.length > 0 ? stateFilter : undefined,
            }}
          />
        </div>
      </RekuestAgent.ModelPage>
    );
  },
);

export default AgentTasksPage;
