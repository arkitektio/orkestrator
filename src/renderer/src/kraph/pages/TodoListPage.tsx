import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { KraphProject, KraphTodoList } from "@/core/linkers";
import { DialogButton } from "@/core/ui/dialog-button";
import { PlusIcon } from "lucide-react";
import { TodoStatus, useTodoListQuery } from "../api/graphql";
import { TodoAssignee } from "../components/todos/TodoAssignee";
import { TodoBoard } from "../components/todos/TodoBoard";
import { KRAPH_HELP } from "../help";

/** One todo list as a board. */
const TodoListPage = asDetailQueryRoute(useTodoListQuery, ({ data }) => {
  const list = data.todoList;
  // Counted from the cards, not `list.progress`: a tick or a move updates the
  // cards in the cache, and nothing refetches the server's count.
  const done = list.items.filter((item) => item.status === TodoStatus.Done).length;
  return (
    <KraphTodoList.ModelPage
      object={list}
      title={list.name}
      help={KRAPH_HELP.todoList}
      pageActions={
        <DialogButton alwaysShow name="createtodoitem" variant="outline" size="sm" options={{ size: "medium" }} dialogProps={{ list: list.id }}>
          <PlusIcon className="mr-2 h-4 w-4" />
          New item
        </DialogButton>
      }
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
          <div className="min-w-0">
            <KraphProject.DetailLink object={list.project} className="text-xs text-muted-foreground">
              {list.project.name}
            </KraphProject.DetailLink>
            <h1 className="text-2xl font-bold tracking-tight">{list.name}</h1>
          </div>
          <TodoAssignee own={list.assignee} />
          <span className="text-xs tabular-nums text-muted-foreground">
            {done}/{list.items.length} done
          </span>
        </div>
        {list.description && <p className="text-sm text-muted-foreground">{list.description}</p>}
        <TodoBoard list={list} />
      </div>
    </KraphTodoList.ModelPage>
  );
});

export default TodoListPage;
