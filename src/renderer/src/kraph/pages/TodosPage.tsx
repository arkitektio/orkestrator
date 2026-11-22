import { asParamlessRoute } from "@/core/layout/routes/ParamlessRoute";
import { KraphTodoItem } from "@/core/linkers";
import { useRefetchOnReveal } from "@/core/tabs/keepLive";
import { Button } from "@/core/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/core/ui/empty";
import { Eye, EyeOff, ListTodo } from "lucide-react";
import { NavLink, useSearchParams } from "react-router-dom";
import { TodoStatus, TodoSummaryFragment, useTodoItemsQuery, useTodoSummaryQuery } from "../api/graphql";
import { TodoItemRow } from "../components/todos/TodoItemRow";
import { KRAPH_HELP } from "../help";
import { TODO_COLUMNS, columnOf } from "../lib/todos";

/** `?done=show` reads the finished items too; without it the server sends only the open ones. */
const useShowDone = () => {
  const [params, setParams] = useSearchParams();
  const showDone = params.get("done") === "show";
  const setShowDone = (value: boolean) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set("done", "show");
        else next.delete("done");
        return next;
      },
      { replace: true },
    );
  return [showDone, setShowDone] as const;
};

const useMine = () => {
  const [showDone] = useShowDone();
  return useTodoItemsQuery({
    variables: { filters: showDone ? { mine: true } : { mine: true, open: true }, pagination: { limit: 200 } },
  });
};

/** A column's count in the server's summary. */
const COUNT_OF: Record<TodoStatus, keyof Pick<TodoSummaryFragment, "todo" | "doing" | "done">> = {
  [TodoStatus.Todo]: "todo",
  [TodoStatus.Doing]: "doing",
  [TodoStatus.Done]: "done",
};

/**
 * Everything handed to the caller, across every list: their own items, and those of lists assigned to them.
 *
 * The rows are the latest 200; the counts are the server's (`todoSummary`), so
 * a header still says how many there are once a column holds more than that.
 * Counted over every item of the caller's, Done included, so the summary is one
 * query whether or not Done is shown. Without it yet (or if it fails) the page
 * shows no numbers rather than the loaded ones.
 */
const TodosPage = asParamlessRoute(useMine, ({ data }) => {
  const items = data.todoItems;
  const [showDone, setShowDone] = useShowDone();
  const summaryQuery = useTodoSummaryQuery({ variables: { filters: { mine: true } } });
  useRefetchOnReveal(summaryQuery.refetch);
  const summary = summaryQuery.data?.todoSummary;
  const open = summary ? summary.todo + summary.doing : undefined;

  return (
    <KraphTodoItem.ListPage
      title="My todos"
      help={KRAPH_HELP.todos}
      pageActions={
        <>
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => setShowDone(!showDone)}>
            {showDone ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {showDone ? "Hide done" : "Show done"}
          </Button>
          <Button asChild variant="outline" size="sm">
            <NavLink to="/kraph/projects">All projects</NavLink>
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My todos</h1>
          <p className="text-sm text-muted-foreground">
            {open !== undefined && `${open} open item${open === 1 ? "" : "s"} for you. `}
            Tick an object when you are done with it; the item moves to Done once all are.
          </p>
        </div>
        {items.length === 0 && (
          <Empty>
            <EmptyHeader>
              <ListTodo className="size-8 text-muted-foreground" />
              <EmptyTitle>Nothing to do</EmptyTitle>
              <EmptyDescription>Items assigned to you, or on a list assigned to you, show up here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {TODO_COLUMNS.map((column) => {
          const inColumn = columnOf(items, column.status);
          if (inColumn.length === 0) return null;
          const count = summary?.[COUNT_OF[column.status]];
          const unshown = count !== undefined ? count - inColumn.length : 0;
          return (
            <section key={column.status} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {column.label} {count !== undefined && <span className="tabular-nums">{count}</span>}
              </h2>
              {inColumn.map((item) => (
                <TodoItemRow key={item.id} item={item} />
              ))}
              {unshown > 0 && (
                <p className="text-xs text-muted-foreground">
                  and <span className="tabular-nums">{unshown}</span> more not shown
                </p>
              )}
            </section>
          );
        })}
      </div>
    </KraphTodoItem.ListPage>
  );
});

export default TodosPage;
