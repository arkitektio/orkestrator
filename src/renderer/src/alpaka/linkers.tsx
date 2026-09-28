import { smartOf } from "@/core/smart/fromManifest";
import { manifest } from "./manifest";

// Alpaka's smart objects (Smart cards, links, pages), built from the models
// its manifest declares.

export const AlpakaRoom = smartOf(manifest, "@alpaka/room");
export const AlpakaMessage = smartOf(manifest, "@alpaka/message");
export const AlpakaProvider = smartOf(manifest, "@alpaka/provider");
export const AlpakaLLMModel = smartOf(manifest, "@alpaka/llmmodel");
export const AlpakaCollection = smartOf(manifest, "@alpaka/collection");
