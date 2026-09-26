import type { ModuleManifest } from "@/core/modules/spec";

/**
 * Bank: what this module is, as data (module spec v1). The host reads it;
 * nothing in here may be code. `./module.tsx` holds the builtins the manifest
 * refers to by id.
 */
export const manifest: ModuleManifest = {
  schema: 1,
  namespace: "bank",
  service: "live.arkitekt.bank",
  version: "0.0.0",
  label: "Bank",
  icon: "landmark",
  models: [
    { identifier: "@bank/connection", name: "Bank Connection", datum: false, path: "connections/:id" },
    { identifier: "@bank/account", name: "Bank Account", datum: false, path: "accounts/:id" },
    { identifier: "@bank/transaction", name: "Transaction (Bank)", datum: false, path: "transactions/:id" },
    { identifier: "@bank/category", name: "Category (Bank)", datum: false, path: "categories/:id" },
    { identifier: "@bank/rule", name: "Category Rule", datum: false, path: "rules/:id" },
    { identifier: "@bank/budget", name: "Budget", datum: false, path: "budgets/:id" },
    { identifier: "@bank/recurring", name: "Recurring Payment", datum: false, path: "recurring/:id" },
  ],
};
