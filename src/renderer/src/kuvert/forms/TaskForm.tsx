import { useDialog } from "@/core/dialogs/registry";
import { SwitchField } from "@/core/forms/SwitchField";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/core/ui/form";
import { Input } from "@/core/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/ui/select";
import { Spinner } from "@/core/ui/spinner";
import { Textarea } from "@/core/ui/textarea";
import { toast } from "@/core/notify";
import { useForm, useFormContext } from "react-hook-form";
import {
  GetThreadDocument,
  ListTaskFragment,
  useCreateTaskMutation,
  useListTaskListsQuery,
  useListTasksQuery,
  useUpdateTaskMutation,
} from "../api/graphql";
import { ListDot } from "../components/tasks/ListDot";
import { fromLocalInput, TASK_VIEWS, toLocalInput } from "../components/tasks/taskOps";
import { toastText } from "../errors";
import { TextField } from "./fields";

type Values = { title: string; notes: string; dueAt: string; list: string; pinned: boolean };

const NO_LIST = "none";

const Fields = () => {
  const { data } = useListTaskListsQuery({ variables: { pagination: { limit: 200 } } });
  const { control } = useFormContext<Values>();
  return (
    <>
      <TextField name="title" label="Title" placeholder="What to do" />
      <FormField
        control={control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea {...field} rows={3} />
            </FormControl>
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-2">
        <FormField
          control={control}
          name="list"
          render={({ field }) => (
            <FormItem>
              <FormLabel>List</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_LIST}>No list</SelectItem>
                  {data?.taskLists.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      <span className="flex items-center gap-2">
                        <ListDot color={l.color} />
                        {l.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="dueAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due</FormLabel>
              <FormControl>
                <Input {...field} type="datetime-local" />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      <SwitchField name="pinned" label="Pin to the top" />
    </>
  );
};


/** The form itself; `task` edits it, else a new one (with `threads`, on `list`). */
const TaskFormBody = ({ task, threads = [], list }: { task?: ListTaskFragment; threads?: string[]; list?: string }) => {
  const { closeDialog } = useDialog();
  const refetchQueries = [...TASK_VIEWS, ...(threads.length ? [GetThreadDocument] : [])];
  const [create, created] = useCreateTaskMutation({ refetchQueries });
  const [update, updated] = useUpdateTaskMutation({ refetchQueries });
  const form = useForm<Values>({
    defaultValues: {
      title: task?.title ?? "",
      notes: task?.notes ?? "",
      dueAt: toLocalInput(task?.dueAt),
      list: task?.list?.id ?? list ?? NO_LIST,
      pinned: task?.pinned ?? false,
    },
  });

  const submit = (v: Values) => {
    const fields = {
      title: v.title.trim(),
      notes: v.notes,
      dueAt: fromLocalInput(v.dueAt),
      list: v.list === NO_LIST ? null : v.list,
      pinned: v.pinned,
    };
    if (!fields.title) {
      form.setError("title", { message: "A task needs a title" });
      return;
    }
    const work = task
      ? update({ variables: { input: { id: task.id, ...fields } } })
      : create({ variables: { input: { ...fields, threads } } });
    return work
      .then(() => {
        toast.success(task ? "Task updated" : "Task created");
        closeDialog();
      })
      .catch((e) => toast.error(toastText(e)));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-3">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
          {!task && threads.length > 0 && (
            <DialogDescription>
              With {threads.length === 1 ? "this conversation" : `these ${threads.length} conversations`}.
            </DialogDescription>
          )}
        </DialogHeader>
        <Fields />
        <DialogFooter>
          <Button type="submit" disabled={created.loading || updated.loading}>
            {task ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

/** Create a task (optionally from conversations, onto a list) or edit one (`id`). */
export const TaskForm = ({ id, threads, list }: { id?: string; threads?: string[]; list?: string }) => {
  const { data } = useListTasksQuery({ variables: { filters: { ids: id ? [id] : [] }, pagination: { limit: 1 } }, skip: !id });
  if (id && !data) return <Spinner className="mx-auto size-5 text-muted-foreground" />;
  const task = data?.tasks[0];
  return <TaskFormBody key={task?.id ?? "new"} task={task} threads={threads} list={list} />;
};
