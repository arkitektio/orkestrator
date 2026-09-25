import { defineModule } from "@/lib/module-host/define";
import { SoloBroadcastDisplay } from "./displays/SoloBroadcastDisplay";
import { manifest } from "./manifest";
import { LOVEKIT_NAV_LINKS } from "./navLinks";

export const LOVEKIT_MODULE = defineModule({
  manifest,
  builtins: {
    page: () => import("./LovekitModule"),
    nav: () => import("./panes/StandardPane"),
    navLinks: LOVEKIT_NAV_LINKS,
    displays: {
      "@lovekit/solo_broadcast": SoloBroadcastDisplay,
    },
  },
});
