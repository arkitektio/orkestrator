import { smartOf } from "@/providers/smart/fromManifest";
import { manifest } from "./manifest";

// Kabinet's smart objects (Smart cards, links, pages), built from the models
// its manifest declares.

export const KabinetDefinition = smartOf(manifest, "@kabinet/definition");
export const KabinetRepo = smartOf(manifest, "@kabinet/repo");
export const KabinetBackend = smartOf(manifest, "@kabinet/backend");
export const KabinetPod = smartOf(manifest, "@kabinet/pod");
export const KabinetResource = smartOf(manifest, "@kabinet/resource");
/**
 * An app is the thing a scientist actually installs; releases and flavours are
 * its versions and its builds. It is infrastructure, not a datum, so it gets no
 * Knowledge tab.
 */
export const KabinetApp = smartOf(manifest, "@kabinet/app");
export const KabinetRelease = smartOf(manifest, "@kabinet/release");
export const KabinetFlavour = smartOf(manifest, "@kabinet/flavour");
