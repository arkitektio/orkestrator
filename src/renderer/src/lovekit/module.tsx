import { defineModule } from "@/core/lib/module-host/define";
import { SoloBroadcastDisplay } from "./displays/SoloBroadcastDisplay";
import { manifest } from "./manifest";
import { service } from "./service";
import { LOVEKIT_NAV_LINKS } from "./navLinks";

export const LOVEKIT_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
    page: () => import("./LovekitModule"),
    nav: () => import("./panes/StandardPane"),
    navLinks: LOVEKIT_NAV_LINKS,
    displays: {
      "@lovekit/solo_broadcast": SoloBroadcastDisplay,
    },
  },
});
