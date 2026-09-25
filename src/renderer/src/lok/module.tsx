import { defineModule } from "@/lib/module-host/define";
import { LOK_ACTIONS } from "./actions";
import { LOK_DIALOGS } from "./dialogRegistry";
import { UserDisplay } from "./displays/UserDisplay";
import { manifest } from "./manifest";
import { LokEntitySearch } from "./search";

export const LOK_MODULE = defineModule({
  manifest,
  builtins: {
    page: () => import("./LokNextModule"),
    nav: () => import("./panes/StandardPane"),
    displays: {
      "@lok/user": UserDisplay,
    },
    dialogs: LOK_DIALOGS,
    actions: LOK_ACTIONS,
    search: LokEntitySearch,
  },
});
