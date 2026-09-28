import { Button } from "@/core/ui/button";
import { Checkbox } from "@/core/ui/checkbox";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/core/ui/empty";
import { Spinner } from "@/core/ui/spinner";
import { toast } from "@/core/notify";
import { cn } from "@/core/util/utils";
import { AlarmClock, ListTodo, MessagesSquare, Pin } from "lucide-react";
import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ListTaskFragment,
  TaskFilter,
  TaskStatus,
  useListTasksQuery,
  useSetTaskStatusMutation,
  useTasksCountQuery,
} from "../../api/graphql";
import { toastText } from "../../errors";
import { MailTask } from "../../linkers";
import { ListDot } from "./ListDot";
import { useTaskSelection } from "./selection";
import { formatDue, isOverdue, pinnedFirst, TASK_VIEWS } from "./taskOps";

const PAGE = 50;

export type TaskEmpty = { title: string; description?: string; action?: React.ReactNode };

/** Tick a task done, or open it again. */
const DoneBox = ({ task }: { task: ListTaskFragment }) => {
  const [setStatus, { loading }] = useSetTaskStatusMutation({ refetchQueries: TASK_VIEWS });
  const done = task.status === TaskStatus.Done;
  return (
    <Checkbox
      className="mt-0.5 rounded-full"
      checked={done}
      disabled={loading}
      aria-label={done ? "Open again" : "Mark done"}
      onClick={(e) => e.stopPropagation()}
      onCheckedChange={(checked) =>
        setStatus({ variables: { input: { tasks: [task.id], status: checked ? TaskStatus.Done : TaskStatus.Open } } })
          .then(() => checked && toast.success("Done"))
          .catch((e) => toast.error(toastText(e)))
      }
    />
  );
};

/**
 * One task: a round check to finish it, the title, when it is due; below,
 * its list and its newest mail. Selected rows fill as mail rows do.
 */
const Row = ({ task, selected, onOpen, showList }: { task: ListTaskFragment; selected: boolean; onOpen: () => void; showList: boolean }) => {
  const { select } = useTaskSelection();
  const m = task.latestMessage;
  const soft = cn("text-muted-foreground", selected && "group-focus-within/list:text-primary-foreground/75");
  const finished = task.status !== TaskStatus.Open;
  const overdue = !finished && isOverdue(task.dueAt);

  return (
    <MailTask.Smart object={task}>
      <div
        role="button"
        tabIndex={0}
        data-selected={selected}
        onClick={() => select(task.id)}
        onDoubleClick={onOpen}
        className={cn(
          "grid w-full cursor-default grid-cols-[1.25rem_1fr] gap-x-2 rounded-lg px-2 py-2 text-left outline-none",
          selected
            ? "bg-muted group-focus-within/list:bg-primary group-focus-within/list:text-primary-foreground"
            : "hover:bg-muted/50",
        )}
      >
        <DoneBox task={task} />
        <div className="flex min-w-0 flex-col">
          <div className="flex items-baseline gap-1.5">
            {task.pinned && <Pin className={cn("size-3 shrink-0 self-center", soft)} aria-label="Pinned" />}
            <span
              className={cn(
                "min-w-0 truncate text-[13px]",
                task.unreadCount > 0 ? "font-semibold" : "font-medium",
                finished && "text-muted-foreground line-through",
              )}
            >
              {task.title || "(untitled)"}
            </span>
            <span className={cn("ml-auto flex shrink-0 items-center gap-1 text-xs", soft)}>
              {task.snoozed && task.snoozedUntil && (
                <>
                  <AlarmClock className="size-3" aria-label="Snoozed" />
                  {formatDue(task.snoozedUntil)}
                </>
              )}
              {!task.snoozed && task.dueAt && (
                <span className={cn(overdue && !selected && "text-destructive")}>{formatDue(task.dueAt)}</span>
              )}
            </span>
          </div>
          <div className={cn("flex min-w-0 items-center gap-1.5 text-xs", soft)}>
            {showList && task.list && (
              <span className="flex shrink-0 items-center gap-1">
                <ListDot color={task.list.color} />
                {task.list.name}
              </span>
            )}
            {task.threadCount > 0 && (
              <span className="flex shrink-0 items-center gap-1">
                <MessagesSquare className="size-3" />
                {task.threadCount}
                {task.unreadCount > 0 && ` · ${task.unreadCount} unread`}
              </span>
            )}
            {m && (
              <span className="min-w-0 truncate">
                {(m.senderName || m.senderAddress) + (m.snippet ? ` — ${m.snippet}` : "")}
              </span>
            )}
          </div>
        </div>
      </div>
    </MailTask.Smart>
  );
};

/**
 * Tasks as a list: title and count on top, rows divided by hairlines, pinned
 * first. Click reads on the right, double-click opens the page; ↑/↓ (j/k)
 * walk, Enter opens.
 */
export const TaskRows = ({
  title,
  filters,
  empty,
  showList = true,
}: {
  title: string;
  filters: TaskFilter;
  empty: TaskEmpty;
  /** Name each task's list (off on a list's own page). */
  showList?: boolean;
}) => {
  const [limit, setLimit] = useState(PAGE);
  const { data, loading } = useListTasksQuery({
    variables: { filters, pagination: { offset: 0, limit } },
    fetchPolicy: "cache-and-network",
  });
  const count = useTasksCountQuery({ variables: { filters } });
  const tasks = useMemo(() => data && pinnedFirst(data.tasks), [data]);
  const { selected, select } = useTaskSelection();
  const navigate = useNavigate();
  const container = useRef<HTMLDivElement>(null);
  const total = count.data?.tasksCount;

  const index = tasks?.findIndex((t) => t.id === selected) ?? -1;
  const selectAt = (i: number) => {
    const task = tasks?.[i];
    if (!task) return;
    select(task.id);
    container.current?.querySelector(`[data-task-row="${CSS.escape(task.id)}"]`)?.scrollIntoView({ block: "nearest" });
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!tasks?.length) return;
    if ((event.target as HTMLElement).closest("input,textarea,[contenteditable]")) return;
    if (["ArrowDown", "j"].includes(event.key)) {
      event.preventDefault();
      selectAt(Math.min(tasks.length - 1, index + 1));
    } else if (["ArrowUp", "k"].includes(event.key)) {
      event.preventDefault();
      selectAt(Math.max(0, index - 1));
    } else if (event.key === "Enter" && index >= 0) {
      navigate(MailTask.linkBuilder(tasks[index].id));
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-10 bg-background/85 px-4 pb-2 pt-3 backdrop-blur">
        <h2 className="truncate text-lg font-bold leading-tight">{title}</h2>
        {total != null && (
          <p className="truncate text-xs text-muted-foreground">
            {total} {total === 1 ? "task" : "tasks"}
          </p>
        )}
      </div>
      {!tasks ? (
        <div className="flex justify-center p-8">
          <Spinner className="size-5 text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <Empty className="border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListTodo />
            </EmptyMedia>
            <EmptyTitle>{empty.title}</EmptyTitle>
            {empty.description && <EmptyDescription>{empty.description}</EmptyDescription>}
          </EmptyHeader>
          {empty.action && <EmptyContent>{empty.action}</EmptyContent>}
        </Empty>
      ) : (
        <div ref={container} onKeyDown={onKeyDown} className="group/list flex flex-col px-2 pb-2">
          {tasks.map((task, i) => (
            <React.Fragment key={task.id}>
              <div data-task-row={task.id}>
                <Row
                  task={task}
                  selected={i === index}
                  showList={showList}
                  onOpen={() => navigate(MailTask.linkBuilder(task.id))}
                />
              </div>
              {i < tasks.length - 1 && (
                <div className={cn("ml-9 mr-2 h-px bg-border/70", (i === index || i + 1 === index) && "invisible")} />
              )}
            </React.Fragment>
          ))}
          {(data?.tasks.length ?? 0) >= limit && (
            <Button variant="ghost" size="sm" className="mt-1 text-xs" disabled={loading} onClick={() => setLimit((l) => l + PAGE)}>
              {loading && <Spinner />}
              Load more
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
