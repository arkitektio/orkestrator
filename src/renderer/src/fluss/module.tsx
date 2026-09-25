import { defineModule } from "@/core/modules/host/define";
import { FLUSS_DIALOGS } from "./dialogRegistry";
import { manifest } from "./manifest";
import { service } from "./service";
import { FLUSS_NAV_LINKS } from "./navLinks";
import { ImplementationFlow } from "./sections/ImplementationFlow";
import { TaskFlow } from "./sections/TaskFlow";

export const FLUSS_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
    page: () => import("./ReaktionModule"),
    nav: () => import("./panes/SearchPane"),
    navLinks: FLUSS_NAV_LINKS,
    dialogs: FLUSS_DIALOGS,
    pageSections: [
      {
        id: "fluss.implementationflow",
        title: "Flow",
        placement: "main",
        match: { identifiers: ["@rekuest/implementation"] },
        Component: ImplementationFlow,
      },
      {
        id: "fluss.taskflow",
        title: "Flow",
        placement: "main",
        match: { identifiers: ["@rekuest/task"] },
        Component: TaskFlow,
      },
    ],
  },
});
