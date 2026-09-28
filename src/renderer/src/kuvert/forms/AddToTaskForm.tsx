import { useDialog } from "@/core/dialogs/registry";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { toast } from "@/core/notify";
import { Plus } from "lucide-react";
import { useState } from "react";
import { GetThreadDocument, useCreateTaskMutation, useLinkThreadsMutation, useListTasksQuery } from "../api/graphql";
import { ListDot } from "../components/tasks/ListDot";
import { TASK_VIEWS } from "../components/tasks/taskOps";
import { toastText } from "../errors";

/** Put conversations into an open task (search by title), or a new one named by the search. */
export const AddToTaskForm = ({ threads }: { threads: string[] }) => {
  const { closeDialog } = useDialog();
  const [search, setSearch] = useState("");
  const { data } = useListTasksQuery({
    variables: { filters: { active: true, search: search.trim() || undefined }, pagination: { limit: 20 } },
  });
  const refetchQueries = [...TASK_VIEWS, GetThreadDocument];
  const [link, linked] = useLinkThreadsMutation({ refetchQueries });
  const [create, created] = useCreateTaskMutation({ refetchQueries });
  const busy = linked.loading || created.loading;
  const title = search.trim();

  const done = (text: string) => {
    toast.success(text);
    closeDialog();
  };

  return (
    <div className="flex flex-col gap-3">
      <DialogHeader>
        <DialogTitle>Add to task</DialogTitle>
        <DialogDescription>
          {threads.length === 1 ? "The conversation" : `${threads.length} conversations`} into an open task, or a new one.
        </DialogDescription>
      </DialogHeader>
      <Input
        autoFocus
        placeholder="Task…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title && data?.tasks.length === 0) {
            e.preventDefault();
            create({ variables: { input: { title, threads } } })
              .then(() => done(`Added to new task “${title}”`))
              .catch((err) => toast.error(toastText(err)));
          }
        }}
      />
      <div className="flex max-h-80 flex-col overflow-y-auto">
        {title && (
          <Button
            variant="ghost"
            className="justify-start gap-2"
            disabled={busy}
            onClick={() =>
              create({ variables: { input: { title, threads } } })
                .then(() => done(`Added to new task “${title}”`))
                .catch((e) => toast.error(toastText(e)))
            }
          >
            <Plus className="h-4 w-4" />
            <span className="truncate">New task “{title}”</span>
          </Button>
        )}
        {data?.tasks.map((task) => (
          <Button
            key={task.id}
            variant="ghost"
            className="justify-start gap-2"
            disabled={busy}
            onClick={() =>
              link({ variables: { input: { task: task.id, threads } } })
                .then(() => done(`Added to “${task.title}”`))
                .catch((e) => toast.error(toastText(e)))
            }
          >
            <ListDot color={task.list?.color} />
            <span className="truncate">{task.title}</span>
            {task.threadCount > 0 && <span className="ml-auto text-xs text-muted-foreground">{task.threadCount}</span>}
          </Button>
        ))}
      </div>
    </div>
  );
};
