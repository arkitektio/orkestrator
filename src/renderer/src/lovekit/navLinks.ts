import { Home, Phone, Video } from "lucide-react";

import type { NavLinkDecl } from "@/core/modules/host/define";

/** lovekit's pages, for the ⌘K palette and its rail popout (a `navLinks` builtin). */
export const LOVEKIT_NAV_LINKS: NavLinkDecl[] = [
  { label: "Dashboard", route: "/lovekit", group: "Streams", icon: Home, home: true },
  { label: "Streams", route: "/lovekit/streams", group: "Streams", icon: Video, description: "The live cameras and microphones apps offer", keywords: ["camera", "live"] },
  { label: "Calls", route: "/lovekit/calls", group: "Calls", icon: Phone, description: "Video calls in progress", keywords: ["video", "meeting"] },
];
