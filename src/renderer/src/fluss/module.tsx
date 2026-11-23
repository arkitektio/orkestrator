import { defineModule } from "@/core/modules/host/define";
import { shareWorkflowOperation } from "@/core/collaborations/shareWorkflow";
import { ShareWorkflowDocument } from "./api/graphql";
import { FLUSS_ACTIONS } from "./actions";
import { FLUSS_DIALOGS } from "./dialogRegistry";
import { manifest } from "./manifest";
import { service } from "./service";
import { FLUSS_NAV_LINKS } from "./navLinks";
import { FLUSS_PROFILE_FEED } from "./profile/feed";
import { ImplementationFlow } from "./sections/ImplementationFlow";
import { TaskFlow } from "./sections/TaskFlow";

export const FLUSS_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
    // A workflow shared from rekuest asks every service for what it made (core/collaborations).
    operations: { "fluss.shareWorkflow": shareWorkflowOperation(service.key, ShareWorkflowDocument) },
    page: () => import("./ReaktionModule"),
    navLinks: FLUSS_NAV_LINKS,
    dialogs: FLUSS_DIALOGS,
    actions: FLUSS_ACTIONS,
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
    // The workspaces and Python flows they made, in the profile's newest-first feed.
    profileFeed: FLUSS_PROFILE_FEED,
  },
});
