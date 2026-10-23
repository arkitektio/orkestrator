import type { ModuleManifest } from "@/core/modules/spec";

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
    // One structure per kind of lens, all on the lens page: mikro hosts no
    // structure for "a lens" of any kind, and a port names the kind it takes.
    { identifier: "@mikro/arraylens", name: "Array Lens", datum: false, path: "lenses/:id" },
    { identifier: "@mikro/tablelens", name: "Table Lens", datum: false, path: "lenses/:id" },
    { identifier: "@mikro/sparselens", name: "Sparse Lens", datum: false, path: "lenses/:id" },
    { identifier: "@mikro/meshlens", name: "Mesh Lens", datum: false, path: "lenses/:id" },
    { identifier: "@mikro/networklens", name: "Network Lens", datum: false, path: "lenses/:id" },
    { identifier: "@mikro/annotationlens", name: "Annotation Lens", datum: false, path: "lenses/:id" },
    { identifier: "@mikro/fixturelens", name: "Fixture Lens", datum: false, path: "lenses/:id" },
    { identifier: "@mikro/history", name: "History", datum: false, path: "history/:id" },
    { identifier: "@mikro/fluorophore", name: "Fluorophore", datum: false, path: "fluorophores/:id" },
    { identifier: "@mikro/file", name: "File (Mikro)", datum: true, path: "files/:id" },
    { identifier: "@mikro/scene", name: "Scene", datum: true, path: "scenes/:id" },
    // What a guest of the organization is granted: the objects put in it, and their parts.
    { identifier: "@mikro/collaboration", name: "Collaboration", datum: false, path: "collaborations/:id" },
    { identifier: "@mikro/chart", name: "Chart", datum: true, path: "charts/:id" },
    { identifier: "@mikro/tabledataset", name: "Table Dataset", datum: true, path: "tabledatasets/:id" },
    { identifier: "@mikro/sparsedataset", name: "Sparse Dataset", datum: true, path: "sparsedatasets/:id" },
    { identifier: "@mikro/meshcollection", name: "Mesh Collection", datum: false, path: "meshcollections/:id" },
    // Hardware around the sample (a coverslip, a dish), one glTF in a space of its own.
    { identifier: "@mikro/fixture", name: "Fixture", datum: true, path: "fixtures/:id" },
    { identifier: "@mikro/annotation", name: "Annotation", datum: true, path: "annotations/:id" },
    { identifier: "@mikro/entityrelation", name: "Entity Relation", datum: false, path: "entityrelations/:id" },
    { identifier: "@mikro/specimen", name: "Specimen", datum: true, path: "specimens/:id" },
  ],
};
