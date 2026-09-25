import type { ALPAKA_DIALOGS } from "@/alpaka/dialogRegistry";
import type { ELEKTRO_DIALOGS } from "@/elektro/dialogRegistry";
import type { FLUSS_DIALOGS } from "@/fluss/dialogRegistry";
import type { KABINET_DIALOGS } from "@/kabinet/dialogRegistry";
import type { KRAPH_DIALOGS } from "@/kraph/dialogRegistry";
import type { LOK_DIALOGS } from "@/lok/dialogRegistry";
import type { MIKRO_DIALOGS } from "@/mikro/dialogRegistry";
import type { OMEROARK_DIALOGS } from "@/omeroark/dialogRegistry";
import type { REKUEST_DIALOGS } from "@/rekuest/dialogRegistry";

/**
 * Every module's dialogs, as one type: what `openDialog(id, props)` checks
 * the props against. Type-only on purpose (see `<module>/dialogRegistry.ts`);
 * the runtime registry is `MODULE_DIALOGS` in `core/modules/registries`.
 */
export type ModuleDialogs = typeof ALPAKA_DIALOGS &
  typeof ELEKTRO_DIALOGS &
  typeof FLUSS_DIALOGS &
  typeof KABINET_DIALOGS &
  typeof KRAPH_DIALOGS &
  typeof LOK_DIALOGS &
  typeof MIKRO_DIALOGS &
  typeof OMEROARK_DIALOGS &
  typeof REKUEST_DIALOGS;

/**
 * The app composes these modules, so it tells core what their dialogs are:
 * `openDialog("createentity", props)` is typed from here (see
 * `core/modules/types.ts`).
 */
declare module "@/core/modules/types" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface DialogRegistry extends ModuleDialogs {}
}
