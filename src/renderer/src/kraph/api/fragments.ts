
      export interface PossibleTypesResultData {
        possibleTypes: {
          [key: string]: string[]
        }
      }
      const result: PossibleTypesResultData = {
  "possibleTypes": {
    "Asserted": [
      "AssertedComment",
      "AssertedDescription",
      "AssertedDifference",
      "AssertedEntity",
      "AssertedInstances",
      "AssertedLinks",
      "AssertedMeasurement",
      "AssertedMetric",
      "AssertedNaturalEvent",
      "AssertedParticipation",
      "AssertedProtocolEvent",
      "AssertedRelation",
      "AssertedSameness",
      "AssertedStructure",
      "AssertedStructureRelation"
    ],
    "Category": [
      "EntityCategory",
      "MeasurementCategory",
      "NaturalEventCategory",
      "ProtocolEventCategory",
      "RelationCategory",
      "StructureRelationCategory"
    ],
    "ClaimEndpoint": [
      "Instance",
      "Link",
      "Metric",
      "Structure",
      "Term"
    ],
    "Descendant": [
      "LeafDescendant",
      "MentionDescendant",
      "ParagraphDescendant"
    ],
    "Edge": [
      "Classification",
      "Derivation",
      "Description",
      "Difference",
      "InputParticipation",
      "Measurement",
      "OutputParticipation",
      "Relation",
      "Sameness",
      "StructureRelation"
    ],
    "EdgeCategory": [
      "MeasurementCategory",
      "RelationCategory",
      "StructureRelationCategory"
    ],
    "Event": [
      "NaturalEvent",
      "ProtocolEvent"
    ],
    "EventCategory": [
      "NaturalEventCategory",
      "ProtocolEventCategory"
    ],
    "GraphQuery": [
      "GraphTableQuery"
    ],
    "InformsTarget": [
      "Instance",
      "Link"
    ],
    "Node": [
      "Entity",
      "NaturalEvent",
      "ProtocolEvent"
    ],
    "NodeCategory": [
      "EntityCategory",
      "NaturalEventCategory",
      "ProtocolEventCategory"
    ],
    "Plottable": [
      "GraphTableQuery"
    ],
    "StandingTarget": [
      "Comment",
      "Instance",
      "Link",
      "Metric",
      "Structure"
    ],
    "_Entity": [
      "Assertion",
      "BigFileStore",
      "Comment",
      "EntityCategory",
      "Graph",
      "GraphTableQuery",
      "Instance",
      "Link",
      "MeasurementCategory",
      "MediaStore",
      "MetricKind",
      "NaturalEventCategory",
      "ProtocolEventCategory",
      "RelationCategory",
      "ScatterPlot",
      "Standing",
      "StructureKind",
      "StructureRelationCategory",
      "Term",
      "ZarrStore"
    ]
  }
};
      export default result;
    