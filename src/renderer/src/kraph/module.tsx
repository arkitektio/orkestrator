import { defineModule } from "@/core/modules/host/define";
import { KRAPH_ACTIONS } from "./actions";
import { EntityCategoryDisplay } from "./displays/EntityCategoryDisplay";
import { EntityDisplay } from "./displays/EntityDisplay";
import { GraphDisplay } from "./displays/GraphDisplay";
import { InstanceDisplay } from "./displays/InstanceDisplay";
import { LinkDisplay } from "./displays/LinkDisplay";
import { MeasurementDisplay } from "./displays/MeasurementDisplay";
import { MetricDisplay } from "./displays/MetricDisplay";
import { MetricKindDisplay } from "./displays/MetricKindDisplay";
import { NaturalEventCategoryDisplay } from "./displays/NaturalEventCategoryDisplay";
import { NaturalEventDisplay } from "./displays/NaturalEventDisplay";
import { ProtocolEventCategoryDisplay } from "./displays/ProtocolEventCategoryDisplay";
import { ProtocolEventDisplay } from "./displays/ProtocolEventDisplay";
import { RelationCategoryDisplay } from "./displays/RelationCategoryDisplay";
import { RelationDisplay } from "./displays/RelationDisplay";
import { StructureDisplay } from "./displays/StructureDisplay";
import { StructureKindDisplay } from "./displays/StructureKindDisplay";
import { StructureRelationCategoryDisplay } from "./displays/StructureRelationCategoryDisplay";
import { TermDisplay } from "./displays/TermDisplay";
import { KRAPH_DIALOGS } from "./dialogRegistry";
import { manifest } from "./manifest";
import { service } from "./service";
import { KRAPH_NAV_LINKS } from "./navLinks";
import { KnowledgeSidebar } from "./components/sidebars/KnowledgeSidebar";
import { HomeMentions } from "./dashboard/HomeMentions";
import { MentionNotifications } from "./dashboard/MentionNotifications";
import { KraphEntitySearch } from "./search";
import { KRAPH_SECTIONS } from "./smart/sections";

export const KRAPH_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
    page: () => import("./KraphModule"),
    nav: () => import("./panes/StandardPane"),
    navLinks: KRAPH_NAV_LINKS,
    displays: {
      // claims (organization grain, a bare uuid)
      "@kraph/instance": InstanceDisplay,
      "@kraph/link": LinkDisplay,
      // instances
      "@kraph/graph": GraphDisplay,
      "@kraph/entity": EntityDisplay,
      "@kraph/relation": RelationDisplay,
      "@kraph/measurement": MeasurementDisplay,
      "@kraph/structure": StructureDisplay,
      "@kraph/naturalevent": NaturalEventDisplay,
      "@kraph/protocolevent": ProtocolEventDisplay,
      // categories
      "@kraph/entitycategory": EntityCategoryDisplay,
      "@kraph/metric": MetricDisplay,
      "@kraph/metrickind": MetricKindDisplay,
      "@kraph/relationcategory": RelationCategoryDisplay,
      "@kraph/structurerelationcategory": StructureRelationCategoryDisplay,
      "@kraph/naturaleventcategory": NaturalEventCategoryDisplay,
      "@kraph/protocoleventcategory": ProtocolEventCategoryDisplay,
      "@kraph/structurekind": StructureKindDisplay,
      "@kraph/term": TermDisplay,
    },
    dialogs: KRAPH_DIALOGS,
    actions: KRAPH_ACTIONS,
    pageSections: [
      {
        // Claims and comments about any datum: the host's Knowledge sidebar.
        id: "kraph.knowledge",
        title: "Knowledge",
        placement: "sidebar",
        slot: "knowledge",
        match: { datum: true },
        Component: KnowledgeSidebar,
      },
      {
        // The member's mentions on their home dashboard …
        id: "kraph.homementions",
        title: "Latest mentions",
        placement: "main",
        slot: "home",
        match: { identifiers: ["@lok/user"] },
        Component: HomeMentions,
      },
      {
        // … and in the Notifications widget.
        id: "kraph.mentionnotifications",
        title: "Mentions",
        placement: "main",
        slot: "notifications",
        match: { identifiers: ["@lok/user"] },
        Component: MentionNotifications,
      },
    ],
    sections: KRAPH_SECTIONS,
    search: KraphEntitySearch,
  },
});
