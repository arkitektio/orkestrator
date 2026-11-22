import type { ModuleManifest } from "@/core/modules/spec";

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
    { identifier: "@rekuest/task", name: "Task", datum: false, path: "tasks/:id", description: "Your running and past tasks: every time an action was asked to run, by you or for you." },
    { identifier: "@rekuest/state", name: "State", datum: false, path: "states/:id", description: "What an agent keeps up to date and shares, such as a microscope's stage position." },
    { identifier: "@rekuest/action", name: "Action", datum: false, path: "actions/:id", description: "Everything your connected apps can do. Find one by what it works on, check that an app providing it is online, and run it." },
    { identifier: "@rekuest/implementation", name: "Implementation", datum: false, path: "implementations/:id", description: "How an action is provided: one per app that can run it, with the agents offering it." },
    { identifier: "@rekuest/blok", name: "Blok Template", datum: false, path: "bloks/:id", description: "What bloks are made of: interfaces written in BSX. Install one to make a blok that runs on your agents." },
    { identifier: "@rekuest/materialized_blok", name: "Blok", datum: false, path: "materialized_bloks/:id", description: "Interfaces running on your agents: their values are live and their controls act." },
    { identifier: "@rekuest/dependency", name: "Dependency", datum: false, path: "dependencies/:id", description: "What an implementation needs from other agents to run." },
    { identifier: "@rekuest/resolution", name: "Resolution", datum: false, path: "resolutions/:id", description: "Dependencies resolved to the agents that answer them." },
    { identifier: "@rekuest/agent", name: "Agent", datum: false, path: "agents/:id", description: "Apps with actions you can run. Assigning to an agent directly uses exactly its implementation of an action." },
    { identifier: "@rekuest/memoryshelve", name: "Memory Shelve", datum: false, path: "memoryshelves/:id", description: "What agents keep in memory between tasks: their shelves and the drawers on them." },
    { identifier: "@rekuest/shortcut", name: "Shortcut", datum: false, path: "shortcuts/:id", description: "Saved one-click runs: an action with its arguments already filled in." },
    { identifier: "@rekuest/schedule", name: "Schedule", datum: false, path: "schedules/:id", description: "Actions that run on a clock, and actions that run when data changes." },
    { identifier: "@rekuest/trigger", name: "Trigger", datum: false, path: "triggers/:id", description: "Rules that run an action when a service announces a signal." },
    { identifier: "@rekuest/signal", name: "Signal", datum: false, path: "signals/:id", description: "What services announced: something was created, updated or deleted." },
    { identifier: "@rekuest/wiregram", name: "Wiregram", datum: false, path: "wiregrams/:id", description: "Imported sets of automations, kept together so they can be exported again." },
    { identifier: "@rekuest/firing", name: "Firing", datum: false, path: "firings/:id", description: "What each trigger did with each signal: ran, skipped or was rejected." },
    { identifier: "@rekuest/service", name: "Service", datum: false, path: "services/:id", description: "The services that send signals and own the structures your actions work on." },
    { identifier: "@rekuest/toolbox", name: "Toolbox", datum: false, path: "toolboxes/:id", description: "Actions grouped into toolboxes, to find and hand out together." },
    { identifier: "@rekuest/inputstructureusage", name: "Input Structure Usage", datum: false, path: "inputstructureusages/:id", description: "Where a structure is taken as an input by an action." },
    { identifier: "@rekuest/outputstructureusage", name: "Output Structure Usage", datum: false, path: "outputstructureusages/:id", description: "Where a structure is returned by an action." },
    { identifier: "@rekuest/inputinterfaceusage", name: "Input Interface Usage", datum: false, path: "inputinterfaceusages/:id", description: "Where an interface is taken as an input by an action." },
    { identifier: "@rekuest/outputinterfaceusage", name: "Output Interface Usage", datum: false, path: "outputinterfaceusages/:id", description: "Where an interface is returned by an action." },
    { identifier: "@rekuest/structurepackage", name: "Structure Package", datum: false, path: "structurepackages/:id", description: "The packages that declare structures: the data types your apps pass between actions." },
    { identifier: "@rekuest/structure", name: "Structure (Rekuest)", datum: false, path: "structures/:id", description: "The data types your apps pass between actions, such as an image or a table." },
    { identifier: "@rekuest/interface", name: "Interface", datum: false, path: "interfaces/:id", description: "The shared contracts actions agree on, so one app's action can stand in for another's." },
    { identifier: "@rekuest/descriptor", name: "Descriptor", datum: false, path: "descriptors/:id", description: "A label an agent attaches to what it provides." },
    { identifier: "@rekuest/dashboard", name: "Dashboard", datum: false, path: "dashboards/:id", description: "Panels of your agents composed into one view." },
    { identifier: "@rekuest/space", name: "Space", datum: false, path: "spaces/:id", description: "The rooms the actions' 3D views place their devices in. A room keeps where people left each device, for everyone." },
    { identifier: "@rekuest/agentscene", name: "Agent Scene", datum: false, path: "agentscenes/:id", description: "An agent's scene: what it draws in 3D." },
  ],
};
