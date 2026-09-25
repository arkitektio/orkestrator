import { ReportBugDialog } from "@/dialogs/ReportBugDialog";
import { ReportClientBugDialog } from "@/dialogs/ReportClientBugDialog";
import { ExportToFileDialog } from "@/lib/export/ExportToFileDialog";
import { createDialogProvider } from "@/lib/generic/providers/DialogProvider";
import { derivedRecord } from "@/lib/module-host/lazy";
import { MODULE_DIALOGS } from "./modules/registries";
import type { ModuleDialogs } from "./modules/dialogTypes";

/** Dialogs the host owns: not one module's, reachable from anywhere. */
const HOST_DIALOGS = {
  reportbug: ReportBugDialog,
  reportclientbug: ReportClientBugDialog,
  // any smart model → a file on disk (drag-out to the desktop, "Export to file")
  exporttofile: ExportToFileDialog,
};

/**
 * The dialog registry: the host's own plus every module's `dialogs` builtin
 * (`<module>/module.tsx`). Lazy, so importing this for `useDialog` never
 * evaluates a module's builtins (see `app/modules/registries`).
 */
export const { DialogProvider, useDialog, registry } = createDialogProvider(
  derivedRecord(() => ({ ...HOST_DIALOGS, ...MODULE_DIALOGS })) as typeof HOST_DIALOGS & ModuleDialogs,
);
