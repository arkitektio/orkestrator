import { DateTimeRangePicker } from "@/core/components/ui/date-time-range-picker";
import { RekuestTask } from "@/core/linkers";
import { parseAsIsoDateTime, useQueryState } from "@/core/hooks/use-search-param-state";
import { Ordering } from "../api/graphql";
import TaskList from "../components/lists/TaskList";
import { OrgTasksUpdater } from "../components/updaters/OrgTasksUpdater";
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
    <RekuestTask.ListPage title={"Tasks"}
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
      <div className="p-6">
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center mb-3">
          <div>
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              Your latest Tasks
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              All the data types you have created to use in actions.
            </p>
          </div>
        </div>

        <OrgTasksUpdater />
        <TaskList order={{ createdAt: Ordering.Desc }} filters={{ ...temporalFilter }} />
      </div>
    </RekuestTask.ListPage>
  );
};

export default Page;
