import { defineModule } from "@/core/lib/module-host/define";
import { ALPAKA_ACTIONS } from "./actions";
import { MessageDisplay } from "./displays/MessageDisplay";
import { ALPAKA_DIALOGS } from "./dialogRegistry";
import { manifest } from "./manifest";
import { service } from "./service";
import { ALPAKA_OPERATIONS } from "./operations";
import { ALPAKA_NAV_LINKS } from "./navLinks";
import { AskSource } from "./palette/AskSource";
import { TalkAboutHit } from "./palette/TalkAboutHit";
import { StructureRoomsSidebar } from "./sidebars/StructureRoomsSidebar";
import { ALPAKA_SECTIONS } from "./smart/sections";

export const ALPAKA_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
    page: () => import("./AlpakaModule"),
    nav: () => import("./panes/StandardPane"),
    navLinks: ALPAKA_NAV_LINKS,
    displays: {
      "@alpaka/message": MessageDisplay,
    },
    dialogs: ALPAKA_DIALOGS,
    actions: ALPAKA_ACTIONS,
    pageSections: [
      {
        // Conversations about any model: the host's Chat sidebar.
        id: "alpaka.rooms",
        title: "Chat",
        placement: "sidebar",
        slot: "chat",
        match: {},
        Component: StructureRoomsSidebar,
      },
    ],
    sections: ALPAKA_SECTIONS,
    paletteSources: [AskSource],
    operations: ALPAKA_OPERATIONS,
    paletteHitActions: [TalkAboutHit],
  },
});
