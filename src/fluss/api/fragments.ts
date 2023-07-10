
      export interface PossibleTypesResultData {
        possibleTypes: {
          [key: string]: string[]
        }
      }
      const result: PossibleTypesResultData = {
  "possibleTypes": {
    "CommentNode": [
      "MentionDescendent",
      "ParagraphDescendent"
    ],
    "Descendent": [
      "Leaf",
      "MentionDescendent",
      "ParagraphDescendent"
    ],
    "FlowEdge": [
      "FancyEdge",
      "LabeledEdge"
    ],
    "FlowEdgeCommons": [
      "FancyEdge",
      "LabeledEdge"
    ],
    "FlowNode": [
      "ArgNode",
      "ArkitektFilterNode",
      "ArkitektNode",
      "GraphNode",
      "KwargNode",
      "LocalNode",
      "ReactiveNode",
      "ReturnNode"
    ],
    "FlowNodeCommons": [
      "ArgNode",
      "ArkitektFilterNode",
      "ArkitektNode",
      "GraphNode",
      "KwargNode",
      "LocalNode",
      "ReactiveNode",
      "ReturnNode"
    ],
    "RetriableNode": [
      "ArkitektFilterNode",
      "ArkitektNode",
      "LocalNode"
    ]
  }
};
      export default result;
    