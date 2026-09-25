import { smartOf } from "@/providers/smart/fromManifest";
import { manifest } from "./manifest";

// Rekuest's smart objects (Smart cards, links, pages), built from the models
// its manifest declares.

export const RekuestTask = smartOf(manifest, "@rekuest/task");
export const RekuestState = smartOf(manifest, "@rekuest/state");
export const RekuestAction = smartOf(manifest, "@rekuest/action");
export const RekuestImplementation = smartOf(manifest, "@rekuest/implementation");
export const RekuestBlok = smartOf(manifest, "@rekuest/blok");
export const RekuestMaterializedBlok = smartOf(manifest, "@rekuest/materialized_blok");
export const RekuestDependency = smartOf(manifest, "@rekuest/dependency");
export const RekuestResolution = smartOf(manifest, "@rekuest/resolution");
export const RekuestProvision = smartOf(manifest, "@rekuest/reservation");
export const RekuestAgent = smartOf(manifest, "@rekuest/agent");
export const RekuestMemoryShelve = smartOf(manifest, "@rekuest/memoryshelve");
export const RekuestShortcut = smartOf(manifest, "@rekuest/shortcut");
export const RekuestToolbox = smartOf(manifest, "@rekuest/toolbox");
export const RekuestInputStructureUsage = smartOf(manifest, "@rekuest/inputstructureusage");
export const RekuestOutputStructureUsage = smartOf(manifest, "@rekuest/outputstructureusage");
export const RekuestInputInterfaceUsage = smartOf(manifest, "@rekuest/inputinterfaceusage");
export const RekuestOutputInterfaceUsage = smartOf(manifest, "@rekuest/outputinterfaceusage");
export const RekuestStructurePackage = smartOf(manifest, "@rekuest/structurepackage");
export const RekuestStructure = smartOf(manifest, "@rekuest/structure");
export const RekuestInterface = smartOf(manifest, "@rekuest/interface");
export const RekuestDescriptor = smartOf(manifest, "@rekuest/descriptor");
export const RekuestDashboard = smartOf(manifest, "@rekuest/dashboard");
export const RekuestSpace = smartOf(manifest, "@rekuest/space");
export const RekuestAgentScene = smartOf(manifest, "@rekuest/agentscene");
