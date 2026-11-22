
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
      "StructureCategory",
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
      "GraphPairsQuery",
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
      "GraphPairsQuery",
      "GraphTableQuery",
      "Instance",
      "Link",
      "MeasurementCategory",
      "MediaStore",
      "MetricKind",
      "Model",
      "NaturalEventCategory",
      "PairsQueryRun",
      "PairsQueryRunEntry",
      "Project",
      "ProtocolEventCategory",
      "RelationCategory",
      "ScatterPlot",
      "Standing",
      "StructureCategory",
      "StructureKind",
      "StructureRelationCategory",
      "Term",
      "TodoItem",
      "TodoItemStructure",
      "TodoList"
    ]
  }
};
      export default result;
    