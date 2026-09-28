import { DisplayWidgetProps } from "@/core/smart/display/registry";
import { cn } from "@/core/util/utils";
import { TaskStatus, useListTasksQuery } from "../api/graphql";
import { ListDot } from "../components/tasks/ListDot";
import { formatDue } from "../components/tasks/taskOps";
import { MailTask } from "../linkers";

/** `@kuvert/task` wherever another module shows one: its list's dot and title (a card adds due date and size). */
export const TaskDisplay = (props: DisplayWidgetProps) => {
  const { data } = useListTasksQuery({ variables: { filters: { ids: [props.id] }, pagination: { limit: 1 } } });
  const task = data?.tasks[0];
  if (!task) return <span className="text-xs text-muted-foreground">Task</span>;
  const finished = task.status !== TaskStatus.Open;

  const link = (
    <MailTask.DetailLink object={task} className="inline-flex min-w-0 items-center gap-2 text-sm">
      <ListDot color={task.list?.color} />
      <span className={cn("truncate", finished && "text-muted-foreground line-through")}>{task.title}</span>
    </MailTask.DetailLink>
  );
  if (props.variant !== "card") return link;
  return (
    <MailTask.Smart object={task}>
      <div className="flex flex-col gap-0.5 rounded-lg border bg-card px-3 py-2">
        {link}
        <span className="truncate text-xs text-muted-foreground">
          {[
            task.list?.name,
            task.dueAt && `due ${formatDue(task.dueAt)}`,
            `${task.threadCount} ${task.threadCount === 1 ? "conversation" : "conversations"}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
    </MailTask.Smart>
  );
};
