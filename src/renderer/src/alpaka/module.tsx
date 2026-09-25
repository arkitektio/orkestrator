import { defineModule } from "@/lib/module-host/define";
import { ALPAKA_ACTIONS } from "./actions";
import { MessageDisplay } from "./displays/MessageDisplay";
import { ALPAKA_DIALOGS } from "./dialogRegistry";
import { manifest } from "./manifest";
import { StructureRoomsSidebar } from "./sidebars/StructureRoomsSidebar";
import { ALPAKA_SECTIONS } from "./smart/sections";

export const ALPAKA_MODULE = defineModule({
  manifest,
  builtins: {
    page: () => import("./AlpakaModule"),
    nav: () => import("./panes/StandardPane"),
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
  },
});
