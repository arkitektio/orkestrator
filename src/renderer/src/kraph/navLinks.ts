import { Cat, Divide, GitFork, Home, Notebook, Ruler, Shapes, Sigma, Sparkles, SpellCheck, Waypoints } from "lucide-react";

import type { NavLinkDecl } from "@/core/modules/host/define";

/** kraph's pages, for the ⌘K palette and its rail popout (a `navLinks` builtin). */
export const KRAPH_NAV_LINKS: NavLinkDecl[] = [
  { label: "Dashboard", route: "/kraph/home", keywords: ["knowledge", "graph"], group: "Explore", icon: Home, home: true },
  { label: "Terms", route: "/kraph/terms", group: "Explore", icon: SpellCheck, description: "Ontology terms" },
  { label: "Graphs", route: "/kraph/graphs", group: "Explore", icon: Sparkles, description: "Knowledge graphs" },
  { label: "Structures", route: "/kraph/structurekinds", group: "Categories", icon: Shapes, description: "Linked data objects" },
  { label: "Entities", route: "/kraph/entitycategories", group: "Categories", icon: Cat, description: "Things you track" },
  { label: "Protocol Events", route: "/kraph/protocoleventcategories", group: "Categories", icon: Notebook, description: "Steps you performed" },
  { label: "Natural Events", route: "/kraph/naturaleventcategories", group: "Categories", icon: Divide, description: "Things that happened" },
  { label: "Relations", route: "/kraph/relationcategories", group: "Categories", icon: Waypoints, description: "Entity to entity" },
  { label: "Structure Relations", route: "/kraph/structurerelationcategories", group: "Categories", icon: GitFork, description: "Structure to structure" },
  { label: "Metrics", route: "/kraph/metrickinds", group: "Categories", icon: Sigma, description: "Measured values" },
  { label: "Measurements", route: "/kraph/measurementcategories", keywords: ["measurements"], group: "Categories", icon: Ruler, description: "Structure to entity" },
];
