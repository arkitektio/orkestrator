import type { NavLinkDecl } from "@/lib/module-host/define";

/**
 * lovekit's pages, for the ⌘K palette (a `navLinks` builtin). Mirrors the
 * links its rail pane renders; `routeCatalog.test.ts` fails when they drift.
 */
export const LOVEKIT_NAV_LINKS: NavLinkDecl[] = [
  { label: "Dashboard", route: "/lovekit" },
  { label: "Streams", route: "/lovekit/streams" },
  { label: "Solo Broadcasts", route: "/lovekit/solobroadcasts" },
];
