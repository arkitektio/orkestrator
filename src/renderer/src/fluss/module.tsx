import { defineModule } from "@/lib/module-host/define";
import { FLUSS_DIALOGS } from "./dialogRegistry";
import { manifest } from "./manifest";

export const FLUSS_MODULE = defineModule({
  manifest,
  builtins: {
    page: () => import("./ReaktionModule"),
    nav: () => import("./panes/SearchPane"),
    dialogs: FLUSS_DIALOGS,
  },
});
