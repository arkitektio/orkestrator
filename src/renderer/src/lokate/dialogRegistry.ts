import { DeletePlaceForm } from "./forms/DeletePlaceForm";
import { DeleteServerCopyForm } from "./forms/DeleteServerCopyForm";
import { PlaceForm } from "./forms/PlaceForm";

/**
 * lokate's dialogs, by id (a `dialogs` builtin). Its own file, apart from
 * `module.tsx`, so the host can type `openDialog` from it.
 */
export const LOKATE_DIALOGS = {
  lokatedeleteservercopy: DeleteServerCopyForm,
  lokateplace: PlaceForm,
  lokatedeleteplace: DeletePlaceForm,
};
