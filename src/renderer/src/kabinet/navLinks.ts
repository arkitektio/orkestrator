import { Box, Cpu, FunctionSquare, GitBranch, Home, Layers, Server, ShieldCheck, ShoppingCart, Tag } from "lucide-react";

import type { NavLinkDecl } from "@/core/modules/host/define";

/** kabinet's pages, for the ⌘K palette and its rail popout (a `navLinks` builtin). */
export const KABINET_NAV_LINKS: NavLinkDecl[] = [
  { label: "Dashboard", route: "/kabinet/home", group: "Explore", icon: Home, home: true },
  { label: "App Store", route: "/kabinet/app-store", keywords: ["install", "apps"], group: "Explore", icon: ShoppingCart, description: "Install apps" },
  { label: "Repos", route: "/kabinet/repos", keywords: ["repositories"], group: "Explore", icon: GitBranch, description: "App repositories" },
  { label: "Approvals", route: "/kabinet/approvals", keywords: ["mandates", "installed", "permissions", "revoke"], group: "Explore", icon: ShieldCheck, description: "Releases you allowed to run as you" },
  { label: "Pods", route: "/kabinet/pods", keywords: ["containers"], group: "Explore", icon: Box, description: "Running containers" },
  { label: "Releases", route: "/kabinet/releases", keywords: ["versions"], group: "Catalog", icon: Tag, description: "Every app version" },
  { label: "Definitions", route: "/kabinet/definitions", keywords: ["actions", "nodes"], group: "Catalog", icon: FunctionSquare, description: "Actions that releases provide" },
  { label: "Flavours", route: "/kabinet/flavours", keywords: ["images", "builds"], group: "Catalog", icon: Layers, description: "Builds of a release" },
  { label: "Backends", route: "/kabinet/backends", keywords: ["deployers", "hosts"], group: "Infrastructure", icon: Server, description: "Where pods run" },
  { label: "Resources", route: "/kabinet/resources", keywords: ["compute", "nodes"], group: "Infrastructure", icon: Cpu, description: "Compute that backends offer" },
];
