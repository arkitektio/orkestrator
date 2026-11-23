import { defineModule } from "@/core/modules/host/define";
import { shareWorkflowOperation } from "@/core/collaborations/shareWorkflow";
import { ShareWorkflowDocument } from "./api/graphql";
import { KABINET_ACTIONS } from "./actions";
import { PodDisplay } from "./displays/PodDisplay";
import { KABINET_DIALOGS } from "./dialogRegistry";
import { KABINET_INTENTS } from "./intents";
import { manifest } from "./manifest";
import { service } from "./service";
import { KABINET_NAV_LINKS } from "./navLinks";
import { KABINET_SECTIONS } from "./smart/sections";

export const KABINET_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
    // A workflow shared from rekuest asks every service for what it made (core/collaborations).
    operations: { "kabinet.shareWorkflow": shareWorkflowOperation(service.key, ShareWorkflowDocument) },
    page: () => import("./KabinetModule"),
    navLinks: KABINET_NAV_LINKS,
    displays: {
      "@kabinet/pod": PodDisplay,
    },
    dialogs: KABINET_DIALOGS,
    actions: KABINET_ACTIONS,
    sections: KABINET_SECTIONS,
    intents: KABINET_INTENTS,
  },
});
