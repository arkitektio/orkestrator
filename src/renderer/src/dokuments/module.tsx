import { defineModule } from "@/core/modules/host/define";
import { shareWorkflowOperation } from "@/core/collaborations/shareWorkflow";
import { ShareWorkflowDocument } from "./api/graphql";
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
    // A workflow shared from rekuest asks every service for what it made (core/collaborations).
    operations: { "dokuments.shareWorkflow": shareWorkflowOperation(service.key, ShareWorkflowDocument) },
    page: () => import("./DokumentsModule"),
    navLinks: DOKUMENTS_NAV_LINKS,
    displays: {
      "@dokuments/file": FileDisplay,
      "@dokuments/document": DocumentDisplay,
      "@dokuments/page": PageDisplay,
    },
  },
});
