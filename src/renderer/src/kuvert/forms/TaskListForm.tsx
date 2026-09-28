import { useDialog } from "@/core/dialogs/registry";
import { Button } from "@/core/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { Spinner } from "@/core/ui/spinner";
import { toast } from "@/core/notify";
import { cn } from "@/core/util/utils";
import { useState } from "react";
import { ListTaskListFragment, useCreateTaskListMutation, useGetTaskListQuery, useUpdateTaskListMutation } from "../api/graphql";
import { LIST_COLORS, TASK_VIEWS } from "../components/tasks/taskOps";
import { toastText } from "../errors";

const Body = ({ list }: { list?: ListTaskListFragment }) => {
  const { closeDialog } = useDialog();
  const [name, setName] = useState(list?.name ?? "");
  const [color, setColor] = useState(list?.color || LIST_COLORS[0]);
  const [create, created] = useCreateTaskListMutation({ refetchQueries: TASK_VIEWS });
  const [update, updated] = useUpdateTaskListMutation({ refetchQueries: TASK_VIEWS });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = { name: name.trim(), color };
    if (!input.name) return;
    (list ? update({ variables: { input: { id: list.id, ...input } } }) : create({ variables: { input } }))
      .then(() => {
        toast.success(list ? "List updated" : "List created");
        closeDialog();
      })
      .catch((err) => toast.error(toastText(err)));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <DialogHeader>
        <DialogTitle>{list ? "Edit list" : "New task list"}</DialogTitle>
      </DialogHeader>
      <Input autoFocus placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Colour">
        {LIST_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={c === color}
            aria-label={c}
            onClick={() => setColor(c)}
            className={cn("size-6 rounded-full ring-offset-2 ring-offset-background", c === color && "ring-2 ring-ring")}
            style={{ backgroundColor: c }}
          />
        ))}
        <input
          type="color"
          aria-label="Other colour"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="size-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={!name.trim() || created.loading || updated.loading}>
          {list ? "Save" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
};

/** Create a task list, or edit one (`id`). */
export const TaskListForm = ({ id }: { id?: string }) => {
  const { data } = useGetTaskListQuery({ variables: { id: id ?? "" }, skip: !id });
  if (id && !data) return <Spinner className="mx-auto size-5 text-muted-foreground" />;
  return <Body list={data?.taskList} />;
};
