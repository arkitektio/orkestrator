import { AddToTaskForm } from "./forms/AddToTaskForm";
import { CategorizeForm } from "./forms/CategorizeForm";
import { CategoryForm } from "./forms/CategoryForm";
import { ComposeForm } from "./forms/ComposeForm";
import { LinkMailboxForm } from "./forms/LinkMailboxForm";
import { MoveMessagesForm } from "./forms/MoveMessagesForm";
import { ShareMailAccountForm } from "./forms/ShareMailAccountForm";
import { SnoozeTaskForm } from "./forms/SnoozeTaskForm";
import { TaskForm } from "./forms/TaskForm";
import { TaskListForm } from "./forms/TaskListForm";

/**
 * kuvert's dialogs, by id (a `dialogs` builtin). Its own file, apart from
 * `module.tsx`, so the host can type `openDialog` from it without pulling in
 * the module's actions (whose type refers back to `useDialog`).
 */
export const KUVERT_DIALOGS = {
  kuvertlink: LinkMailboxForm,
  kuvertcompose: ComposeForm,
  kuvertmove: MoveMessagesForm,
  kuvertshare: ShareMailAccountForm,
  kuvertcategory: CategoryForm,
  kuvertcategorize: CategorizeForm,
  kuverttask: TaskForm,
  kuvertaddtotask: AddToTaskForm,
  kuverttasklist: TaskListForm,
  kuvertsnooze: SnoozeTaskForm,
};
