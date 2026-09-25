import { defineModule } from "@/core/modules/host/define";
import { KABINET_ACTIONS } from "./actions";
import { PodDisplay } from "./displays/PodDisplay";
import { KABINET_DIALOGS } from "./dialogRegistry";
import { manifest } from "./manifest";
import { service } from "./service";
import { KABINET_NAV_LINKS } from "./navLinks";
import { KABINET_SECTIONS } from "./smart/sections";

export const KABINET_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
    page: () => import("./KabinetModule"),
    nav: () => import("./panes/StandardPane"),
    navLinks: KABINET_NAV_LINKS,
    displays: {
      "@kabinet/pod": PodDisplay,
    },
    dialogs: KABINET_DIALOGS,
    actions: KABINET_ACTIONS,
    sections: KABINET_SECTIONS,
  },
});
