import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { DateTimeRangePicker } from "@/core/ui/date-time-range-picker";
import { FilterClear, FilterPicker } from "@/core/ui/filter-bar";
import { RekuestAgent } from "@/core/linkers";
import {
  TaskEventKind,
  Ordering,
  useAgentQuery,
} from "@/rekuest/api/graphql";
import { AgentSubpageHeader } from "@/rekuest/components/agent/AgentSubpageHeader";
import TaskList from "@/rekuest/components/lists/TaskList";
import {
  TASK_DONE_FILTER_OPTIONS as DONE_OPTIONS,
  TASK_STATE_FILTER_OPTIONS as STATE_OPTIONS,
} from "@/rekuest/lib/taskStatus";
import {
  parseAsBoolean,
  parseAsIsoDateTime,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "@/core/util/hooks/use-search-param-state";
import { CircleDot, ListFilter, Play } from "lucide-react";
import { useMemo } from "react";
import { REKUEST_HELP } from "../../help";

/**
 * Every task that ran on one agent, newest first, under the list pages'
 * header. The filters sit in a row under the title and are kept in the link:
 * which action (the search: the picker lists the agent's own actions and
 * narrows as you type), finished or not, the state it ended in, and when.
 * All of them are the server's filters, so the paging counts what is shown.
 */
export const AgentTasksPage = asDetailQueryRoute(
  useAgentQuery,
  ({ data, id }) => {
    const [createdAfter, setCreatedAfter] = useQueryState("after", parseAsIsoDateTime);
    const [createdBefore, setCreatedBefore] = useQueryState("before", parseAsIsoDateTime);
    const [isDone, setIsDone] = useQueryState("done", parseAsBoolean);
    const [state, setState] = useQueryState("state", parseAsStringLiteral(Object.values(TaskEventKind)));
    const [action, setAction] = useQueryState("action", parseAsString);

    // One row per action, however many implementations of it the agent has.
    const actionOptions = useMemo(() => {
      const byId = new Map<string, string>();
      for (const implementation of data.agent.implementations) {
        byId.set(implementation.action.id, implementation.action.name);
      }
      return [...byId]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }, [data.agent.implementations]);

    const clearFilters = () => {
      setCreatedAfter(null);
      setCreatedBefore(null);
      setIsDone(null);
      setState(null);
      setAction(null);
    };

    const hasActiveFilters = Boolean(createdAfter || createdBefore || isDone !== null || state || action);

    return (
      <RekuestAgent.ModelPage
        title={`${data?.agent?.name} — Tasks`}
        help={REKUEST_HELP.agentTasks}
        object={data.agent}
        // The breadcrumb reads the agent's name, not its number.
        crumbs={{ [data.agent.id]: data.agent.name }}
      >
        <div className="flex flex-col gap-6 p-3">
          <AgentSubpageHeader
            agent={data.agent}
            title={`Tasks of ${data.agent.name}`}
            description="Everything this app was asked to run, newest first."
          />
          {/* The filter row belongs to the list it narrows: under the title, over the tasks. */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterPicker
              icon={Play}
              label="Action"
              value={action}
              onChange={setAction}
              defaultLabel="Any action"
              options={actionOptions}
              heading="This agent's actions"
              searchable
            />
            <FilterPicker
              icon={CircleDot}
              label="Status"
              value={isDone === null ? null : String(isDone)}
              onChange={(next) => setIsDone(next === null ? null : next === "true")}
              defaultLabel="Running or done"
              options={DONE_OPTIONS.map(({ label, value }) => ({ label, value: String(value) }))}
            />
            <FilterPicker
              icon={ListFilter}
              label="State"
              value={state}
              onChange={(next) => setState(next as TaskEventKind | null)}
              defaultLabel="Any state"
              options={STATE_OPTIONS}
            />
            <DateTimeRangePicker
              initialDateFrom={createdAfter ?? undefined}
              initialDateTo={createdBefore ?? undefined}
              onUpdate={({ range }) => {
                setCreatedAfter(range.from || null);
                setCreatedBefore(range.to || null);
              }}
            />
            {hasActiveFilters && <FilterClear onClear={clearFilters} />}
          </div>
          <TaskList
            title={hasActiveFilters ? "Matching tasks" : "Tasks"}
            order={{ createdAt: Ordering.Desc }}
            filters={{
              agent: id,
              action: action ?? undefined,
              createdAfter: createdAfter ?? undefined,
              createdBefore: createdBefore ?? undefined,
              isDone: isDone ?? undefined,
              state: state ? [state] : undefined,
            }}
          />
        </div>
      </RekuestAgent.ModelPage>
    );
  },
);

export default AgentTasksPage;
