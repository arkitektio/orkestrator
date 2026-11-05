import { useRegisterDashboardWidget } from "@/core/dashboard/hooks";
import { KraphTodoItem, KraphTodoList } from "@/core/linkers";
import { Progress } from "@/core/ui/progress";
import { ListTodo, Loader2, Play } from "lucide-react";
import React from "react";
import { NavLink } from "react-router-dom";
import { TodoItemWithListFragment, TodoStatus, useTodoItemsQuery } from "../api/graphql";
import { structureProgress } from "../lib/todos";

/** How many of the member's items are read: a personal list, far below this. */
const LIMIT = 200;

/** Doing before To do; within each, the most recently touched first (the query's order). */
const openFirst = (items: readonly TodoItemWithListFragment[]) => [
  ...items.filter((item) => item.status === TodoStatus.Doing),
  ...items.filter((item) => item.status === TodoStatus.Todo),
];

const OpenItem = ({ item }: { item: TodoItemWithListFragment }) => {
  const progress = structureProgress(item.structures);
  const doing = item.status === TodoStatus.Doing;
  return (
    <KraphTodoItem.Smart object={{ id: item.id }} className="rounded-md border bg-muted/40 px-2 py-1.5 hover:bg-muted">
      <div className="flex min-w-0 items-center gap-2">
        {doing ? (
          <Play className="size-3 shrink-0 text-primary" aria-label="Doing" />
        ) : (
          <span className="size-3 shrink-0 rounded-full border" aria-label="To do" />
        )}
        <KraphTodoItem.DetailLink object={item} className="min-w-0 flex-1 truncate text-xs font-medium hover:underline">
          {item.title}
        </KraphTodoItem.DetailLink>
        {progress.total > 0 && (
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
            {progress.done}/{progress.total}
          </span>
        )}
      </div>
      <KraphTodoList.DetailLink object={item.list} className="block truncate pl-5 text-[10px] text-muted-foreground">
        {item.list.project.name} / {item.list.name}
      </KraphTodoList.DetailLink>
    </KraphTodoItem.Smart>
  );
};

/**
 * The member's todos on the home dashboard: how far along they are overall
 * (items Done out of all theirs) and what is still to do, Doing first.
 */
const TodosWidget = () => {
  const { data, loading } = useTodoItemsQuery({
    variables: { filters: { mine: true }, pagination: { limit: LIMIT } },
    fetchPolicy: "cache-and-network",
  });
  const items = data?.todoItems ?? [];
  const open = React.useMemo(() => openFirst(items), [items]);
  const done = items.length - open.length;
  const percent = items.length ? Math.round((100 * done) / items.length) : 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center gap-2">
        <ListTodo className="size-4 text-primary" />
        <span className="text-sm font-medium">My todos</span>
        <NavLink to="/kraph/todos" className="ml-auto text-xs text-muted-foreground hover:underline">
          Open board
        </NavLink>
      </div>

      {loading && items.length === 0 ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing is assigned to you.</p>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums">{percent}%</span>
              <span className="text-xs text-muted-foreground">
                {done} of {items.length} done · {open.length} to go
              </span>
            </div>
            <Progress value={percent} className="h-1.5" />
          </div>
          {open.length === 0 ? (
            <p className="text-xs text-muted-foreground">All done.</p>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
              {open.map((item) => (
                <OpenItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

/** Registers the widget (a `background` builtin, mounted behind kraph's guard). */
export const TodosDashboardWidget = () => {
  useRegisterDashboardWidget({
    key: "kraph-todos",
    label: "My todos",
    module: "kraph",
    icon: <ListTodo className="w-3 h-3" />,
    component: () => <TodosWidget />,
    defaultSize: "1x2",
    defaultWidth: 25,
    defaultHeight: 100,
  });
  return null;
};
