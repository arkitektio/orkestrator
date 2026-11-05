import { KraphTodoItem, KraphTodoList } from "@/core/linkers";
import { Badge } from "@/core/ui/badge";
import { TodoItemWithListFragment, TodoStatus } from "@/kraph/api/graphql";
import { structureProgress, todoStatusLabel } from "@/kraph/lib/todos";
import { TodoStructureRow } from "./TodoStructureRow";

/**
 * An item outside its board (My todos, the home dashboard): its title, where it
 * lives, its column, and its objects to tick right here.
 */
export const TodoItemRow = ({ item, compact = false }: { item: TodoItemWithListFragment; compact?: boolean }) => {
  const progress = structureProgress(item.structures);
  return (
    <KraphTodoItem.Smart object={{ id: item.id }} className="rounded-lg border bg-card p-3">
      <div className="flex flex-col gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <KraphTodoItem.DetailLink object={item} className="min-w-0 truncate text-sm font-medium hover:underline">
            {item.title}
          </KraphTodoItem.DetailLink>
          <Badge variant={item.status === TodoStatus.Done ? "default" : "outline"} className="shrink-0">
            {todoStatusLabel(item.status)}
          </Badge>
          {progress.total > 0 && (
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {progress.done}/{progress.total}
            </span>
          )}
          <KraphTodoList.DetailLink object={item.list} className="ml-auto shrink-0 truncate text-xs text-muted-foreground">
            {item.list.project.name} / {item.list.name}
          </KraphTodoList.DetailLink>
        </div>
        {!compact && item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
        {item.structures.length > 0 && (
          <div className="flex flex-col gap-1">
            {item.structures.map((structure) => (
              <TodoStructureRow key={structure.id} structure={structure} />
            ))}
          </div>
        )}
      </div>
    </KraphTodoItem.Smart>
  );
};
