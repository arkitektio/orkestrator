import { Home, Radio, Video } from "lucide-react";

import type { NavLinkDecl } from "@/core/modules/host/define";

/** lovekit's pages, for the ⌘K palette and its rail popout (a `navLinks` builtin). */
export const LOVEKIT_NAV_LINKS: NavLinkDecl[] = [
  { label: "Dashboard", route: "/lovekit", group: "Streams", icon: Home, home: true },
  { label: "Streams", route: "/lovekit/streams", group: "Streams", icon: Video, description: "Live video streams" },
  { label: "Solo Broadcasts", route: "/lovekit/solobroadcasts", group: "Streams", icon: Radio, description: "One-to-many broadcasts" },
];
