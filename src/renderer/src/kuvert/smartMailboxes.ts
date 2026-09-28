import { FolderRole } from "./api/graphql";
import type { MailSource } from "./components/list/MailList";

/**
 * The mailboxes across every account, as Apple Mail's Favorites: what each
 * shows, and where it lives. The pane, the routes and the palette read this.
 */
export type SmartMailbox = {
  key: "inbox" | "unread" | "flagged" | "sent";
  label: string;
  route: string;
  /** The path under `/kuvert` (empty for the index). */
  path: string;
  source: MailSource;
  empty: { title: string; description: string };
};

export const SMART_MAILBOXES: SmartMailbox[] = [
  {
    key: "inbox",
    label: "All Inboxes",
    route: "/kuvert",
    path: "",
    source: { kind: "threads", filters: { folderRole: FolderRole.Inbox }, inRole: FolderRole.Inbox },
    empty: { title: "Inbox zero", description: "Nothing in any inbox." },
  },
  {
    key: "unread",
    label: "Unread",
    route: "/kuvert/unread",
    path: "unread",
    source: { kind: "threads", filters: { unread: true } },
    empty: { title: "All caught up", description: "Nothing unread in any mailbox." },
  },
  {
    key: "flagged",
    label: "Flagged",
    route: "/kuvert/flagged",
    path: "flagged",
    source: { kind: "threads", filters: { flagged: true } },
    empty: { title: "Nothing flagged", description: "Flag mail to find it here again." },
  },
  {
    key: "sent",
    label: "Sent",
    route: "/kuvert/sent",
    path: "sent",
    source: { kind: "threads", filters: { folderRole: FolderRole.Sent }, inRole: FolderRole.Sent },
    empty: { title: "Nothing sent", description: "Mail you send shows up here." },
  },
];
