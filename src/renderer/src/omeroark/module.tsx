import { defineModule } from "@/lib/module-host/define";
import { OMEROARK_DIALOGS } from "./dialogRegistry";
import { manifest } from "./manifest";

export const OMEROARK_MODULE = defineModule({
  manifest,
  builtins: {
    page: () => import("./OmeroArkModule"),
    nav: () => import("./panes/StandardPane"),
    dialogs: OMEROARK_DIALOGS,
  },
});
