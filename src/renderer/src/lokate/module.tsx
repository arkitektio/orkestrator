import { defineModule } from "@/core/modules/host/define";
import { LOKATE_DIALOGS } from "./dialogRegistry";
import { manifest } from "./manifest";
import { LOKATE_NAV_LINKS } from "./navLinks";
import { service } from "./service";

export const LOKATE_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
    page: () => import("./LokateModule"),
    navLinks: LOKATE_NAV_LINKS,
    dialogs: LOKATE_DIALOGS,
  },
});
