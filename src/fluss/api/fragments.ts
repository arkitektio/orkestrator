
      export interface PossibleTypesResultData {
        possibleTypes: {
          [key: string]: string[]
        }
      }
      const result: PossibleTypesResultData = {
  "possibleTypes": {
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
    