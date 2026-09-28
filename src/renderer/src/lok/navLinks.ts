import { AppWindow, Boxes, Cpu, Server, Ticket, User, UserCircle, Users, LayoutGrid } from "lucide-react";

import type { NavLinkDecl } from "@/core/modules/host/define";

/** lok's pages, for the ⌘K palette and its rail popout (a `navLinks` builtin). */
export const LOK_NAV_LINKS: NavLinkDecl[] = [
  { label: "Members", route: "/lok", keywords: ["people", "organization", "users"], group: "Team", icon: Users, home: true },
  { label: "Me", route: "/lok/me", keywords: ["profile", "account"], group: "Team", icon: UserCircle, description: "Your profile" },
  { label: "Overview", route: "/lok/overview", keywords: ["dashboard", "lok"], group: "Team", icon: LayoutGrid, description: "The organization at a glance" },
  { label: "Users", route: "/lok/users", group: "Admin", icon: User, description: "Every account" },
  { label: "Apps", route: "/lok/apps", keywords: ["clients"], group: "Admin", icon: AppWindow, description: "Registered clients" },
  { label: "Services", route: "/lok/services", group: "Admin", icon: Server, description: "Known service types" },
  { label: "Instances", route: "/lok/instances", group: "Admin", icon: Boxes, description: "Deployed services" },
  { label: "Redeem Tokens", route: "/lok/redeemtokens", group: "Admin", icon: Ticket, description: "App registration tokens" },
  { label: "Devices", route: "/lok/devices", keywords: ["compute", "nodes"], group: "Admin", icon: Cpu, description: "Compute nodes" },
];
