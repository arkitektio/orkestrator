import type { ModuleManifest } from "@/core/modules/spec";

/**
 * Lokate (location history): what this module is, as data (module spec v1).
 * The host reads it; nothing in here may be code. `./module.tsx` holds the
 * builtins the manifest refers to by id.
 *
 * Every model is addressed by the server's `id` (what `place(id)`,
 * `visit(id)` and `trip(id)` take), not the `clientId` the phone minted.
 */
export const manifest: ModuleManifest = {
  schema: 1,
  namespace: "lokate",
  service: "live.arkitekt.lokate",
  version: "0.0.0",
  label: "Lokate",
  icon: "map-pinned",
  models: [
    { identifier: "@lokate/place", name: "Place (Lokate)", datum: false, path: "places/:id" },
    { identifier: "@lokate/visit", name: "Visit", datum: false, path: "visits/:id" },
    { identifier: "@lokate/trip", name: "Trip", datum: false, path: "trips/:id" },
  ],
};
