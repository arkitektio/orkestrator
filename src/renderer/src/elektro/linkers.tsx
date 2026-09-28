import { smartOf } from "@/core/smart/fromManifest";
import { manifest } from "./manifest";

// Elektro's smart objects (Smart cards, links, pages), built from the models
// its manifest declares.

export const ElektroArrayDataset = smartOf(manifest, "@elektro/arraydataset");
export const ElektroMechanism = smartOf(manifest, "@elektro/mechanism");
export const ElektroEnvironment = smartOf(manifest, "@elektro/environment");
export const ElektroModelCollection = smartOf(manifest, "@elektro/modelcollection");
export const ElektroExperiment = smartOf(manifest, "@elektro/experiment");
export const ElektroNeuronModel = smartOf(manifest, "@elektro/neuronmodel");
export const ElektroCell = smartOf(manifest, "@elektro/cell");
export const ElektroSection = smartOf(manifest, "@elektro/section");
export const ElektroModelWorkspace = smartOf(manifest, "@elektro/modelworkspace");
export const ElektroFile = smartOf(manifest, "@elektro/file");
