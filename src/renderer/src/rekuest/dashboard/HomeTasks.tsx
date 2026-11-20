import { HomeSection } from "@/core/layout/ModuleHome";
import { RekuestTask } from "@/core/linkers";
import { Ordering, useListTasksQuery } from "../api/graphql";
import TaskCard from "../components/cards/TaskCard";

/** A few rows of small cards; the list page has the rest. */
const SHOWN = 24;

/**
 * The latest tasks, running ones included, on the home page (rekuest's `home`
 * slot section). Nothing while there are none.
 */
export const HomeTasks = () => {
  const { data } = useListTasksQuery({
    variables: { pagination: { limit: SHOWN }, ordering: [{ createdAt: Ordering.Desc }] },
    fetchPolicy: "cache-and-network",
  });
  const tasks = data?.tasks ?? [];
  if (tasks.length === 0) return null;

  return (
    <HomeSection
      title={
        <>
          <span>Latest tasks</span>
          <RekuestTask.ListLink className="ml-auto font-normal normal-case tracking-normal hover:text-foreground">
            All tasks →
          </RekuestTask.ListLink>
        </>
      }
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} item={task} />
        ))}
      </div>
    </HomeSection>
  );
};
