import { CreateShortcutDialog } from "./components/dialogs/CreateShortcutDialog";
import { ActionAssignForm } from "./forms/ActionAssignForm";
import { ImplementationAssignForm } from "./forms/ImplementationAssignForm";
import { UpdateAgentForm } from "./forms/UpdateAgentForm";

/**
 * rekuest's dialogs, by id (a `dialogs` builtin). Its own file, apart from
 * `module.tsx`, so the host can type `openDialog` from it without pulling in
 * the module's actions (whose type refers back to `useDialog`).
 */
export const REKUEST_DIALOGS = {
      actionassign: ActionAssignForm,
      implementationassign: ImplementationAssignForm,
      createshortcut: CreateShortcutDialog,
      updateagent: UpdateAgentForm,
};
