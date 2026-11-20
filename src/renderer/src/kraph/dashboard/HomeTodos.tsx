import { HomeSection } from "@/core/layout/ModuleHome";
import { NavLink } from "react-router-dom";
import { TodoStatus, useTodoItemsQuery } from "../api/graphql";
import { TodoItemRow } from "../components/todos/TodoItemRow";

const SHOWN = 6;

/** The member's open todo items on the home page (kraph's `home` slot section). Nothing when there are none. */
export const HomeTodos = () => {
  const { data } = useTodoItemsQuery({
    variables: { filters: { mine: true, status: [TodoStatus.Todo, TodoStatus.Doing] }, pagination: { limit: SHOWN + 1 } },
  });
  const items = data?.todoItems ?? [];
  if (items.length === 0) return null;

  return (
    <HomeSection
      title={
        <>
          <span>My todos</span>
          <NavLink to="/kraph/todos" className="ml-auto font-normal normal-case tracking-normal hover:text-foreground">
            {items.length > SHOWN ? "See all →" : "Open board →"}
          </NavLink>
        </>
      }
    >
      <div className="grid gap-2 xl:grid-cols-2">
        {items.slice(0, SHOWN).map((item) => (
          <TodoItemRow key={item.id} item={item} compact />
        ))}
      </div>
    </HomeSection>
  );
};
