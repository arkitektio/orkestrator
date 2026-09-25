import { defineModule } from "@/lib/module-host/define";
import { ALPAKA_ACTIONS } from "./actions";
import { MessageDisplay } from "./displays/MessageDisplay";
import { ALPAKA_DIALOGS } from "./dialogRegistry";
import { manifest } from "./manifest";
import { ALPAKA_SECTIONS } from "./smart/sections";

export const ALPAKA_MODULE = defineModule({
  manifest,
  builtins: {
    page: () => import("./AlpakaModule"),
    nav: () => import("./panes/StandardPane"),
    displays: {
      "@alpaka/message": MessageDisplay,
    },
    dialogs: ALPAKA_DIALOGS,
    actions: ALPAKA_ACTIONS,
    sections: ALPAKA_SECTIONS,
  },
});
