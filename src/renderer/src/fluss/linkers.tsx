import { smartOf } from "@/providers/smart/fromManifest";
import { manifest } from "./manifest";

// Fluss's smart objects (Smart cards, links, pages), built from the models
// its manifest declares.

export const FlussFlow = smartOf(manifest, "@fluss/flow");
export const FlussWorkspace = smartOf(manifest, "@fluss/workspace");
export const FlussReactiveTemplate = smartOf(manifest, "@fluss/reactive_template");
export const FlussRun = smartOf(manifest, "@fluss/run");
