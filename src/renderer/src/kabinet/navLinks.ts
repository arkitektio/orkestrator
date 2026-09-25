import type { NavLinkDecl } from "@/core/lib/module-host/define";

/**
 * kabinet's pages, for the ⌘K palette (a `navLinks` builtin). Mirrors the
 * links its rail pane renders; `routeCatalog.test.ts` fails when they drift.
 */
export const KABINET_NAV_LINKS: NavLinkDecl[] = [
  { label: "Dashboard", route: "/kabinet/home" },
  { label: "App Store", route: "/kabinet/app-store", keywords: ["install", "apps"] },
  { label: "Repos", route: "/kabinet/repos", keywords: ["repositories"] },
  { label: "Pods", route: "/kabinet/pods", keywords: ["containers"] },
];
