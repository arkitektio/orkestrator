import type { NavLinkDecl } from "@/core/lib/module-host/define";

/**
 * kraph's pages, for the ⌘K palette (a `navLinks` builtin). Mirrors the
 * links its rail pane renders; `routeCatalog.test.ts` fails when they drift.
 */
export const KRAPH_NAV_LINKS: NavLinkDecl[] = [
  { label: "Dashboard", route: "/kraph/home", keywords: ["knowledge", "graph"] },
  { label: "Terms", route: "/kraph/terms" },
  { label: "Graphs", route: "/kraph/graphs" },
  { label: "Structures", route: "/kraph/structurekinds" },
  { label: "Entities", route: "/kraph/entitycategories" },
  { label: "Protocol Events", route: "/kraph/protocoleventcategories" },
  { label: "Natural Events", route: "/kraph/naturaleventcategories" },
  { label: "Relations", route: "/kraph/relationcategories" },
  { label: "Structure Relations", route: "/kraph/structurerelationcategories" },
  { label: "Metrics", route: "/kraph/metrickinds" },
  { label: "Measurements", route: "/kraph/measurementcategories", keywords: ["measurements"] },
];
