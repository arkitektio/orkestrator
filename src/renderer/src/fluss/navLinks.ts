import { Code2, GitBranch, Home, Play, SquareTerminal, Workflow } from "lucide-react";

import type { NavLinkDecl } from "@/core/modules/host/define";

/** fluss's pages, for the ⌘K palette and its rail popout (a `navLinks` builtin). */
export const FLUSS_NAV_LINKS: NavLinkDecl[] = [
  { label: "Dashboard", route: "/fluss/home", keywords: ["workflows", "flows"], group: "Explore", icon: Home, home: true },
  { label: "Workspaces", route: "/fluss/workspaces", keywords: ["workflows", "flows"], group: "Explore", icon: Workflow, description: "Your workflow designs" },
  { label: "Runs", route: "/fluss/runs", keywords: ["executions"], group: "Explore", icon: Play, description: "Past and running flows" },
  { label: "Flows", route: "/fluss/flows", keywords: ["workflows", "versions"], group: "Explore", icon: GitBranch, description: "Every saved flow" },
  { label: "Python flows", route: "/fluss/python", keywords: ["workflows", "code", "script", "monty"], group: "Explore", icon: Code2, description: "Flows written as Python" },
  { label: "Python runs", route: "/fluss/pythonruns", keywords: ["executions", "code", "script"], group: "Explore", icon: SquareTerminal, description: "Past and running Python flows" },
];
