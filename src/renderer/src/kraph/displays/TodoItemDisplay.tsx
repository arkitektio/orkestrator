import { DisplayWidgetProps } from "@/core/smart/display/registry";
import { KraphTodoItem } from "@/core/linkers";
import { useTodoItemQuery } from "../api/graphql";
import { TodoItemRow } from "../components/todos/TodoItemRow";
import { structureProgress, todoStatusLabel } from "../lib/todos";

/** A todo item where another surface shows it: a chip (its title), or its row. */
export const TodoItemDisplay = (props: DisplayWidgetProps) => {
  const { data } = useTodoItemQuery({ variables: { id: props.id } });
  const item = data?.todoItem;
  if (!item) return <span className="text-xs text-muted-foreground">Todo item not found</span>;

  if (props.variant === "inline" || props.variant === "chip" || props.variant === "avatar" || props.context === "command") {
    const progress = structureProgress(item.structures);
    return (
      <KraphTodoItem.DetailLink object={item} className="inline-flex min-w-0 items-center gap-1 text-sm">
        <span className="truncate font-medium">{item.title}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {todoStatusLabel(item.status)}
          {progress.total > 0 && ` · ${progress.done}/${progress.total}`}
        </span>
      </KraphTodoItem.DetailLink>
    );
  }

  return <TodoItemRow item={item} />;
};
