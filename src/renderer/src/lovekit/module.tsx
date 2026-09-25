import { defineModule } from "@/lib/module-host/define";
import { SoloBroadcastDisplay } from "./displays/SoloBroadcastDisplay";
import { manifest } from "./manifest";

export const LOVEKIT_MODULE = defineModule({
  manifest,
  builtins: {
    page: () => import("./LovekitModule"),
    nav: () => import("./panes/StandardPane"),
    displays: {
      "@lovekit/solo_broadcast": SoloBroadcastDisplay,
    },
  },
});
