import type { ModuleManifest } from "@/lib/module-spec";

/**
 * Kabinet: what this module is, as data (module spec v1). The host reads
 * it; nothing in here may be code. `./module.tsx` holds the builtins the
 * manifest refers to by id.
 */
export const manifest: ModuleManifest = {
  schema: 1,
  namespace: "kabinet",
  service: "live.arkitekt.kabinet",
  version: "0.0.0",
  label: "Kabinet",
  icon: "shopping-basket",
  models: [
    { identifier: "@kabinet/definition", name: "Definition (Kabinet)", datum: false, path: "definitions/:id" },
    { identifier: "@kabinet/repo", name: "Repo", datum: false, path: "repos/:id" },
    { identifier: "@kabinet/backend", name: "Backend (Kabinet)", datum: false, path: "backends/:id" },
    { identifier: "@kabinet/pod", name: "Pod (Kabinet)", datum: false, path: "pods/:id" },
    { identifier: "@kabinet/resource", name: "Resource", datum: false, path: "resources/:id" },
    { identifier: "@kabinet/app", name: "App", datum: false, path: "apps/:id" },
    { identifier: "@kabinet/release", name: "Release (Kabinet)", datum: false, path: "releases/:id" },
    { identifier: "@kabinet/flavour", name: "Flavour", datum: false, path: "flavours/:id" },
  ],
};
