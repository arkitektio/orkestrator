import { Home, Play, Workflow } from "lucide-react";

import type { NavLinkDecl } from "@/core/modules/host/define";

/** fluss's pages, for the ⌘K palette and its rail popout (a `navLinks` builtin). */
export const FLUSS_NAV_LINKS: NavLinkDecl[] = [
  { label: "Dashboard", route: "/fluss/home", keywords: ["workflows", "flows"], group: "Explore", icon: Home, home: true },
  { label: "Workspaces", route: "/fluss/workspaces", keywords: ["workflows", "flows"], group: "Explore", icon: Workflow, description: "Your workflow designs" },
  { label: "Runs", route: "/fluss/runs", keywords: ["executions"], group: "Explore", icon: Play, description: "Past and running flows" },
];
