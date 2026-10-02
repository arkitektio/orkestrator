import { useDialog } from "@/core/dialogs/registry";
import { PageAction } from "@/core/ui/page-action";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/core/ui/select";
import { Button } from "@/core/ui/button";
import { Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useListTaskListsQuery } from "../api/graphql";
import { ListDot } from "../components/tasks/ListDot";
import { TaskRows } from "../components/tasks/TaskRows";
import { TaskSplit } from "../components/tasks/TaskSplit";
import { TaskViewToggle, useTaskView, VIEW_LABEL } from "../components/tasks/TaskViewToggle";
import { listFilter, ListScope, TASK_VIEW_FILTERS } from "../components/tasks/taskOps";
import { KUVERT_HELP } from "../help";
import { MailTask } from "../linkers";

const NEW_LIST = "__new";

const EMPTY = {
  active: { title: "Nothing to do", description: "Put a conversation into a task from its menu to see it here." },
  snoozed: { title: "Nothing snoozed", description: "Snoozed tasks wait here until their time comes." },
  done: { title: "Nothing done yet", description: "Tasks you finish land here." },
};

/**
 * Tasks made of mail, as Inbox had them: what is to do now (Active), what
 * waits (Snoozed), what is finished (Done), narrowed to one list if wanted.
 */
const TasksPage = () => {
  const { openDialog } = useDialog();
  const { view, setView } = useTaskView();
  const [params, setParams] = useSearchParams();
  const scope: ListScope = params.get("list") ?? "all";
  const { data } = useListTaskListsQuery({ variables: { pagination: { limit: 200 } } });
  const lists = data?.taskLists ?? [];
  const current = lists.find((l) => l.id === scope);

  const setScope = (next: string) => {
    if (next === NEW_LIST) {
      openDialog("kuverttasklist", {}, { size: "small" });
      return;
    }
    setParams(
      (p) => {
        const out = new URLSearchParams(p);
        if (next === "all") out.delete("list");
        else out.set("list", next);
        out.delete("task");
        return out;
      },
      { replace: true },
    );
  };

  const title = [scope === "none" ? "No list" : current?.name, view === "active" ? null : VIEW_LABEL[view]]
    .filter(Boolean)
    .join(" · ") || "Tasks";
  const newTask = () =>
    openDialog("kuverttask", current ? { list: current.id } : {}, { size: "medium" });

  return (
    <MailTask.ListPage
      title="Tasks"
      help={KUVERT_HELP.tasks}
      pageActions={
        <>
          <TaskViewToggle view={view} onChange={setView} />
          <PageAction.Slot collapse="hide">
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger size="sm" className="min-w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All lists</SelectItem>
                <SelectItem value="none">No list</SelectItem>
                {lists.length > 0 && <SelectSeparator />}
                {lists.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    <span className="flex items-center gap-2">
                      <ListDot color={l.color} />
                      {l.name}
                      {l.openCount > 0 && <span className="text-muted-foreground">{l.openCount}</span>}
                    </span>
                  </SelectItem>
                ))}
                <SelectSeparator />
                <SelectItem value={NEW_LIST}>New list…</SelectItem>
              </SelectContent>
            </Select>
          </PageAction.Slot>
          <PageAction size="sm" collapse="icon" icon={<Plus className="h-4 w-4" />} onClick={newTask}>
            New task
          </PageAction>
        </>
      }
    >
      <TaskSplit
        list={
          <TaskRows
            key={`${view}:${scope}`}
            title={title}
            filters={{ ...TASK_VIEW_FILTERS[view], ...listFilter(scope) }}
            showList={scope === "all"}
            empty={{
              ...EMPTY[view],
              action:
                view === "active" ? (
                  <Button size="sm" variant="outline" onClick={newTask}>
                    New task
                  </Button>
                ) : undefined,
            }}
          />
        }
      />
    </MailTask.ListPage>
  );
};

export default TasksPage;
