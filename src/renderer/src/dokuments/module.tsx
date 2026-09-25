import { defineModule } from "@/core/modules/host/define";
import { manifest } from "./manifest";
import { service } from "./service";

export const DOKUMENTS_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
    page: () => import("./DokumentsModule"),
    nav: () => import("./panes/StandardPane"),
  },
});
