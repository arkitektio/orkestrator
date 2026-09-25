import { smartOf } from "@/providers/smart/fromManifest";
import { manifest } from "./manifest";

// Lovekit's smart objects (Smart cards, links, pages), built from the models
// its manifest declares.

export const LovekitStream = smartOf(manifest, "@lovekit/stream");
export const LovekitSoloBroadcast = smartOf(manifest, "@lovekit/solo_broadcast");
