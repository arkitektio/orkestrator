import type { NavLinkDecl } from "@/core/modules/host/define";

/**
 * kuvert's pages, for the ⌘K palette (a `navLinks` builtin). Mirrors the links
 * its rail pane renders; `routeCatalog.test.ts` fails when they drift.
 */
export const KUVERT_NAV_LINKS: NavLinkDecl[] = [
  { label: "All Inboxes", route: "/kuvert", keywords: ["mail", "email", "inbox"] },
  { label: "Unread", route: "/kuvert/unread", keywords: ["mail", "email", "new"] },
  { label: "Flagged", route: "/kuvert/flagged", keywords: ["mail", "email", "important", "starred"] },
  { label: "Sent", route: "/kuvert/sent", keywords: ["mail", "email", "sent"] },
  { label: "Search", route: "/kuvert/search", keywords: ["mail", "email", "find"] },
  { label: "Outbox", route: "/kuvert/outbox", keywords: ["mail", "sending", "failed"] },
  { label: "Mailboxes", route: "/kuvert/accounts", keywords: ["mail", "email", "accounts", "imap", "gmail", "outlook"] },
];
