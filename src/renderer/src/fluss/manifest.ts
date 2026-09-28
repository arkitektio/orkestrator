import type { ModuleManifest } from "@/core/modules/spec";

/**
 * Fluss: what this module is, as data (module spec v1). The host reads
 * it; nothing in here may be code. `./module.tsx` holds the builtins the
 * manifest refers to by id.
 */
export const manifest: ModuleManifest = {
  schema: 1,
  namespace: "fluss",
  service: "live.arkitekt.fluss",
  version: "0.0.0",
  label: "Fluss",
  icon: "workflow",
  // The flow editor builds on rekuest's actions, agents and implementations.
  requires: { services: ["rekuest"] },
  models: [
    { identifier: "@fluss/flow", name: "Flow", datum: false, path: "flows/:id" },
    { identifier: "@fluss/workspace", name: "Workspace", datum: false, path: "workspaces/:id" },
    { identifier: "@fluss/reactive_template", name: "Reactive Template", datum: false, path: "reactive_templates/:id" },
    { identifier: "@fluss/run", name: "Run", datum: false, path: "runs/:id" },
  ],
};
