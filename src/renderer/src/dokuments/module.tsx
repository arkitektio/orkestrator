import { defineModule } from "@/core/modules/host/define";
import { DocumentDisplay } from "./displays/DocumentDisplay";
import { FileDisplay } from "./displays/FileDisplay";
import { PageDisplay } from "./displays/PageDisplay";
import { manifest } from "./manifest";
import { DOKUMENTS_NAV_LINKS } from "./navLinks";
import { service } from "./service";

export const DOKUMENTS_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
    page: () => import("./DokumentsModule"),
    navLinks: DOKUMENTS_NAV_LINKS,
    displays: {
      "@dokuments/file": FileDisplay,
      "@dokuments/document": DocumentDisplay,
      "@dokuments/page": PageDisplay,
    },
  },
});
