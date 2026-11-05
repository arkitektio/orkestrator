import { asParamlessRoute } from "@/core/layout/routes/ParamlessRoute";
import { KraphTodoItem } from "@/core/linkers";
import { Button } from "@/core/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/core/ui/empty";
import { ListTodo } from "lucide-react";
import { NavLink } from "react-router-dom";
import { TodoStatus, useTodoItemsQuery } from "../api/graphql";
import { TodoItemRow } from "../components/todos/TodoItemRow";
import { KRAPH_HELP } from "../help";
import { TODO_COLUMNS, columnOf } from "../lib/todos";

const useMine = () =>
  useTodoItemsQuery({ variables: { filters: { mine: true }, pagination: { limit: 200 } } });

/** Everything handed to the caller, across every list: their own items, and those of lists assigned to them. */
const TodosPage = asParamlessRoute(useMine, ({ data }) => {
  const items = data.todoItems;
  const open = items.filter((item) => item.status !== TodoStatus.Done).length;

  return (
    <KraphTodoItem.ListPage
      title="My todos"
      help={KRAPH_HELP.todos}
      pageActions={
        <Button asChild variant="outline" size="sm">
          <NavLink to="/kraph/projects">All projects</NavLink>
        </Button>
      }
    >
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My todos</h1>
          <p className="text-sm text-muted-foreground">
            {open} open item{open === 1 ? "" : "s"} for you. Tick an object when you are done with it; the item moves to Done once all are.
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
          return (
            <section key={column.status} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {column.label} <span className="tabular-nums">{inColumn.length}</span>
              </h2>
              {inColumn.map((item) => (
                <TodoItemRow key={item.id} item={item} />
              ))}
            </section>
          );
        })}
      </div>
    </KraphTodoItem.ListPage>
  );
});

export default TodosPage;
