import { defineModule } from "@/core/lib/module-host/define";
import { OMEROARK_DIALOGS } from "./dialogRegistry";
import { manifest } from "./manifest";
import { service } from "./service";
import { OMEROARK_NAV_LINKS } from "./navLinks";

export const OMEROARK_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
    page: () => import("./OmeroArkModule"),
    nav: () => import("./panes/StandardPane"),
    navLinks: OMEROARK_NAV_LINKS,
    dialogs: OMEROARK_DIALOGS,
  },
});
