
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
      "ArkitektNode",
      "KwargNode",
      "ReactiveNode",
      "ReturnNode"
    ],
    "FlowNodeCommons": [
      "ArgNode",
      "ArkitektNode",
      "KwargNode",
      "ReactiveNode",
      "ReturnNode"
    ]
  }
};
      export default result;
    