import type { ModuleManifest } from "@/core/lib/module-spec";

/**
 * Elektro: what this module is, as data (module spec v1). The host reads
 * it; nothing in here may be code. `./module.tsx` holds the builtins the
 * manifest refers to by id.
 */
export const manifest: ModuleManifest = {
  schema: 1,
  namespace: "elektro",
  service: "live.arkitekt.elektro",
  version: "0.0.0",
  label: "Elektro",
  icon: "zap",
  models: [
    { identifier: "@elektro/arraydataset", name: "Array Dataset (Elektro)", datum: true, path: "arraydatasets/:id" },
    { identifier: "@elektro/mechanism", name: "Mechanism", datum: false, path: "mechanisms/:id" },
    { identifier: "@elektro/environment", name: "Environment", datum: false, path: "environments/:id" },
    { identifier: "@elektro/modelcollection", name: "Model Collection", datum: false, path: "modelcollections/:id" },
    { identifier: "@elektro/experiment", name: "Experiment (Elektro)", datum: true, path: "experiments/:id" },
    { identifier: "@elektro/neuronmodel", name: "Neuron Model", datum: true, path: "neuronmodels/:id" },
    { identifier: "@elektro/cell", name: "Cell", datum: false, path: "cells/:id" },
    { identifier: "@elektro/section", name: "Section", datum: false, path: "sections/:id" },
    { identifier: "@elektro/modelworkspace", name: "Model Workspace", datum: false, path: "modelworkspaces/:id" },
    { identifier: "@elektro/file", name: "File (Elektro)", datum: true, path: "files/:id" },
  ],
};
