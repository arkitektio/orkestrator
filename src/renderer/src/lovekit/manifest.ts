import type { ModuleManifest } from "@/core/modules/spec";

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
    {
      identifier: "@lovekit/stream",
      name: "Stream",
      datum: true,
      path: "streams/:id",
      description: "A live camera or microphone an app offers",
    },
    {
      identifier: "@lovekit/agent",
      name: "Stream Agent",
      datum: false,
      path: "agents/:id",
      description: "An app that offers live streams",
    },
    {
      identifier: "@lovekit/call",
      name: "Call",
      datum: false,
      path: "calls/:id",
      description: "A video call with your team about some objects",
    },
  ],
  // Streams and calls are carried by the LiveKit media server the host
  // configures (`io.livekit.livekit`); lovekit only mints the tokens.
  requires: { services: ["livekit"] },
};
