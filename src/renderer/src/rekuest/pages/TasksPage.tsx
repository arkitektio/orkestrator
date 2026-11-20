import { DateTimeRangePicker } from "@/core/ui/date-time-range-picker";
import { RekuestTask } from "@/core/linkers";
import { parseAsIsoDateTime, useQueryState } from "@/core/util/hooks/use-search-param-state";
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

  const temporalFilter = {
    createdAfter: createdAfter ?? undefined,
    createdBefore: createdBefore ?? undefined,
  };



  return (
    <RekuestTask.ListPage help={REKUEST_HELP.tasks} title={"Tasks"}
      pageActions={
        <>
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
        <TaskList order={{ createdAt: Ordering.Desc }} filters={{ ...temporalFilter }} />
      </div>
    </RekuestTask.ListPage>
  );
};

export default Page;
