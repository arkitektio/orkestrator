import type { ModuleManifest } from "@/core/modules/spec";

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
  // Installing a release runs a deployer's `install(approval)` through rekuest.
  requires: { services: ["rekuest"] },
  models: [
    { identifier: "@kabinet/definition", name: "Definition (Kabinet)", datum: false, path: "definitions/:id", description: "Every action the releases of your repositories declare." },
    { identifier: "@kabinet/repo", name: "Repo", datum: false, path: "repos/:id", description: "The GitHub repositories and registry packages Kabinet reads apps and bloks from." },
    { identifier: "@kabinet/backend", name: "Backend (Kabinet)", datum: false, path: "backends/:id", description: "The machines and container engines that run your deployed apps." },
    { identifier: "@kabinet/pod", name: "Pod (Kabinet)", datum: false, path: "pods/:id", description: "The running copies of your deployed apps, and where they run." },
    { identifier: "@kabinet/resource", name: "Resource", datum: false, path: "resources/:id", description: "The compute your backends offer, where pods are scheduled onto." },
    { identifier: "@kabinet/app", name: "App", datum: false, path: "apps/:id", description: "Every app registered with your organization, with its newest version." },
    { identifier: "@kabinet/release", name: "Release (Kabinet)", datum: false, path: "releases/:id", description: "Every published version of every app." },
    { identifier: "@kabinet/flavour", name: "Flavour", datum: false, path: "flavours/:id", description: "The builds each release ships, one per kind of hardware." },
    { identifier: "@kabinet/deployment", name: "Deployment", datum: false, path: "deployments/:id", description: "Builds installed on a backend: what pods are started from." },
    { identifier: "@kabinet/approval", name: "Release Approval", datum: false, path: "approvals/:id", description: "The releases people in your organization allowed to run as them." },
  ],
};
