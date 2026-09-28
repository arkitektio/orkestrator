import { defineModule } from "@/core/modules/host/define";
import { LOK_ACTIONS } from "./actions";
import { LOK_DIALOGS } from "./dialogRegistry";
import { LokDashboardWidgets } from "./dashboard/LokDashboardWidgets";
import { ClientDisplay } from "./displays/ClientDisplay";
import { DeviceDisplay } from "./displays/DeviceDisplay";
import { MandateDisplay } from "./displays/MandateDisplay";
import { UserDisplay } from "./displays/UserDisplay";
import { manifest } from "./manifest";
import { LOK_NAV_LINKS } from "./navLinks";
import { LOK_OPERATIONS } from "./operations";
import { LOK_OPTION_SOURCES } from "./options";
import { LokEntitySearch } from "./search";

export const LOK_MODULE = defineModule({
  manifest,
  serviceKey: "self",
  builtins: {
    page: () => import("./LokNextModule"),
    navLinks: LOK_NAV_LINKS,
    displays: {
      "@lok/user": UserDisplay,
      "@lok/client": ClientDisplay,
      "@lok/device": DeviceDisplay,
      "@lok/mandate": MandateDisplay,
    },
    dialogs: LOK_DIALOGS,
    actions: LOK_ACTIONS,
    search: LokEntitySearch,
    optionSources: LOK_OPTION_SOURCES,
    // Kabinet asks lok for a mandate when a release is approved.
    operations: LOK_OPERATIONS,
    // The Notifications and Team dashboard widgets.
    background: [LokDashboardWidgets],
  },
});
