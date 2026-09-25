import type { ModuleManifest } from "@/core/lib/module-spec";

/**
 * Alpaka: what this module is, as data (module spec v1). The host reads
 * it; nothing in here may be code. `./module.tsx` holds the builtins the
 * manifest refers to by id.
 */
export const manifest: ModuleManifest = {
  schema: 1,
  namespace: "alpaka",
  service: "live.arkitekt.alpaka",
  version: "0.0.0",
  label: "Alpaka",
  icon: "message-circle",
  models: [
    { identifier: "@alpaka/room", name: "Room", datum: false, path: "rooms/:id" },
    { identifier: "@alpaka/message", name: "Message", datum: false, path: "messages/:id" },
    { identifier: "@alpaka/provider", name: "Provider", datum: false, path: "providers/:id" },
    { identifier: "@alpaka/llmmodel", name: "LLM Model", datum: false, path: "llmmodels/:id" },
    { identifier: "@alpaka/collection", name: "Collection", datum: false, path: "collections/:id" },
  ],
};
