import { smartOf } from "@/providers/smart/fromManifest";
import { manifest } from "./manifest";

// Dokuments's smart objects (Smart cards, links, pages), built from the models
// its manifest declares.

export const DokumentsFile = smartOf(manifest, "@dokuments/file");
export const DokumentsDocument = smartOf(manifest, "@dokuments/document");
export const DokumentsPage = smartOf(manifest, "@dokuments/page");
