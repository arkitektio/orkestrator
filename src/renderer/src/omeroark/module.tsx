import { defineModule } from "@/core/modules/host/define";
import { OMEROARK_DIALOGS } from "./dialogRegistry";
import { DatasetDisplay } from "./displays/DatasetDisplay";
import { ImageDisplay } from "./displays/ImageDisplay";
import { ProjectDisplay } from "./displays/ProjectDisplay";
import { manifest } from "./manifest";
import { service } from "./service";
import { OMEROARK_NAV_LINKS } from "./navLinks";

export const OMEROARK_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
    page: () => import("./OmeroArkModule"),
    navLinks: OMEROARK_NAV_LINKS,
    displays: {
      "@omeroark/project": ProjectDisplay,
      "@omeroark/dataset": DatasetDisplay,
      "@omeroark/image": ImageDisplay,
    },
    dialogs: OMEROARK_DIALOGS,
  },
});
