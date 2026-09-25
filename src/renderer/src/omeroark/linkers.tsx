import { smartOf } from "@/providers/smart/fromManifest";
import { manifest } from "./manifest";

// Omero Ark's smart objects (Smart cards, links, pages), built from the models
// its manifest declares.

export const OmeroArkProject = smartOf(manifest, "@omeroark/project");
export const OmeroArkDataset = smartOf(manifest, "@omeroark/dataset");
export const OmeroArkImage = smartOf(manifest, "@omeroark/image");
