import type { Service } from "@/core/connection/arkitekt/types";
import { buildDeleteAction } from "@/core/smart/localactions/builders/deleteAction";
import { Action, ActionParams } from "@/core/smart/localactions/LocalActionProvider";
import { ApolloClient, NormalizedCache } from "@apollo/client";
import {
  AlarmClock,
  AlarmClockOff,
  Check,
  ListPlus,
  ListTodo,
  Pencil,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import {
  DeleteTaskDocument,
  DeleteTaskListDocument,
  GetThreadDocument,
  LinkThreadsDocument,
  SetTaskStatusDocument,
  SnoozeTasksDocument,
  TaskStatus,
  UpdateTaskDocument,
} from "../api/graphql";
import { TASK_VIEWS } from "../components/tasks/taskOps";
import { toastText } from "../errors";

const THREAD = "@kuvert/thread";
const TASK = "@kuvert/task";
const TASKLIST = "@kuvert/tasklist";

// Same cast as `buildDeleteAction`: every concrete service carries a `.client`.
const kuvertClient = (services: ActionParams["services"]) => {
  const client = (services.kuvert as unknown as Service | undefined)?.client as
    | ApolloClient<NormalizedCache>
    | undefined;
  if (!client) throw new Error("Mail service not available");
  return client;
};

/** One mutation, its failure reworded from the error code; task views refetch. */
const kuvertMutate = async (
  services: ActionParams["services"],
  options: Parameters<ApolloClient<NormalizedCache>["mutate"]>[0],
) => {
  try {
    return await kuvertClient(services).mutate({ refetchQueries: TASK_VIEWS, ...options });
  } catch (e) {
    throw new Error(toastText(e));
  }
};

const idsOf = (state: ActionParams["state"], identifier: string) =>
  state.left.filter((s) => s.identifier === identifier && s.id).map((s) => String(s.id));

const need = (ids: string[], what: string) => {
  if (ids.length === 0) throw new Error(`No ${what} selected`);
  return ids;
};

const status = (next: TaskStatus, title: string, description: string, icon: Action["icon"], pinned = false): Action => ({
  title,
  description,
  icon,
  pinned,
  conditions: [{ type: "identifier", identifier: TASK }, { type: "nopartner" }],
  execute: async ({ services, state, onProgress }) => {
    await kuvertMutate(services, {
      mutation: SetTaskStatusDocument,
      variables: { input: { tasks: need(idsOf(state, TASK), "task"), status: next } },
    });
    onProgress(100);
  },
});

const pin = (pinned: boolean): Action => ({
  title: pinned ? "Pin" : "Unpin",
  description: pinned ? "Keep the task at the top of its list" : "Let the task sort with the rest",
  icon: pinned ? Pin : PinOff,
  conditions: [{ type: "identifier", identifier: TASK }, { type: "nopartner" }],
  execute: async ({ services, state, onProgress }) => {
    const ids = need(idsOf(state, TASK), "task");
    for (const [i, id] of ids.entries()) {
      await kuvertMutate(services, { mutation: UpdateTaskDocument, variables: { input: { id, pinned } } });
      onProgress(((i + 1) / ids.length) * 100);
    }
  },
});

export const TASK_ACTIONS: Record<string, Action> = {
  // --- Conversations ----------------------------------------------------------
  "kuvert-thread-add-to-task": {
    title: "Add to task…",
    description: "Put the conversation into an open task, or a new one",
    icon: ListPlus,
    conditions: [{ type: "identifier", identifier: THREAD }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      dialog.openDialog("kuvertaddtotask", { threads: need(idsOf(state, THREAD), "conversation") }, { size: "small" });
    },
  },
  "kuvert-thread-new-task": {
    title: "New task from conversation",
    description: "Make a task to act on the conversation",
    icon: ListTodo,
    conditions: [{ type: "identifier", identifier: THREAD }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      dialog.openDialog("kuverttask", { threads: need(idsOf(state, THREAD), "conversation") }, { size: "medium" });
    },
  },
  "kuvert-thread-into-task": {
    title: "Add to this task",
    description: "Put the dragged conversation into this task",
    icon: ListPlus,
    conditions: [
      { type: "identifier", identifier: THREAD },
      { type: "pidentifier", identifier: TASK },
    ],
    execute: async ({ services, state, onProgress }) => {
      const task = state.right?.find((s) => s.identifier === TASK);
      if (!task) throw new Error("Drop the conversation onto a task");
      await kuvertMutate(services, {
        mutation: LinkThreadsDocument,
        variables: { input: { task: String(task.id), threads: need(idsOf(state, THREAD), "conversation") } },
        refetchQueries: [...TASK_VIEWS, GetThreadDocument],
      });
      onProgress(100);
    },
  },

  // --- Tasks --------------------------------------------------------------------
  "kuvert-task-done": status(TaskStatus.Done, "Mark done", "Finish the task (its mail is untouched)", Check, true),
  "kuvert-task-reopen": status(TaskStatus.Open, "Open again", "Put the task back on the to-do list", RotateCcw),
  "kuvert-task-dismiss": status(TaskStatus.Dismissed, "Dismiss", "Drop the task without doing it", X),
  "kuvert-task-snooze": {
    title: "Snooze…",
    description: "Hide the task from Active until a time",
    icon: AlarmClock,
    conditions: [{ type: "identifier", identifier: TASK }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      dialog.openDialog("kuvertsnooze", { tasks: need(idsOf(state, TASK), "task") }, { size: "small" });
    },
  },
  "kuvert-task-wake": {
    title: "Wake now",
    description: "Bring a snoozed task back to Active",
    icon: AlarmClockOff,
    conditions: [{ type: "identifier", identifier: TASK }, { type: "nopartner" }],
    execute: async ({ services, state, onProgress }) => {
      await kuvertMutate(services, {
        mutation: SnoozeTasksDocument,
        variables: { input: { tasks: need(idsOf(state, TASK), "task"), until: null } },
      });
      onProgress(100);
    },
  },
  "kuvert-task-pin": pin(true),
  "kuvert-task-unpin": pin(false),
  "kuvert-task-edit": {
    title: "Edit task",
    description: "Change the task's title, notes, list or due date",
    icon: Pencil,
    conditions: [{ type: "identifier", identifier: TASK }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      const [id] = need(idsOf(state, TASK), "task");
      dialog.openDialog("kuverttask", { id }, { size: "medium" });
    },
  },
  "kuvert-task-delete": buildDeleteAction({
    title: "Delete task",
    identifier: TASK,
    description: "Delete the task; its conversations and mail stay",
    service: "kuvert",
    typename: "Task",
    mutation: DeleteTaskDocument,
  }),

  // --- Task lists -------------------------------------------------------------------
  "kuvert-tasklist-new-task": {
    title: "New task on list",
    description: "Add a task to this list",
    icon: Plus,
    conditions: [{ type: "identifier", identifier: TASKLIST }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      const [list] = need(idsOf(state, TASKLIST), "list");
      dialog.openDialog("kuverttask", { list }, { size: "medium" });
    },
  },
  "kuvert-tasklist-edit": {
    title: "Edit list",
    description: "Rename or recolour the list",
    icon: Pencil,
    conditions: [{ type: "identifier", identifier: TASKLIST }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      const [id] = need(idsOf(state, TASKLIST), "list");
      dialog.openDialog("kuverttasklist", { id }, { size: "small" });
    },
  },
  "kuvert-tasklist-delete": buildDeleteAction({
    title: "Delete list",
    identifier: TASKLIST,
    description: "Delete the list; its tasks stay, on no list",
    service: "kuvert",
    typename: "TaskList",
    mutation: DeleteTaskListDocument,
  }),
};
