import type { ModuleManifest } from "@/core/lib/module-spec";

/**
 * Kraph: what this module is, as data (module spec v1). The host reads
 * it; nothing in here may be code. `./module.tsx` holds the builtins the
 * manifest refers to by id.
 */
export const manifest: ModuleManifest = {
  schema: 1,
  namespace: "kraph",
  service: "live.arkitekt.kraph",
  version: "0.0.0",
  label: "Kraph",
  icon: "waypoints",
  models: [
    { identifier: "@kraph/node", name: "Node", datum: false, path: "instances/:id", scopedPath: "graphs/:scope/nodes/:id" },
    { identifier: "@kraph/expression", name: "Expression", datum: false, path: "expressions/:id" },
    { identifier: "@kraph/relation", name: "Relation", datum: false, path: "relations/:id" },
    { identifier: "@kraph/structurerelation", name: "Structure Relation", datum: false, path: "structurerelations/:id" },
    { identifier: "@kraph/term", name: "Term", datum: false, path: "terms/:id" },
    { identifier: "@kraph/structurekind", name: "Structure Kind", datum: false, path: "structurekinds/:id" },
    { identifier: "@kraph/naturaleventcategory", name: "Natural Event Category", datum: false, path: "naturaleventcategories/:id" },
    { identifier: "@kraph/protocoleventcategory", name: "Protocol Event Category", datum: false, path: "protocoleventcategories/:id" },
    { identifier: "@kraph/metrickind", name: "Metric Kind", datum: false, path: "metrickinds/:id" },
    { identifier: "@kraph/measurementcategory", name: "Measurement Category", datum: false, path: "measurementcategories/:id" },
    { identifier: "@kraph/relationcategory", name: "Relation Category", datum: false, path: "relationcategories/:id" },
    { identifier: "@kraph/structurerelationcategory", name: "Structure Relation Category", datum: false, path: "structurerelationcategories/:id" },
    { identifier: "@kraph/genericcategory", name: "Generic Category", datum: false, path: "genericcategories/:id" },
    { identifier: "@kraph/entitycategory", name: "Entity Category", datum: false, path: "entitycategories/:id" },
    { identifier: "@kraph/reagentcategory", name: "Reagent Category", datum: false, path: "reagentcategories/:id" },
    { identifier: "@kraph/linkedexpression", name: "Linked Expression", datum: false, path: "linkedexpressions/:id" },
    { identifier: "@kraph/ontology", name: "Ontology", datum: false, path: "ontologies/:id" },
    { identifier: "@kraph/reagent", name: "Reagent", datum: false, path: "reagents/:id" },
    { identifier: "@kraph/protocolevent", name: "Protocol Event", datum: false, path: "instances/:id", scopedPath: "graphs/:scope/protocolevents/:id" },
    { identifier: "@kraph/naturalevent", name: "Natural Event", datum: false, path: "instances/:id", scopedPath: "graphs/:scope/naturalevents/:id" },
    { identifier: "@kraph/entity", name: "Entity", datum: false, path: "instances/:id", scopedPath: "graphs/:scope/entities/:id" },
    { identifier: "@kraph/editevent", name: "Edit Event", datum: false, path: "editevents/:id" },
    { identifier: "@kraph/measurement", name: "Measurement", datum: false, path: "measurements/:id" },
    { identifier: "@kraph/structure", name: "Structure (Kraph)", datum: false, path: "structures/:id" },
    { identifier: "@kraph/metric", name: "Metric", datum: false, path: "metrics/:id" },
    { identifier: "@kraph/instance", name: "Instance", datum: false, path: "instances/:id" },
    { identifier: "@kraph/link", name: "Link", datum: false, path: "links/:id" },
    { identifier: "@kraph/graph", name: "Graph", datum: false, path: "graphs/:id" },
    { identifier: "@kraph/graphview", name: "Graph View", datum: false, path: "graphviews/:id" },
    { identifier: "@kraph/plotview", name: "Plot View", datum: false, path: "plotviews/:id" },
    { identifier: "@kraph/nodeview", name: "Node View", datum: false, path: "nodeviews/:id" },
    { identifier: "@kraph/graphquery", name: "Graph Query", datum: false, path: "graphqueries/:id" },
    { identifier: "@kraph/scatterplot", name: "Scatter Plot", datum: false, path: "scatterplots/:id" },
    { identifier: "@kraph/protocol", name: "Protocol", datum: false, path: "protocols/:id" },
    { identifier: "@kraph/protocolstep", name: "Protocol Step", datum: false, path: "protocolsteps/:id" },
    { identifier: "@kraph/protocolsteptemplate", name: "Protocol Step Template", datum: false, path: "protocolsteptemplates/:id" },
  ],
};
