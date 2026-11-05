import { KraphTodoItem, KraphTodoList } from "@/core/linkers";
import { Badge } from "@/core/ui/badge";
import { TodoItemWithListFragment } from "@/kraph/api/graphql";
import { cn } from "@/core/util/utils";
import { STATUS_PILL } from "@/kraph/lib/todoStatus";
import { todoStatusLabel } from "@/kraph/lib/todos";
import { TodoDue } from "./TodoDue";
import { TodoItemObjects } from "./TodoItemObjects";

/**
 * An item outside its board (My todos, the home dashboard): its title, where it
 * lives, its column, and its objects to tick right here.
 */
export const TodoItemRow = ({ item, compact = false }: { item: TodoItemWithListFragment; compact?: boolean }) => {
  return (
    <KraphTodoItem.Smart object={{ id: item.id }} className="rounded-lg border bg-card p-3">
      <div className="flex flex-col gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <KraphTodoItem.DetailLink object={item} className="min-w-0 truncate text-sm font-medium hover:underline">
            {item.title}
          </KraphTodoItem.DetailLink>
          <Badge variant="outline" className={cn("shrink-0", STATUS_PILL[item.status])}>
            {todoStatusLabel(item.status)}
          </Badge>
          <TodoDue due={item.effectiveDueAt} status={item.status} inherited={!item.dueAt} />
          <KraphTodoList.DetailLink object={item.list} className="ml-auto shrink-0 truncate text-xs text-muted-foreground">
            {item.list.project.name} / {item.list.name}
          </KraphTodoList.DetailLink>
        </div>
        {!compact && item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
        <TodoItemObjects item={item} />
      </div>
    </KraphTodoItem.Smart>
  );
};
