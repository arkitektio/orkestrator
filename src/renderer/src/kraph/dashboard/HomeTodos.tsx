import { Button } from "@/core/ui/button";
import { Separator } from "@/core/ui/separator";
import { ListTodo } from "lucide-react";
import { NavLink } from "react-router-dom";
import { TodoStatus, useTodoItemsQuery } from "../api/graphql";
import { TodoItemRow } from "../components/todos/TodoItemRow";

const SHOWN = 6;

/** The member's open todo items on their home dashboard (kraph's `home` slot section). Nothing when there are none. */
export const HomeTodos = () => {
  const { data } = useTodoItemsQuery({
    variables: { filters: { mine: true, status: [TodoStatus.Todo, TodoStatus.Doing] }, pagination: { limit: SHOWN + 1 } },
  });
  const items = data?.todoItems ?? [];
  if (items.length === 0) return null;

  return (
    <>
      <section className="flex flex-col gap-2 p-3">
        <div className="flex items-center gap-2">
          <ListTodo className="size-5 text-muted-foreground" />
          <h2 className="font-semibold">My todos</h2>
          <Button asChild variant="link" size="sm" className="ml-auto">
            <NavLink to="/kraph/todos">{items.length > SHOWN ? "See all" : "Open"}</NavLink>
          </Button>
        </div>
        {items.slice(0, SHOWN).map((item) => (
          <TodoItemRow key={item.id} item={item} compact />
        ))}
      </section>
      <Separator />
    </>
  );
};
