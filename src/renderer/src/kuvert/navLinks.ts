import { CloudUpload, Flag, Inbox, ListTodo, Mailbox, MailOpen, Search, Send, SendHorizontal } from "lucide-react";

import type { NavLinkDecl } from "@/core/modules/host/define";

/** kuvert's pages, for the ⌘K palette and its rail popout (a `navLinks` builtin). */
export const KUVERT_NAV_LINKS: NavLinkDecl[] = [
  { label: "All Inboxes", route: "/kuvert", keywords: ["mail", "email", "inbox"], group: "Mail", icon: Inbox, home: true },
  { label: "Unread", route: "/kuvert/unread", keywords: ["mail", "email", "new"], group: "Mail", icon: MailOpen, description: "Not yet read" },
  { label: "Flagged", route: "/kuvert/flagged", keywords: ["mail", "email", "important", "starred"], group: "Mail", icon: Flag, description: "Marked for later" },
  { label: "Sent", route: "/kuvert/sent", keywords: ["mail", "email", "sent"], group: "Mail", icon: Send, description: "Mail you sent" },
  { label: "Search", route: "/kuvert/search", keywords: ["mail", "email", "find"], group: "Mail", icon: Search, description: "Across every mailbox" },
  { label: "Tasks", route: "/kuvert/tasks", keywords: ["mail", "todo", "task", "follow up"], group: "Mail", icon: ListTodo, description: "Mail to act on" },
  { label: "Outbox", route: "/kuvert/outbox", keywords: ["mail", "sending", "failed"], group: "Manage", icon: SendHorizontal, description: "Queued and failed sends" },
  { label: "Unsynced changes", route: "/kuvert/changes", keywords: ["mail", "sync", "push", "pending", "failed", "undo"], group: "Manage", icon: CloudUpload, description: "Changes on their way to the server" },
  { label: "Mailboxes", route: "/kuvert/accounts", keywords: ["mail", "email", "accounts", "imap", "gmail", "outlook"], group: "Manage", icon: Mailbox, description: "Linked accounts" },
];
