import { DateTimeRangePicker } from "@/core/ui/date-time-range-picker";
import { RekuestTask } from "@/core/linkers";
import { parseAsBoolean, parseAsIsoDateTime, useQueryState } from "@/core/util/hooks/use-search-param-state";
import { Label } from "@/core/ui/label";
import { Switch } from "@/core/ui/switch";
import { Ordering } from "../api/graphql";
import TaskList from "../components/lists/TaskList";
import { OrgTasksUpdater } from "../components/updaters/OrgTasksUpdater";
import { REKUEST_HELP } from "../help";
const Page = () => {

  const [createdAfter, setCreatedAfter] = useQueryState(
    "after",
    parseAsIsoDateTime
  );

  const [createdBefore, setCreatedBefore] = useQueryState(
    "before",
    parseAsIsoDateTime
  );

  // Workflows: the root tasks a person started (no schedule, no trigger), the ones
  // "Share workflow" shares everything under.
  const [workflows, setWorkflows] = useQueryState("workflows", parseAsBoolean);

  const temporalFilter = {
    createdAfter: createdAfter ?? undefined,
    createdBefore: createdBefore ?? undefined,
    ...(workflows ? { humanInduced: true } : {}),
  };



  return (
    <RekuestTask.ListPage help={REKUEST_HELP.tasks} title={"Tasks"}
      pageActions={
        <>
          <div className="flex items-center gap-2">
            <Switch id="tasks-workflows" checked={!!workflows} onCheckedChange={(on) => setWorkflows(on ? true : null)} />
            <Label htmlFor="tasks-workflows" className="text-xs text-muted-foreground" title="Only the tasks a person started: each a workflow to share">
              Workflows
            </Label>
          </div>
          {/* 3. Picker updates the URL params */}
          <DateTimeRangePicker
            // Optional: bind value to keep picker UI in sync on page refresh
            initialDateFrom={createdAfter ?? undefined}
            initialDateTo={createdBefore ?? undefined}
            onUpdate={({ range }) => {
              setCreatedAfter(range.from || null);
              setCreatedBefore(range.to || null);
            }}
          /></>
      }

    >
      <div className="p-3">
        <OrgTasksUpdater />
        <TaskList
          order={{ createdAt: Ordering.Desc }}
          filters={{ ...temporalFilter }}
          title={workflows ? "Workflows" : undefined}
        />
      </div>
    </RekuestTask.ListPage>
  );
};

export default Page;
