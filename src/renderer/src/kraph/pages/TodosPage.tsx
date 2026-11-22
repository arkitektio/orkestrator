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

/** How many cards one column shows; its count (from `todoSummary`) says how many there are. */
const COLUMN_LIMIT = 100;

/** The caller's items: the summary is the page's read, and each column reads its own cards. */
const useMine = () => useTodoSummaryQuery({ variables: { filters: { mine: true } } });

/** A column's count in the server's summary. */
const COUNT_OF: Record<TodoStatus, keyof Pick<TodoSummaryFragment, "todo" | "doing" | "done">> = {
  [TodoStatus.Todo]: "todo",
  [TodoStatus.Doing]: "doing",
  [TodoStatus.Done]: "done",
};

/**
 * One column: its own newest cards, read by status (`TodoItemFilter.status`), so a
 * column of many finished items cannot push the open ones off the page.
 */
const TodoColumn = ({ status, label, count }: { status: TodoStatus; label: string; count: number | undefined }) => {
  const query = useTodoItemsQuery({
    variables: { filters: { mine: true, status: [status] }, pagination: { limit: COLUMN_LIMIT } },
  });
  useRefetchOnReveal(query.refetch);
  const cards = columnOf(query.data?.todoItems ?? [], status);
  if (cards.length === 0) return null;
  const unshown = count !== undefined ? count - cards.length : 0;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-muted-foreground">
        {label} {count !== undefined && <span className="tabular-nums">{count}</span>}
      </h2>
      {cards.map((item) => (
        <TodoItemRow key={item.id} item={item} />
      ))}
      {unshown > 0 && (
        <p className="text-xs text-muted-foreground">
          and <span className="tabular-nums">{unshown}</span> more not shown
        </p>
      )}
    </section>
  );
};

/**
 * Everything handed to the caller, across every list: their own items, and those of lists assigned to them.
 *
 * Each column reads its newest cards on its own; the counts are the server's
 * (`todoSummary`), counted over every item of the caller's, Done included.
 */
const TodosPage = asParamlessRoute(useMine, ({ data }) => {
  const [showDone, setShowDone] = useShowDone();
  const summary = data.todoSummary;
  const open = summary.todo + summary.doing;
  const columns = TODO_COLUMNS.filter((column) => showDone || column.status !== TodoStatus.Done);

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
            {`${open} open item${open === 1 ? "" : "s"} for you. `}
            Tick an object when you are done with it; the item moves to Done once all are.
          </p>
        </div>
        {(showDone ? summary.total : open) === 0 && (
          <Empty>
            <EmptyHeader>
              <ListTodo className="size-8 text-muted-foreground" />
              <EmptyTitle>Nothing to do</EmptyTitle>
              <EmptyDescription>Items assigned to you, or on a list assigned to you, show up here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {columns.map((column) => (
          <TodoColumn key={column.status} status={column.status} label={column.label} count={summary[COUNT_OF[column.status]]} />
        ))}
      </div>
    </KraphTodoItem.ListPage>
  );
});

export default TodosPage;
