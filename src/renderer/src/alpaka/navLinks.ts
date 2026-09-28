import { Boxes, Bot, Home, MessagesSquare, Server } from "lucide-react";

import type { NavLinkDecl } from "@/core/modules/host/define";

/** alpaka's pages, for the ⌘K palette and its rail popout (a `navLinks` builtin). */
export const ALPAKA_NAV_LINKS: NavLinkDecl[] = [
  { label: "Home", route: "/alpaka", group: "Explore", icon: Home, home: true },
  { label: "Rooms", route: "/alpaka/rooms", keywords: ["chat", "talk"], group: "Explore", icon: MessagesSquare, description: "Conversations with agents" },
  { label: "Collections", route: "/alpaka/collections", group: "Explore", icon: Boxes, description: "Document collections" },
  { label: "Models", route: "/alpaka/llmmodels", keywords: ["llm"], group: "Explore", icon: Bot, description: "Available language models" },
  { label: "Providers", route: "/alpaka/providers", group: "Explore", icon: Server, description: "Model providers" },
];
