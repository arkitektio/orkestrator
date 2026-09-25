import { smartOf } from "@/core/providers/smart/fromManifest";
import { manifest } from "./manifest";

// Team's smart objects (Smart cards, links, pages), built from the models
// its manifest declares.

export const LokUser = smartOf(manifest, "@lok/user");
export const LokRedeemToken = smartOf(manifest, "@lok/redeemtoken");
export const LokGroup = smartOf(manifest, "@lok/group");
export const LokClient = smartOf(manifest, "@lok/client");
export const LokDevice = smartOf(manifest, "@lok/device");
export const LokApp = smartOf(manifest, "@lok/app");
export const LokRelease = smartOf(manifest, "@lok/release");
export const LokService = smartOf(manifest, "@lok/service");
export const LokBackend = smartOf(manifest, "@lok/backend");
export const LokServiceInstance = smartOf(manifest, "@lok/serviceinstance");
export const LokLayer = smartOf(manifest, "@lok/layer");
export const LokMapping = smartOf(manifest, "@lok/mapping");
export const LokComposition = smartOf(manifest, "@lok/composition");
