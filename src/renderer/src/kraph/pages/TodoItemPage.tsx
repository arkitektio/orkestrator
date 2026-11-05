import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { KraphTodoItem, KraphTodoList } from "@/core/linkers";
import { Badge } from "@/core/ui/badge";
import { useNavigate } from "react-router-dom";
import { useTodoItemQuery } from "../api/graphql";
import { DeleteTodoItemButton } from "../components/todos/DeleteTodoItemButton";
import { TodoAssignee } from "../components/todos/TodoAssignee";
import { TodoDue } from "../components/todos/TodoDue";
import { TodoStructureRow } from "../components/todos/TodoStructureRow";
import { KRAPH_HELP } from "../help";
import { cn } from "@/core/util/utils";
import { STATUS_PILL } from "../lib/todoStatus";
import { todoStatusLabel } from "../lib/todos";

/** One todo item: what is to be done, and the objects to tick. */
const TodoItemPage = asDetailQueryRoute(useTodoItemQuery, ({ data }) => {
  const item = data.todoItem;
  const navigate = useNavigate();
  const progress = item.progress;
  return (
    <KraphTodoItem.ModelPage
      object={item}
      title={item.title}
      help={KRAPH_HELP.todoItem}
      actions={
        <DeleteTodoItemButton
          variant="button"
          item={item}
          // Leave the page before the item leaves the cache.
          beforeEvict={() => navigate(KraphTodoList.linkBuilder(item.list.id))}
        />
      }
    >
      <div className="flex flex-col gap-4 p-6">
        <div>
          <KraphTodoList.DetailLink object={item.list} className="text-xs text-muted-foreground">
            {item.list.project.name} / {item.list.name}
          </KraphTodoList.DetailLink>
          <h1 className="text-2xl font-bold tracking-tight">{item.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className={cn(STATUS_PILL[item.status])}>
            {todoStatusLabel(item.status)}
          </Badge>
          <TodoAssignee own={item.assignee} inherited={item.effectiveAssignee} edit={{ kind: "item", id: item.id }} />
          <TodoDue due={item.effectiveDueAt} status={item.status} inherited={!item.dueAt} />
          {progress.total > 0 && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {progress.done}/{progress.total} done
            </span>
          )}
        </div>
        {item.description && <p className="whitespace-pre-wrap text-sm">{item.description}</p>}
        <section className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-muted-foreground">Objects</h2>
          {item.allStructures.length === 0 ? (
            <p className="text-xs text-muted-foreground">None yet. Drop images on this item, or use “Add to todo…” on them.</p>
          ) : (
            item.allStructures.map((structure) => (
              <TodoStructureRow key={structure.id} structure={structure} item={item} control="pill" removable />
            ))
          )}
        </section>
      </div>
    </KraphTodoItem.ModelPage>
  );
});

export default TodoItemPage;
