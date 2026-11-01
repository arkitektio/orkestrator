import { Boxes, ChartScatter, Home, MessageSquareQuote, Sparkles, SpellCheck } from "lucide-react";

import type { NavLinkDecl } from "@/core/modules/host/define";

/**
 * kraph's pages, for the ⌘K palette and its rail popout (a `navLinks` builtin).
 * Words and claims first: they are what a person says. A category is how one
 * view draws a word, so its page is reached from that view, not listed here.
 */
export const KRAPH_NAV_LINKS: NavLinkDecl[] = [
  { label: "Dashboard", route: "/kraph/home", keywords: ["knowledge", "graph"], group: "Explore", icon: Home, home: true },
  { label: "Words", route: "/kraph/terms", keywords: ["terms", "ontology", "vocabulary"], group: "Explore", icon: SpellCheck, description: "Your organization's vocabulary" },
  { label: "Claims", route: "/kraph/claims", keywords: ["assertions", "log", "provenance"], group: "Explore", icon: MessageSquareQuote, description: "What was said, and by whom" },
  { label: "All Structures", route: "/kraph/structures", keywords: ["linked", "objects", "data"], group: "Explore", icon: Boxes, description: "Every datum that has been claimed about" },
  { label: "Views", route: "/kraph/graphs", keywords: ["graphs", "projection", "schema"], group: "Views", icon: Sparkles, description: "Ways of reading what was claimed" },
  { label: "Scatter Plots", route: "/kraph/scatterplots", keywords: ["plots", "charts"], group: "Views", icon: ChartScatter, description: "Plots over a view's queries" },
];
