
      export interface PossibleTypesResultData {
        possibleTypes: {
          [key: string]: string[]
        }
      }
      const result: PossibleTypesResultData = {
  "possibleTypes": {
    "AssignWidget": [
      "ChoiceAssignWidget",
      "CustomAssignWidget",
      "ProxyWidget",
      "SearchAssignWidget",
      "SliderAssignWidget",
      "StateChoiceAssignWidget",
      "StringAssignWidget"
    ],
    "AssignableNode": [
      "RekuestFilterActionNode",
      "RekuestMapActionNode"
    ],
    "Effect": [
      "CustomEffect",
      "HideEffect",
      "MessageEffect"
    ],
    "GraphEdge": [
      "LoggingEdge",
      "VanillaEdge"
    ],
    "GraphNode": [
      "AgentSubFlowNode",
      "ArgNode",
      "ReactiveNode",
      "RekuestFilterActionNode",
      "RekuestMapActionNode",
      "ReturnNode"
    ],
    "RekuestActionNode": [
      "RekuestFilterActionNode",
      "RekuestMapActionNode"
    ],
    "RetriableNode": [
      "RekuestFilterActionNode",
      "RekuestMapActionNode"
    ],
    "ReturnWidget": [
      "ChoiceReturnWidget",
      "CustomReturnWidget"
    ],
    "_Entity": [
      "Flow",
      "ReactiveTemplate",
      "Run",
      "RunEvent",
      "Snapshot",
      "Workspace"
    ]
  }
};
      export default result;
    