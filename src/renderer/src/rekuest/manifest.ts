import type { ModuleManifest } from "@/lib/module-spec";

/**
 * Rekuest: what this module is, as data (module spec v1). The host reads
 * it; nothing in here may be code. `./module.tsx` holds the builtins the
 * manifest refers to by id.
 */
export const manifest: ModuleManifest = {
  schema: 1,
  namespace: "rekuest",
  service: "live.arkitekt.rekuest",
  version: "0.0.0",
  label: "Rekuest",
  icon: "podcast",
  models: [
    { identifier: "@rekuest/task", name: "Task", datum: false, path: "tasks/:id" },
    { identifier: "@rekuest/state", name: "State", datum: false, path: "states/:id" },
    { identifier: "@rekuest/action", name: "Action", datum: false, path: "actions/:id" },
    { identifier: "@rekuest/implementation", name: "Implementation", datum: false, path: "implementations/:id" },
    { identifier: "@rekuest/blok", name: "Blok (Rekuest)", datum: false, path: "bloks/:id" },
    { identifier: "@rekuest/materialized_blok", name: "Materialized Blok", datum: false, path: "materialized_bloks/:id" },
    { identifier: "@rekuest/dependency", name: "Dependency", datum: false, path: "dependencies/:id" },
    { identifier: "@rekuest/resolution", name: "Resolution", datum: false, path: "resolutions/:id" },
    { identifier: "@rekuest/reservation", name: "Provision", datum: false, path: "provisions/:id" },
    { identifier: "@rekuest/agent", name: "Agent", datum: false, path: "agents/:id" },
    { identifier: "@rekuest/memoryshelve", name: "Memory Shelve", datum: false, path: "memoryshelves/:id" },
    { identifier: "@rekuest/shortcut", name: "Shortcut", datum: false, path: "shortcuts/:id" },
    { identifier: "@rekuest/toolbox", name: "Toolbox", datum: false, path: "toolboxes/:id" },
    { identifier: "@rekuest/inputstructureusage", name: "Input Structure Usage", datum: false, path: "inputstructureusages/:id" },
    { identifier: "@rekuest/outputstructureusage", name: "Output Structure Usage", datum: false, path: "outputstructureusages/:id" },
    { identifier: "@rekuest/inputinterfaceusage", name: "Input Interface Usage", datum: false, path: "inputinterfaceusages/:id" },
    { identifier: "@rekuest/outputinterfaceusage", name: "Output Interface Usage", datum: false, path: "outputinterfaceusages/:id" },
    { identifier: "@rekuest/structurepackage", name: "Structure Package", datum: false, path: "structurepackages/:id" },
    { identifier: "@rekuest/structure", name: "Structure (Rekuest)", datum: false, path: "structures/:id" },
    { identifier: "@rekuest/interface", name: "Interface", datum: false, path: "interfaces/:id" },
    { identifier: "@rekuest/descriptor", name: "Descriptor", datum: false, path: "descriptors/:id" },
    { identifier: "@rekuest/dashboard", name: "Dashboard", datum: false, path: "dashboards/:id" },
    { identifier: "@rekuest/space", name: "Space", datum: false, path: "spaces/:id" },
    { identifier: "@rekuest/agentscene", name: "Agent Scene", datum: false, path: "agentscenes/:id" },
  ],
};
