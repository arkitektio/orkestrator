import { smartOf } from "@/core/smart/fromManifest";
import { manifest } from "./manifest";

// Mikro's smart objects (Smart cards, links, pages), built from the models
// its manifest declares.

export const MikroEntityMetric = smartOf(manifest, "@mikro/entitymetric");
export const MikroEntityRelationMetric = smartOf(manifest, "@mikro/entityrelationmetric");
export const MikroSubjection = smartOf(manifest, "@mikro/subjection");
export const MikroRenderedPlot = smartOf(manifest, "@mikro/renderedplot");
export const MikroFolder = smartOf(manifest, "@mikro/folder");
export const MikroArrayDataset = smartOf(manifest, "@mikro/arraydataset");
export const MikroCoordinateSystem = smartOf(manifest, "@mikro/coordinatesystem");
// A lens is its kind's structure; every kind opens the one lens page, so a
// link or page that does not care which kind goes through `MikroArrayLens`.
export const MikroArrayLens = smartOf(manifest, "@mikro/arraylens");
export const MikroTableLens = smartOf(manifest, "@mikro/tablelens");
export const MikroSparseLens = smartOf(manifest, "@mikro/sparselens");
export const MikroMeshLens = smartOf(manifest, "@mikro/meshlens");
export const MikroNetworkLens = smartOf(manifest, "@mikro/networklens");
export const MikroAnnotationLens = smartOf(manifest, "@mikro/annotationlens");

const LENS_SMARTS = {
  ArrayLens: MikroArrayLens,
  TableLens: MikroTableLens,
  SparseLens: MikroSparseLens,
  MeshLens: MikroMeshLens,
  NetworkLens: MikroNetworkLens,
  AnnotationLens: MikroAnnotationLens,
};

/** The smart object of a lens, by its `__typename`: it hands the lens over as
 *  its kind, which is what an action's port is typed on. */
export const lensSmart = (typename: keyof typeof LENS_SMARTS | undefined) =>
  (typename && LENS_SMARTS[typename]) || MikroArrayLens;
export const MikroHistory = smartOf(manifest, "@mikro/history");
export const MikroFluorophore = smartOf(manifest, "@mikro/fluorophore");
export const MikroFile = smartOf(manifest, "@mikro/file");
export const MikroScene = smartOf(manifest, "@mikro/scene");
export const MikroChart = smartOf(manifest, "@mikro/chart");
export const MikroTableDataset = smartOf(manifest, "@mikro/tabledataset");
export const MikroSparseDataset = smartOf(manifest, "@mikro/sparsedataset");
export const MikroAnnotation = smartOf(manifest, "@mikro/annotation");
export const MikroMeshCollection = smartOf(manifest, "@mikro/meshcollection");
export const MikroEntityRelation = smartOf(manifest, "@mikro/entityrelation");
export const MikroSpecimen = smartOf(manifest, "@mikro/specimen");
