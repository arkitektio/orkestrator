import { Box, GitBranch, Home, ShieldCheck, ShoppingCart } from "lucide-react";

import type { NavLinkDecl } from "@/core/modules/host/define";

/** kabinet's pages, for the ⌘K palette and its rail popout (a `navLinks` builtin). */
export const KABINET_NAV_LINKS: NavLinkDecl[] = [
  { label: "Dashboard", route: "/kabinet/home", group: "Explore", icon: Home, home: true },
  { label: "App Store", route: "/kabinet/app-store", keywords: ["install", "apps"], group: "Explore", icon: ShoppingCart, description: "Install apps" },
  { label: "Repos", route: "/kabinet/repos", keywords: ["repositories"], group: "Explore", icon: GitBranch, description: "App repositories" },
  { label: "Approvals", route: "/kabinet/approvals", keywords: ["mandates", "installed", "permissions", "revoke"], group: "Explore", icon: ShieldCheck, description: "Releases you allowed to run as you" },
  { label: "Pods", route: "/kabinet/pods", keywords: ["containers"], group: "Explore", icon: Box, description: "Running containers" },
];
