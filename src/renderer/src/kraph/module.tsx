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
import { TodoItemDisplay } from "./displays/TodoItemDisplay";
import { KRAPH_DIALOGS } from "./dialogRegistry";
import { manifest } from "./manifest";
import { service } from "./service";
import { KRAPH_NAV_LINKS } from "./navLinks";
import { KnowledgeSidebar } from "./components/sidebars/KnowledgeSidebar";
import { TodoPageTrack } from "./components/todos/TodoPageTrack";
import { HomeTodos } from "./dashboard/HomeTodos";
import { MentionNotifications } from "./dashboard/MentionNotifications";
import { KraphEntitySearch } from "./search";
import { KRAPH_SECTIONS } from "./smart/sections";
import { KRAPH_PROFILE_FEED } from "./profile/feed";
import { KRAPH_PROFILE_SECTIONS } from "./profile/sections";

export const KRAPH_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
    page: () => import("./KraphModule"),
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
      // todo lists
      "@kraph/todoitem": TodoItemDisplay,
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
        // The object's todo track beside every datum page's breadcrumbs.
        id: "kraph.todotrack",
        title: "Todo",
        placement: "actions",
        slot: "pagebar",
        match: { datum: true },
        Component: TodoPageTrack,
      },
      {
        // The member's open todo items on the home page.
        id: "kraph.hometodos",
        title: "My todos",
        placement: "main",
        slot: "home",
        priority: 30,
        match: { identifiers: ["@lok/user"] },
        Component: HomeTodos,
      },
      {
        // The member's mentions, under "Needs you" on the home page.
        id: "kraph.mentionnotifications",
        title: "Mentions",
        placement: "main",
        slot: "notifications",
        match: { identifiers: ["@lok/user"] },
        Component: MentionNotifications,
      },
    ],
    sections: KRAPH_SECTIONS,
    // A member's projects and todo lists, in their profile's sidebar.
    profileSections: KRAPH_PROFILE_SECTIONS,
    // The graphs they made, in the profile's newest-first feed.
    profileFeed: KRAPH_PROFILE_FEED,
    search: KraphEntitySearch,
  },
});
