import { DeleteServerCopyForm } from "./forms/DeleteServerCopyForm";

/**
 * lokate's dialogs, by id (a `dialogs` builtin). Its own file, apart from
 * `module.tsx`, so the host can type `openDialog` from it.
 */
export const LOKATE_DIALOGS = {
  lokatedeleteservercopy: DeleteServerCopyForm,
};
