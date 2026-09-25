import type { ModuleManifest } from "@/core/modules/spec";

/**
 * Team: what this module is, as data (module spec v1). The host reads
 * it; nothing in here may be code. `./module.tsx` holds the builtins the
 * manifest refers to by id.
 */
export const manifest: ModuleManifest = {
  schema: 1,
  namespace: "lok",
  service: "live.arkitekt.lok",
  version: "0.0.0",
  label: "Team",
  icon: "users",
  models: [
    { identifier: "@lok/user", name: "User", datum: false, path: "members/:id" },
    { identifier: "@lok/redeemtoken", name: "Redeem Token", datum: false, path: "redeemtokens/:id" },
    { identifier: "@lok/group", name: "Group", datum: false, path: "groups/:id" },
    { identifier: "@lok/client", name: "Client", datum: false, path: "clients/:id" },
    { identifier: "@lok/device", name: "Device ", datum: false, path: "devices/:id" },
    { identifier: "@lok/app", name: "App", datum: false, path: "apps/:id" },
    { identifier: "@lok/release", name: "Release (Lok)", datum: false, path: "releases/:id" },
    { identifier: "@lok/service", name: "Service", datum: false, path: "services/:id" },
    { identifier: "@lok/backend", name: "Backend (Lok)", datum: false, path: "backends/:id" },
    { identifier: "@lok/serviceinstance", name: "Service Instance", datum: false, path: "serviceinstances/:id" },
    { identifier: "@lok/layer", name: "Layer", datum: false, path: "layers/:id" },
    { identifier: "@lok/mapping", name: "Mapping", datum: false, path: "mappings/:id" },
    { identifier: "@lok/composition", name: "Composition", datum: false, path: "composition/:id" },
  ],
};
