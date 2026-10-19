import { smartOf } from "@/core/smart/fromManifest";
import { manifest } from "./manifest";

// Lovekit's smart objects (Smart cards, links, pages), built from the models
// its manifest declares.

export const LovekitStream = smartOf(manifest, "@lovekit/stream");
export const LovekitAgent = smartOf(manifest, "@lovekit/agent");
export const LovekitCall = smartOf(manifest, "@lovekit/call");
