import { defineModule } from "@/lib/module-host/define";
import { FLUSS_DIALOGS } from "./dialogRegistry";
import { manifest } from "./manifest";
import { ImplementationFlow } from "./sections/ImplementationFlow";
import { TaskFlow } from "./sections/TaskFlow";

export const FLUSS_MODULE = defineModule({
  manifest,
  builtins: {
    page: () => import("./ReaktionModule"),
    nav: () => import("./panes/SearchPane"),
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
