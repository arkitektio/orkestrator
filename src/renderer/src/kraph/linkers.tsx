import { scopedSmartOf, smartOf } from "@/core/smart/fromManifest";
import { manifest } from "./manifest";

// Kraph's smart objects (Smart cards, links, pages), built from the models
// its manifest declares.

export const KraphNode = scopedSmartOf(manifest, "@kraph/node");
export const KraphExpression = smartOf(manifest, "@kraph/expression");
export const KraphRelation = smartOf(manifest, "@kraph/relation");
export const KraphStructureRelation = smartOf(manifest, "@kraph/structurerelation");
export const KraphTerm = smartOf(manifest, "@kraph/term");
export const KraphStructureKind = smartOf(manifest, "@kraph/structurekind");
export const KraphNaturalEventCategory = smartOf(manifest, "@kraph/naturaleventcategory");
export const KraphProtocolEventCategory = smartOf(manifest, "@kraph/protocoleventcategory");
export const KraphMetricKind = smartOf(manifest, "@kraph/metrickind");
export const KraphMeasurementCategory = smartOf(manifest, "@kraph/measurementcategory");
export const KraphRelationCategory = smartOf(manifest, "@kraph/relationcategory");
export const KraphStructureRelationCategory = smartOf(manifest, "@kraph/structurerelationcategory");
export const KraphGenericCategory = smartOf(manifest, "@kraph/genericcategory");
export const KraphEntityCategory = smartOf(manifest, "@kraph/entitycategory");
export const KraphReagentCategory = smartOf(manifest, "@kraph/reagentcategory");
export const KraphLinkedExpression = smartOf(manifest, "@kraph/linkedexpression");
export const KraphOntology = smartOf(manifest, "@kraph/ontology");
export const KraphReagent = smartOf(manifest, "@kraph/reagent");
export const KraphProtocolEvent = scopedSmartOf(manifest, "@kraph/protocolevent");
export const KraphNaturalEvent = scopedSmartOf(manifest, "@kraph/naturalevent");
export const KraphEntity = scopedSmartOf(manifest, "@kraph/entity");
export const KraphEditEvent = smartOf(manifest, "@kraph/editevent");
export const KraphMeasurement = smartOf(manifest, "@kraph/measurement");
export const KraphStructure = smartOf(manifest, "@kraph/structure");
export const KraphMetric = smartOf(manifest, "@kraph/metric");
export const KraphInstance = smartOf(manifest, "@kraph/instance");
export const KraphLink = smartOf(manifest, "@kraph/link");
export const KraphGraph = smartOf(manifest, "@kraph/graph");
export const KraphGraphView = smartOf(manifest, "@kraph/graphview");
export const KraphPlotView = smartOf(manifest, "@kraph/plotview");
export const KraphNodeView = smartOf(manifest, "@kraph/nodeview");
export const KraphGraphQuery = smartOf(manifest, "@kraph/graphquery");
export const KraphScatterPlot = smartOf(manifest, "@kraph/scatterplot");
export const KraphProtocol = smartOf(manifest, "@kraph/protocol");
export const KraphProtocolStep = smartOf(manifest, "@kraph/protocolstep");
export const KraphProtocolStepTemplate = smartOf(manifest, "@kraph/protocolsteptemplate");
