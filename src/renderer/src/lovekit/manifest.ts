import type { ModuleManifest } from "@/core/lib/module-spec";

/**
 * Lovekit: what this module is, as data (module spec v1). The host reads
 * it; nothing in here may be code. `./module.tsx` holds the builtins the
 * manifest refers to by id.
 */
export const manifest: ModuleManifest = {
  schema: 1,
  namespace: "lovekit",
  service: "live.arkitekt.lovekit",
  version: "0.0.0",
  label: "Lovekit",
  icon: "radio",
  models: [
    { identifier: "@lovekit/stream", name: "Stream", datum: true, path: "streams/:id" },
    { identifier: "@lovekit/solo_broadcast", name: "Solo Broadcast", datum: false, path: "solobroadcasts/:id" },
  ],
};
