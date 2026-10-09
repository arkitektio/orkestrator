import { defineModule } from "@/core/modules/host/define";
import { LOVEKIT_ACTIONS } from "./actions";
import { CallConnection } from "./call/CallConnection";
import { CallInviteNotifications } from "./call/CallInviteNotifications";
import { CallIsland } from "./call/CallIsland";
import { CallInvitesWatcher } from "./call/invites";
import { JoinCallsSection } from "./call/JoinCallsSection";
import { StructureCallsSection } from "./call/StructureCallsSection";
import { LOVEKIT_DIALOGS } from "./dialogRegistry";
import { CallDisplay } from "./displays/CallDisplay";
import { SoloBroadcastDisplay } from "./displays/SoloBroadcastDisplay";
import { manifest } from "./manifest";
import { service } from "./service";
import { LOVEKIT_NAV_LINKS } from "./navLinks";

export const LOVEKIT_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
    page: () => import("./LovekitModule"),
    navLinks: LOVEKIT_NAV_LINKS,
    displays: {
      "@lovekit/solo_broadcast": SoloBroadcastDisplay,
      "@lovekit/call": CallDisplay,
    },
    actions: LOVEKIT_ACTIONS,
    dialogs: LOVEKIT_DIALOGS,
    pageSections: [
      {
        // The live calls about any object: the host's Chat sidebar, beside
        // the text conversations.
        id: "lovekit.calls",
        title: "Calls",
        placement: "sidebar",
        slot: "chat",
        match: {},
        Component: StructureCallsSection,
      },
      {
        // "Join calls": the organization's calls in progress, on every
        // member's home page. Open to all; no invitation needed.
        id: "lovekit.joincalls",
        title: "Join calls",
        placement: "main",
        slot: "home",
        match: { identifiers: ["@lok/user"] },
        Component: JoinCallsSection,
      },
      {
        // What is sent to a person: the invitations ringing for them.
        id: "lovekit.callinvites",
        title: "Call invitations",
        placement: "sidebar",
        slot: "notifications",
        match: { identifiers: ["@lok/user"] },
        Component: CallInviteNotifications,
      },
    ],
    // The call's connection outlives the page it was joined from; the
    // invitations ring on every device the app is open on.
    background: [CallConnection, CallInvitesWatcher],
    railIslands: [CallIsland],
  },
});
