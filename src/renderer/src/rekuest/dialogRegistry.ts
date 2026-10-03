import { prefersSize } from "@/core/modules/host/dialogNeeds";
import { CreateShortcutDialog } from "./components/dialogs/CreateShortcutDialog";
import { ActionAssignForm } from "./forms/ActionAssignForm";
import { ImplementationAssignForm } from "./forms/ImplementationAssignForm";
import { ExportToFileDialog } from "./dialogs/ExportToFileDialog";
import { ReplyerAssignForm } from "./dialogs/ReplyerAssignForm";
import { ReportBugDialog } from "./dialogs/ReportBugDialog";
import { RerunLostDialog } from "./dialogs/RerunLostDialog";
import { CreateScheduleDialog, EditScheduleDialog } from "./dialogs/ScheduleDialog";
import { CreateTriggerDialog, EditTriggerDialog } from "./dialogs/TriggerDialog";
import { UpdateAgentForm } from "./forms/UpdateAgentForm";

/**
 * rekuest's dialogs, by id (a `dialogs` builtin). Its own file, apart from
 * `module.tsx`, so the host can type `openDialog` from it without pulling in
 * the module's actions (whose type refers back to `useDialog`).
 */
export const REKUEST_DIALOGS = {
  // a stacked form: one argument per row reads better than a page-wide strip
  actionassign: prefersSize("medium", ActionAssignForm),
  implementationassign: prefersSize("medium", ImplementationAssignForm),
  createshortcut: CreateShortcutDialog,
  // an action on a clock ("cron job"), and an action on a signal
  createschedule: CreateScheduleDialog,
  editschedule: EditScheduleDialog,
  createtrigger: CreateTriggerDialog,
  edittrigger: EditTriggerDialog,
  updateagent: UpdateAgentForm,
  // a failed task → lok's report form, prefilled
  reportbug: ReportBugDialog,
  // a LOST task that may already have acted → confirm before running again
  rerunlost: RerunLostDialog,
  // an action that answers an alpaka message, started on a fresh room
  alpakareplyerassign: ReplyerAssignForm,
  // any smart model → a file on disk, through a rekuest exporter action
  // (drag-out to the desktop, "Export to file")
  exporttofile: ExportToFileDialog,
};
