import type { ALPAKA_DIALOGS } from "@/alpaka/dialogRegistry";
import type { BANK_DIALOGS } from "@/bank/dialogRegistry";
import type { ELEKTRO_DIALOGS } from "@/elektro/dialogRegistry";
import type { FLUSS_DIALOGS } from "@/fluss/dialogRegistry";
import type { KABINET_DIALOGS } from "@/kabinet/dialogRegistry";
import type { KRAPH_DIALOGS } from "@/kraph/dialogRegistry";
import type { KUVERT_DIALOGS } from "@/kuvert/dialogRegistry";
import type { LOK_DIALOGS } from "@/lok/dialogRegistry";
import type { LOKATE_DIALOGS } from "@/lokate/dialogRegistry";
import type { LOVEKIT_DIALOGS } from "@/lovekit/dialogRegistry";
import type { MIKRO_DIALOGS } from "@/mikro/dialogRegistry";
import type { OMEROARK_DIALOGS } from "@/omeroark/dialogRegistry";
import type { REKUEST_DIALOGS } from "@/rekuest/dialogRegistry";
import type { HostDialogs } from "@/core/dialogs/host";

/**
 * Every module's dialogs, and the host's own (`core/dialogs/host`), as one
 * type: what `openDialog(id, props)` checks the props against. Type-only on purpose (see `<module>/dialogRegistry.ts`);
 * the runtime registry is `MODULE_DIALOGS` in `core/modules/registries`.
 */
export type ModuleDialogs = typeof ALPAKA_DIALOGS &
  typeof BANK_DIALOGS &
  typeof ELEKTRO_DIALOGS &
  typeof FLUSS_DIALOGS &
  typeof KABINET_DIALOGS &
  typeof KRAPH_DIALOGS &
  typeof KUVERT_DIALOGS &
  typeof LOK_DIALOGS &
  typeof LOKATE_DIALOGS &
  typeof LOVEKIT_DIALOGS &
  typeof MIKRO_DIALOGS &
  typeof OMEROARK_DIALOGS &
  typeof REKUEST_DIALOGS &
  HostDialogs;

/**
 * The app composes these modules, so it tells core what their dialogs are:
 * `openDialog("createentity", props)` is typed from here (see
 * `core/modules/types.ts`).
 */
declare module "@/core/modules/types" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface DialogRegistry extends ModuleDialogs {}
}
