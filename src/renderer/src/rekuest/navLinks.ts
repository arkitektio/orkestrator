import {
  AlarmClock,
  Blocks,
  Building2,
  FunctionSquare,
  Home,
  Keyboard,
  LayoutDashboard,
  ListChecks,
  Orbit,
  Puzzle,
  Radio,
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
  { label: "Schedules", route: "/rekuest/schedules", keywords: ["cron", "jobs", "recurring", "timer"], group: "Automate", icon: AlarmClock, description: "Actions that run on a clock" },
  { label: "Triggers", route: "/rekuest/triggers", keywords: ["automation", "on create", "rules", "events"], group: "Automate", icon: Zap, description: "Actions that run when data changes" },
  { label: "Signals", route: "/rekuest/signals", keywords: ["events", "created", "updated", "deleted"], group: "Automate", icon: Radio, description: "What services announced" },
  { label: "Implementations", route: "/rekuest/implementations", keywords: ["templates"], group: "Apps", icon: Puzzle, description: "Actions per app" },
  { label: "Toolboxes", route: "/rekuest/toolboxes", group: "Apps", icon: Wrench, description: "Grouped actions" },
  { label: "Spaces", route: "/rekuest/spaces", group: "Apps", icon: Orbit, description: "Where agents live" },
  { label: "Dashboards", route: "/rekuest/dashboards", group: "Interfaces", icon: LayoutDashboard, description: "Agent dashboards" },
  { label: "Bloks", route: "/rekuest/bloks", group: "Interfaces", icon: Blocks, description: "App-provided UI" },
  { label: "Shortcuts", route: "/rekuest/shortcuts", keywords: ["keyboard"], group: "Interfaces", icon: Keyboard, description: "Saved one-click runs" },
];
