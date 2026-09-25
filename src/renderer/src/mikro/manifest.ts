import type { ModuleManifest } from "@/core/lib/module-spec";

/**
 * Mikro: what this module is, as data (module spec v1). The host reads
 * it; nothing in here may be code. `./module.tsx` holds the builtins the
 * manifest refers to by id.
 */
export const manifest: ModuleManifest = {
  schema: 1,
  namespace: "mikro",
  service: "live.arkitekt.mikro",
  version: "0.0.0",
  label: "Mikro",
  icon: "database",
  models: [
    { identifier: "@mikro/entitymetric", name: "Entity Metric", datum: false, path: "entitymetric/:id" },
    { identifier: "@mikro/entityrelationmetric", name: "Entity Relation Metric", datum: false, path: "entityrelationmetric/:id" },
    { identifier: "@mikro/subjection", name: "Subjection", datum: false, path: "subjections/:id" },
    { identifier: "@mikro/renderedplot", name: "Rendered Plot", datum: false, path: "renderedplots/:id" },
    { identifier: "@mikro/folder", name: "Folder", datum: true, path: "folders/:id" },
    { identifier: "@mikro/arraydataset", name: "Array Dataset", datum: true, path: "arraydatasets/:id" },
    { identifier: "@mikro/coordinatesystem", name: "Coordinate System", datum: false, path: "coordinatesystems/:id" },
    { identifier: "@mikro/lens", name: "Lens", datum: false, path: "lenses/:id" },
    { identifier: "@mikro/history", name: "History", datum: false, path: "history/:id" },
    { identifier: "@mikro/fluorophore", name: "Fluorophore", datum: false, path: "fluorophores/:id" },
    { identifier: "@mikro/file", name: "File (Mikro)", datum: true, path: "files/:id" },
    { identifier: "@mikro/scene", name: "Scene", datum: true, path: "scenes/:id" },
    { identifier: "@mikro/tabledataset", name: "Table Dataset", datum: true, path: "tabledatasets/:id" },
    { identifier: "@mikro/sparsedataset", name: "Sparse Dataset", datum: true, path: "sparsedatasets/:id" },
    { identifier: "@mikro/annotation", name: "Annotation", datum: true, path: "annotations/:id" },
    { identifier: "@mikro/entityrelation", name: "Entity Relation", datum: false, path: "entityrelations/:id" },
    { identifier: "@mikro/specimen", name: "Specimen", datum: true, path: "specimens/:id" },
  ],
};
