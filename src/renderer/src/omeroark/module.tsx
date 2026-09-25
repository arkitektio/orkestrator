import { defineModule } from "@/lib/module-host/define";
import { OMEROARK_DIALOGS } from "./dialogRegistry";
import { manifest } from "./manifest";
import { OMEROARK_NAV_LINKS } from "./navLinks";

export const OMEROARK_MODULE = defineModule({
  manifest,
  builtins: {
    page: () => import("./OmeroArkModule"),
    nav: () => import("./panes/StandardPane"),
    navLinks: OMEROARK_NAV_LINKS,
    dialogs: OMEROARK_DIALOGS,
  },
});
