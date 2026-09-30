import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { useHoverTaskQuery } from "../api/graphql";
import { formatEventKind, statusTextColor } from "../lib/taskStatus";
import { formatDuration } from "../lib/taskTimeline";
import { TaskProgressRing } from "../components/task/TaskProgressRing";

/**
 * `@rekuest/task` elsewhere: its status ring, the action it ran, where it
 * stands and on which agent. Same query as its hover card.
 */
export const TaskDisplay = (props: DisplayWidgetProps) => {
  const { data } = useHoverTaskQuery({ variables: { id: props.id } });
  const task = data?.task;
  if (!task) return <DisplayLinePlaceholder {...props} />;

  const progress = task.events.find((event) => event.progress != null)?.progress;
  const duration =
    task.finishedAt &&
    formatDuration(new Date(task.finishedAt).getTime() - new Date(task.createdAt).getTime());
  return (
    <DisplayLine
      {...props}
      leading={<TaskProgressRing kind={task.latestEventKind} isDone={task.isDone} progress={progress} />}
      title={task.action.name}
      meta={[
        <span className={statusTextColor(task.latestEventKind, task.isDone)}>
          {formatEventKind(task.latestEventKind)}
        </span>,
        duration,
        task.implementation?.agent.name,
      ]}
    />
  );
};
