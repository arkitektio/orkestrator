import { defineModule } from "@/core/modules/host/define";
import { KUVERT_ACTIONS } from "./actions";
import { KUVERT_AUTH_FLOW } from "./authFlow";
import { KUVERT_DIALOGS } from "./dialogRegistry";
import { MailAccountDisplay } from "./displays/MailAccountDisplay";
import { MessageDisplay } from "./displays/MessageDisplay";
import { TaskDisplay } from "./displays/TaskDisplay";
import { ThreadDisplay } from "./displays/ThreadDisplay";
import { manifest } from "./manifest";
import { KUVERT_NAV_LINKS } from "./navLinks";
import { KuvertEntitySearch } from "./search";
import { ComposeSource } from "./palette/ComposeSource";
import { service } from "./service";

export const KUVERT_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
    page: () => import("./KuvertModule"),
    navLinks: KUVERT_NAV_LINKS,
    displays: {
      "@kuvert/account": MailAccountDisplay,
      "@kuvert/thread": ThreadDisplay,
      "@kuvert/message": MessageDisplay,
      "@kuvert/task": TaskDisplay,
    },
    dialogs: KUVERT_DIALOGS,
    actions: KUVERT_ACTIONS,
    authFlow: KUVERT_AUTH_FLOW,
    search: KuvertEntitySearch,
    paletteSources: [ComposeSource],
  },
});
