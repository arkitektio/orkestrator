import { createDialogProvider } from "@/core/lib/generic/providers/DialogProvider";
import { derivedRecord } from "@/core/lib/module-host/lazy";
import { MODULE_DIALOGS } from "./modules/registries";
import type { ModuleDialogs } from "./modules/dialogTypes";

/**
 * The dialog registry: every module's `dialogs` builtin
 * (`<module>/dialogRegistry.ts`), by id. Derived, so importing this for
 * `useDialog` never evaluates a module's builtins, and a module arriving later
 * brings its dialogs (see `app/modules/registries`).
 */
export const { DialogProvider, useDialog, registry } = createDialogProvider(
  derivedRecord(() => ({ ...MODULE_DIALOGS })) as ModuleDialogs,
);
