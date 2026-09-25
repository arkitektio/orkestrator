import { smartOf } from "@/providers/smart/fromManifest";
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
export const MikroLens = smartOf(manifest, "@mikro/lens");
export const MikroHistory = smartOf(manifest, "@mikro/history");
export const MikroFluorophore = smartOf(manifest, "@mikro/fluorophore");
export const MikroFile = smartOf(manifest, "@mikro/file");
export const MikroScene = smartOf(manifest, "@mikro/scene");
export const MikroTableDataset = smartOf(manifest, "@mikro/tabledataset");
export const MikroSparseDataset = smartOf(manifest, "@mikro/sparsedataset");
export const MikroAnnotation = smartOf(manifest, "@mikro/annotation");
export const MikroEntityRelation = smartOf(manifest, "@mikro/entityrelation");
export const MikroSpecimen = smartOf(manifest, "@mikro/specimen");
