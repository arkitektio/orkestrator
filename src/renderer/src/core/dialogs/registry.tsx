import { createDialogProvider } from "@/core/dialogs/DialogProvider";
import { derivedRecord } from "@/core/modules/host/lazy";
import { MODULE_DIALOGS } from "../modules/registries";
import { HOST_DIALOGS } from "./host";
import type { DialogRegistry } from "@/core/modules/types";

/**
 * The dialog registry: every module's `dialogs` builtin
 * (`<module>/dialogRegistry.ts`), then the host's own (`./host`), by id.
 * Derived, so importing this for `useDialog` never evaluates a module's
 * builtins, and a module arriving later brings its dialogs (see
 * `app/modules/registries`).
 */
export const { DialogProvider, useDialog, registry } = createDialogProvider(
  derivedRecord(() => ({ ...MODULE_DIALOGS, ...HOST_DIALOGS })) as DialogRegistry,
);
