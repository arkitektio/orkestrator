import { AppWindow, Boxes, Cpu, KeyRound, Server, Ticket, User, UserCircle, Users, LayoutGrid } from "lucide-react";

import { ADMIN_ROLE } from "@/core/connection/roles";
import type { NavLinkDecl } from "@/core/modules/host/define";

/** lok's pages, for the ⌘K palette and its rail popout (a `navLinks` builtin). */
export const LOK_NAV_LINKS: NavLinkDecl[] = [
  { label: "Members", route: "/lok", keywords: ["people", "organization", "users"], group: "Team", icon: Users, home: true },
  { label: "Me", route: "/lok/me", keywords: ["profile", "account"], group: "Team", icon: UserCircle, description: "Your profile" },
  { label: "Mandates", route: "/lok/mandates", keywords: ["approvals", "installed apps", "act as me", "revoke"], group: "Team", icon: KeyRound, description: "Apps allowed to act as you" },
  { label: "Overview", route: "/lok/overview", keywords: ["dashboard", "lok"], group: "Team", icon: LayoutGrid, description: "The organization at a glance" },
  { label: "Users", route: "/lok/users", group: "Admin", icon: User, description: "Every account", roles: ADMIN_ROLE },
  { label: "Apps", route: "/lok/apps", keywords: ["clients"], group: "Admin", icon: AppWindow, description: "Registered clients", roles: ADMIN_ROLE },
  { label: "Services", route: "/lok/services", group: "Admin", icon: Server, description: "Known service types", roles: ADMIN_ROLE },
  { label: "Instances", route: "/lok/instances", group: "Admin", icon: Boxes, description: "Deployed services", roles: ADMIN_ROLE },
  { label: "Redeem Tokens", route: "/lok/redeemtokens", group: "Admin", icon: Ticket, description: "App registration tokens", roles: ADMIN_ROLE },
  { label: "Devices", route: "/lok/devices", keywords: ["compute", "nodes"], group: "Admin", icon: Cpu, description: "Compute nodes", roles: ADMIN_ROLE },
];
