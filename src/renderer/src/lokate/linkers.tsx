import { smartOf } from "@/core/smart/fromManifest";
import { manifest } from "./manifest";

// Lokate's smart objects (Smart cards, links, pages), built from the models
// its manifest declares. The barrel in `@/core/linkers` re-exports these.

export const LokatePlace = smartOf(manifest, "@lokate/place");
export const LokateVisit = smartOf(manifest, "@lokate/visit");
export const LokateTrip = smartOf(manifest, "@lokate/trip");
