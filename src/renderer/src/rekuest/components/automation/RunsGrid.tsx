import { ListTaskFragment } from "@/rekuest/api/graphql";
import TaskCard from "../cards/TaskCard";

/** The latest runs of a schedule or trigger, newest first. Nothing when there are none. */
export const RunsGrid = ({ runs }: { runs: ListTaskFragment[] }) => {
  if (runs.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium">Runs</h2>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
        {runs.map((run) => (
          <TaskCard key={run.id} item={run} />
        ))}
      </div>
    </section>
  );
};
