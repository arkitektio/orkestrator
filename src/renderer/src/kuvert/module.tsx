import { defineModule } from "@/core/modules/host/define";
import { KUVERT_ACTIONS } from "./actions";
import { KUVERT_DIALOGS } from "./dialogRegistry";
import { MailAccountDisplay } from "./displays/MailAccountDisplay";
import { MessageDisplay } from "./displays/MessageDisplay";
import { ThreadDisplay } from "./displays/ThreadDisplay";
import { manifest } from "./manifest";
import { KUVERT_NAV_LINKS } from "./navLinks";
import { KuvertEntitySearch } from "./search";
import { service } from "./service";

export const KUVERT_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
    page: () => import("./KuvertModule"),
    nav: () => import("./panes/StandardPane"),
    navLinks: KUVERT_NAV_LINKS,
    displays: {
      "@kuvert/account": MailAccountDisplay,
      "@kuvert/thread": ThreadDisplay,
      "@kuvert/message": MessageDisplay,
    },
    dialogs: KUVERT_DIALOGS,
    actions: KUVERT_ACTIONS,
    search: KuvertEntitySearch,
  },
});
