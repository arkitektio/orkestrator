import type { NavLinkDecl } from "@/core/lib/module-host/define";

/**
 * alpaka's pages, for the ⌘K palette (a `navLinks` builtin). Mirrors the
 * links its rail pane renders; `routeCatalog.test.ts` fails when they drift.
 */
export const ALPAKA_NAV_LINKS: NavLinkDecl[] = [
  { label: "Home", route: "/alpaka" },
  { label: "Rooms", route: "/alpaka/rooms", keywords: ["chat", "talk"] },
  { label: "Collections", route: "/alpaka/collections" },
  { label: "Models", route: "/alpaka/llmmodels", keywords: ["llm"] },
  { label: "Providers", route: "/alpaka/providers" },
];
