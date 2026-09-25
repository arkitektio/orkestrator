import { defineModule } from "@/core/lib/module-host/define";
import { LOK_ACTIONS } from "./actions";
import { LOK_DIALOGS } from "./dialogRegistry";
import { LokDashboardWidgets } from "./dashboard/LokDashboardWidgets";
import { ClientDisplay } from "./displays/ClientDisplay";
import { DeviceDisplay } from "./displays/DeviceDisplay";
import { UserDisplay } from "./displays/UserDisplay";
import { manifest } from "./manifest";
import { LOK_NAV_LINKS } from "./navLinks";
import { LOK_OPTION_SOURCES } from "./options";
import { LokEntitySearch } from "./search";

export const LOK_MODULE = defineModule({
  manifest,
  builtins: {
    page: () => import("./LokNextModule"),
    nav: () => import("./panes/StandardPane"),
    navLinks: LOK_NAV_LINKS,
    displays: {
      "@lok/user": UserDisplay,
      "@lok/client": ClientDisplay,
      "@lok/device": DeviceDisplay,
    },
    dialogs: LOK_DIALOGS,
    actions: LOK_ACTIONS,
    search: LokEntitySearch,
    optionSources: LOK_OPTION_SOURCES,
    // The Notifications and Team dashboard widgets.
    background: [LokDashboardWidgets],
  },
});
