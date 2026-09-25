import { defineModule } from "@/core/lib/module-host/define";
import { FLUSS_DIALOGS } from "./dialogRegistry";
import { manifest } from "./manifest";
import { FLUSS_NAV_LINKS } from "./navLinks";
import { ImplementationFlow } from "./sections/ImplementationFlow";
import { TaskFlow } from "./sections/TaskFlow";

export const FLUSS_MODULE = defineModule({
  manifest,
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
