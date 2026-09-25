import type { NavLinkDecl } from "@/core/lib/module-host/define";

/**
 * lok's pages, for the ⌘K palette (a `navLinks` builtin). Mirrors the
 * links its rail pane renders; `routeCatalog.test.ts` fails when they drift.
 */
export const LOK_NAV_LINKS: NavLinkDecl[] = [
  { label: "Members", route: "/lok", keywords: ["people", "organization", "users"] },
  { label: "Me", route: "/lok/me", keywords: ["profile", "account"] },
  { label: "Overview", route: "/lok/overview", keywords: ["dashboard", "lok"] },
  { label: "Users", route: "/lok/users" },
  { label: "Apps", route: "/lok/apps", keywords: ["clients"] },
  { label: "Services", route: "/lok/services" },
  { label: "Instances", route: "/lok/instances" },
  { label: "Redeem Tokens", route: "/lok/redeemtokens" },
  { label: "Devices", route: "/lok/devices", keywords: ["compute", "nodes"] },
];
