import type { NavLinkDecl } from "@/core/lib/module-host/define";

/**
 * fluss's pages, for the ⌘K palette (a `navLinks` builtin). Mirrors the
 * links its rail pane renders; `routeCatalog.test.ts` fails when they drift.
 */
export const FLUSS_NAV_LINKS: NavLinkDecl[] = [
  { label: "Dashboard", route: "/fluss/home", keywords: ["workflows", "flows"] },
];
