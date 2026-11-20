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
    { identifier: "@mikro/entitymetric", name: "Entity Metric", datum: false, path: "entitymetric/:id", description: "A value measured on one entity of the knowledge graph, such as the area of a cell." },
    { identifier: "@mikro/entityrelationmetric", name: "Entity Relation Metric", datum: false, path: "entityrelationmetric/:id", description: "A value measured on a relation between two entities, such as the distance between two cells." },
    { identifier: "@mikro/subjection", name: "Subjection", datum: false, path: "subjections/:id", description: "Who an object is about: the subject a dataset or file was recorded from." },
    { identifier: "@mikro/renderedplot", name: "Rendered Plot", datum: false, path: "renderedplots/:id", description: "A plot rendered to an image and stored with the data it was drawn from." },
    { identifier: "@mikro/folder", name: "Folder", datum: true, path: "folders/:id", description: "Folders group your datasets and files together, just like folders in a file system." },
    { identifier: "@mikro/arraydataset", name: "Array Dataset", datum: true, path: "arraydatasets/:id", description: "N-dimensional arrays with named dimensions: images, stacks, volumes and time series, each in its own intrinsic coordinate system, with its pyramid levels." },
    { identifier: "@mikro/coordinatesystem", name: "Coordinate System", datum: false, path: "coordinatesystems/:id", description: "The nodes of the transformation graph: a dataset's pixel grid, the calibrated physical spaces derived from it, a pyramid level's voxel space, and the world space a scene registers its layers into." },
    // One structure per kind of lens, all on the lens page: mikro hosts no
    // structure for "a lens" of any kind, and a port names the kind it takes.
    { identifier: "@mikro/arraylens", name: "Array Lens", datum: false, path: "lenses/:id", description: "Selections cut out of datasets, tables, sparse matrices, meshes, networks and annotation collections, by people and by tasks." },
    { identifier: "@mikro/tablelens", name: "Table Lens", datum: false, path: "lenses/:id", description: "A selection of a table's rows and columns." },
    { identifier: "@mikro/sparselens", name: "Sparse Lens", datum: false, path: "lenses/:id", description: "A selection of a sparse matrix's rows and columns." },
    { identifier: "@mikro/meshlens", name: "Mesh Lens", datum: false, path: "lenses/:id", description: "A selection of the objects of a mesh collection." },
    { identifier: "@mikro/networklens", name: "Network Lens", datum: false, path: "lenses/:id", description: "A selection of the nodes and edges of a network." },
    { identifier: "@mikro/annotationlens", name: "Annotation Lens", datum: false, path: "lenses/:id", description: "A selection of the annotations of a collection." },
    { identifier: "@mikro/fixturelens", name: "Fixture Lens", datum: false, path: "lenses/:id", description: "A selection of a fixture's parts." },
    { identifier: "@mikro/history", name: "History", datum: false, path: "history/:id", description: "One change to an object: who made it, when, and through which task." },
    { identifier: "@mikro/fluorophore", name: "Fluorophore", datum: false, path: "fluorophores/:id", description: "A fluorescent label: what was stained, and at which wavelengths it absorbs and emits." },
    { identifier: "@mikro/file", name: "File (Mikro)", datum: true, path: "files/:id", description: "Raw files as they were uploaded, before they became datasets." },
    { identifier: "@mikro/scene", name: "Scene", datum: true, path: "scenes/:id", description: "Physical spaces your samples are placed in: look at several datasets at once, each at its physical position." },
    // What a guest of the organization is granted: the objects put in it, and their parts.
    { identifier: "@mikro/collaboration", name: "Collaboration", datum: false, path: "collaborations/:id", description: "What a guest of your organization sees: the objects you put in it, with what they need to be seen. Share it by link; whoever accepts sees nothing else." },
    { identifier: "@mikro/chart", name: "Chart", datum: true, path: "charts/:id", description: "How much: data along one axis, such as time or wavelength, or a table's rows at the values of their columns (a scatter, a histogram, a box per group)." },
    { identifier: "@mikro/grid", name: "Grid", datum: true, path: "grids/:id", description: "Members in rows and columns, such as genes against cells or a plate's wells, each cell coloured by a value." },
    { identifier: "@mikro/tabledataset", name: "Table Dataset", datum: true, path: "tabledatasets/:id", description: "Tables that carry their own coordinate system: coordinate columns are the axes their rows live in, measurement columns the values sampled at each position." },
    { identifier: "@mikro/sparsedataset", name: "Sparse Dataset", datum: true, path: "sparsedatasets/:id", description: "Matrices stored by their non-zero cells: one enumeration against another, such as cells against genes." },
    { identifier: "@mikro/meshcollection", name: "Mesh Collection", datum: false, path: "meshcollections/:id", description: "Surfaces in 3D, such as segmented cells or organelles, stored as one collection of meshes." },
    // One object of a mesh collection (a catalog row, id `<collection>:<object>`):
    // what an action takes when it works on one surface. No page of its own.
    { identifier: "@mikro/meshobject", name: "Mesh Object", datum: false, path: "meshobjects/:id", description: "One surface of a mesh collection." },
    // Hardware around the sample (a coverslip, a dish), one glTF in a space of its own.
    { identifier: "@mikro/fixture", name: "Fixture", datum: true, path: "fixtures/:id", description: "Hardware around the sample, such as a coverslip or a dish, as a 3D model in a space of its own." },
    { identifier: "@mikro/annotation", name: "Annotation", datum: true, path: "annotations/:id", description: "Human-drawn shapes. An annotation belongs to its collection, not to a scene, so deleting the scene keeps it." },
    { identifier: "@mikro/entityrelation", name: "Entity Relation", datum: false, path: "entityrelations/:id", description: "A relation between two entities of the knowledge graph, such as one cell touching another." },
    { identifier: "@mikro/specimen", name: "Specimen", datum: true, path: "specimens/:id", description: "A sample that was imaged: what it is and where it came from." },
  ],
};
