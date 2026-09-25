import type { NavLinkDecl } from "@/core/modules/host/define";

/**
 * omeroark's pages, for the ⌘K palette (a `navLinks` builtin). Mirrors the
 * links its rail pane renders; `routeCatalog.test.ts` fails when they drift.
 */
export const OMEROARK_NAV_LINKS: NavLinkDecl[] = [
  { label: "Dashboard", route: "/omeroark" },
  { label: "Datasets", route: "/omeroark/datasets" },
  { label: "Projects", route: "/omeroark/projects" },
];
