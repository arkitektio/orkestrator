import {
  Archive,
  Blocks,
  Building2,
  FileJson,
  FunctionSquare,
  Home,
  Keyboard,
  LayoutDashboard,
  Link2,
  ListChecks,
  Orbit,
  Puzzle,
  Radio,
  RotateCcw,
  Server,
  Wrench,
  Zap,
} from "lucide-react";

import type { NavLinkDecl } from "@/core/modules/host/define";

/** rekuest's pages, for the ⌘K palette and its rail popout (a `navLinks` builtin). */
export const REKUEST_NAV_LINKS: NavLinkDecl[] = [
  { label: "Home", route: "/rekuest/home", group: "Run", icon: Home, home: true },
  { label: "Actions", route: "/rekuest/actions", keywords: ["nodes", "functions"], group: "Run", icon: FunctionSquare, description: "Everything your apps can do" },
  { label: "Tasks", route: "/rekuest/tasks", keywords: ["assignations", "runs"], group: "Run", icon: ListChecks, description: "Your running and past tasks" },
  { label: "Org Tasks", route: "/rekuest/org-tasks", keywords: ["organization"], group: "Run", icon: Building2, description: "Tasks across the team" },
  { label: "Automations", route: "/rekuest/automations", keywords: ["schedules", "cron", "jobs", "recurring", "timer", "triggers", "rules", "on create", "events"], group: "Automate", icon: Zap, description: "Actions that run on a clock or when data changes" },
  { label: "Signals", route: "/rekuest/signals", keywords: ["events", "created", "updated", "deleted"], group: "Automate", icon: Radio, description: "What services announced" },
  { label: "Firings", route: "/rekuest/firings", keywords: ["triggers", "fired", "rejected", "replay", "log"], group: "Automate", icon: RotateCcw, description: "What triggers did with each signal" },
  { label: "Wiregrams", route: "/rekuest/wiregrams", keywords: ["import", "export", "automation documents"], group: "Automate", icon: FileJson, description: "Imported sets of automations" },
  { label: "Implementations", route: "/rekuest/implementations", keywords: ["templates"], group: "Apps", icon: Puzzle, description: "Actions per app" },
  { label: "Toolboxes", route: "/rekuest/toolboxes", group: "Apps", icon: Wrench, description: "Grouped actions" },
  { label: "Spaces", route: "/rekuest/spaces", group: "Apps", icon: Orbit, description: "Where agents live" },
  { label: "Services", route: "/rekuest/services", keywords: ["signals", "structures", "declared"], group: "Apps", icon: Server, description: "Who sends signals and owns structures" },
  { label: "Dashboards", route: "/rekuest/dashboards", group: "Interfaces", icon: LayoutDashboard, description: "Agent dashboards" },
  { label: "Bloks", route: "/rekuest/bloks", group: "Interfaces", icon: Blocks, description: "App-provided UI" },
  { label: "Shortcuts", route: "/rekuest/shortcuts", keywords: ["keyboard"], group: "Interfaces", icon: Keyboard, description: "Saved one-click runs" },
  { label: "Memory Shelves", route: "/rekuest/memoryshelves", keywords: ["memory", "drawers"], group: "Apps", icon: Archive, description: "What agents keep in memory" },
  { label: "Resolutions", route: "/rekuest/resolutions", keywords: ["dependencies", "resolved"], group: "Apps", icon: Link2, description: "Resolved dependencies" },
];
