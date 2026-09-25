import type { NavLinkDecl } from "@/core/modules/host/define";

/**
 * rekuest's pages, for the ⌘K palette (a `navLinks` builtin). Mirrors the
 * links its rail pane renders; `routeCatalog.test.ts` fails when they drift.
 */
export const REKUEST_NAV_LINKS: NavLinkDecl[] = [
  { label: "Home", route: "/rekuest/home" },
  { label: "Actions", route: "/rekuest/actions", keywords: ["nodes", "functions"] },
  { label: "Tasks", route: "/rekuest/tasks", keywords: ["assignations", "runs"] },
  { label: "Org Tasks", route: "/rekuest/org-tasks", keywords: ["organization"] },
  { label: "Implementations", route: "/rekuest/implementations", keywords: ["templates"] },
  { label: "Toolboxes", route: "/rekuest/toolboxes" },
  { label: "Spaces", route: "/rekuest/spaces" },
  { label: "Dashboards", route: "/rekuest/dashboards" },
  { label: "Bloks", route: "/rekuest/bloks" },
  { label: "Shortcuts", route: "/rekuest/shortcuts" },
];
