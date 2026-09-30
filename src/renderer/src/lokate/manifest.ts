import type { ModuleManifest } from "@/core/modules/spec";

/**
 * Lokate (location history): what this module is, as data (module spec v1).
 * The host reads it; nothing in here may be code. `./module.tsx` holds the
 * builtins the manifest refers to by id.
 *
 * No models yet: the service only serves the phones' restore feed
 * (`changes`), so places, visits and trips have no page to route to until it
 * can read them by range and id.
 */
export const manifest: ModuleManifest = {
  schema: 1,
  namespace: "lokate",
  service: "live.arkitekt.lokate",
  version: "0.0.0",
  label: "Lokate",
  icon: "map-pinned",
};
