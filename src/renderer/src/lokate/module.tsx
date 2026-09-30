import { defineModule } from "@/core/modules/host/define";
import { LOKATE_ACTIONS } from "./actions";
import { LOKATE_DIALOGS } from "./dialogRegistry";
import { PlaceDisplay } from "./displays/PlaceDisplay";
import { TripDisplay } from "./displays/TripDisplay";
import { VisitDisplay } from "./displays/VisitDisplay";
import { manifest } from "./manifest";
import { LOKATE_NAV_LINKS } from "./navLinks";
import { LokateEntitySearch } from "./search";
import { service } from "./service";

export const LOKATE_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
    page: () => import("./LokateModule"),
    navLinks: LOKATE_NAV_LINKS,
    displays: {
      "@lokate/place": PlaceDisplay,
      "@lokate/visit": VisitDisplay,
      "@lokate/trip": TripDisplay,
    },
    dialogs: LOKATE_DIALOGS,
    actions: LOKATE_ACTIONS,
    search: LokateEntitySearch,
  },
});
