import { CloudUpload, Flag, Home, Inbox, ListChecks, ListTodo, MailOpen, Mailbox, Plug, Search, Send, SendHorizontal, Tags } from "lucide-react";

import { ADMIN_ROLE } from "@/core/connection/roles";
import type { NavLinkDecl } from "@/core/modules/host/define";

/** kuvert's pages, for the ⌘K palette and its rail popout (a `navLinks` builtin). */
export const KUVERT_NAV_LINKS: NavLinkDecl[] = [
  { label: "Home", route: "/kuvert/home", keywords: ["mail", "email"], group: "Mail", icon: Home, home: true },
  { label: "All Inboxes", route: "/kuvert", keywords: ["mail", "email", "inbox"], group: "Mail", icon: Inbox, description: "Every inbox, newest first" },
  { label: "Unread", route: "/kuvert/unread", keywords: ["mail", "email", "new"], group: "Mail", icon: MailOpen, description: "Not yet read" },
  { label: "Flagged", route: "/kuvert/flagged", keywords: ["mail", "email", "important", "starred"], group: "Mail", icon: Flag, description: "Marked for later" },
  { label: "Sent", route: "/kuvert/sent", keywords: ["mail", "email", "sent"], group: "Mail", icon: Send, description: "Mail you sent" },
  { label: "Search", route: "/kuvert/search", keywords: ["mail", "email", "find"], group: "Mail", icon: Search, description: "Across every mailbox" },
  { label: "Tasks", route: "/kuvert/tasks", keywords: ["mail", "todo", "task", "follow up"], group: "Mail", icon: ListTodo, description: "Mail to act on" },
  { label: "Outbox", route: "/kuvert/outbox", keywords: ["mail", "sending", "failed"], group: "Manage", icon: SendHorizontal, description: "Queued and failed sends" },
  { label: "Unsynced changes", route: "/kuvert/changes", keywords: ["mail", "sync", "push", "pending", "failed", "undo"], group: "Manage", icon: CloudUpload, description: "Changes on their way to the server" },
  { label: "Mailboxes", route: "/kuvert/accounts", keywords: ["mail", "email", "accounts", "imap", "gmail", "outlook"], group: "Manage", icon: Mailbox, description: "Linked accounts" },
  { label: "Categories", route: "/kuvert/categories", keywords: ["mail", "labels", "tags"], group: "Manage", icon: Tags, description: "Labels on your mail" },
  { label: "Task lists", route: "/kuvert/tasklists", keywords: ["mail", "todo", "lists"], group: "Manage", icon: ListChecks, description: "Lists your tasks live in" },
  { label: "Providers", route: "/kuvert/providers", keywords: ["mail", "imap", "gmail", "microsoft", "oauth", "setup", "credentials"], group: "Admin", icon: Plug, description: "How mailboxes are linked", roles: ADMIN_ROLE },
];
