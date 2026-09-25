import { defineModule } from "@/lib/module-host/define";
import { manifest } from "./manifest";

export const DOKUMENTS_MODULE = defineModule({
  manifest,
  builtins: {
    page: () => import("./DokumentsModule"),
    nav: () => import("./panes/StandardPane"),
  },
});
