import type { ModuleManifest } from "@/core/modules/spec";

/**
 * Kuvert (mail): what this module is, as data (module spec v1). The host reads
 * it; nothing in here may be code. `./module.tsx` holds the builtins the
 * manifest refers to by id.
 */
export const manifest: ModuleManifest = {
  schema: 1,
  namespace: "kuvert",
  service: "live.arkitekt.kuvert",
  version: "0.0.0",
  label: "Mail",
  icon: "mail",
  models: [
    { identifier: "@kuvert/account", name: "Mailbox", datum: false, path: "accounts/:id" },
    { identifier: "@kuvert/folder", name: "Mail Folder", datum: false, path: "folders/:id" },
    { identifier: "@kuvert/thread", name: "Conversation", datum: false, path: "threads/:id" },
    { identifier: "@kuvert/message", name: "Mail", datum: false, path: "messages/:id" },
    { identifier: "@kuvert/outgoing", name: "Sent Mail", datum: false, path: "outbox/:id" },
    { identifier: "@kuvert/category", name: "Mail Category", datum: false, path: "categories/:id" },
    { identifier: "@kuvert/task", name: "Task", datum: false, path: "tasks/:id" },
    { identifier: "@kuvert/tasklist", name: "Task List", datum: false, path: "tasklists/:id" },
  ],
};
