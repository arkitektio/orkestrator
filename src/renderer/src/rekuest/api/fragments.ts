
      export interface PossibleTypesResultData {
        possibleTypes: {
          [key: string]: string[]
        }
      }
      const result: PossibleTypesResultData = {
  "possibleTypes": {
    "AgentSnapshotEventStatePatchEvent": [
      "AgentSnapshotEvent",
      "StatePatchEvent"
    ],
    "AssetFile": [
      "KulisseStore",
      "MediaStore"
    ],
    "AssignWidget": [
      "ChoiceAssignWidget",
      "CustomAssignWidget",
      "ProxyWidget",
      "SearchAssignWidget",
      "SliderAssignWidget",
      "StateChoiceAssignWidget",
      "StringAssignWidget"
    ],
    "Effect": [
      "CustomEffect",
      "HideEffect",
      "MessageEffect"
    ],
    "LatestTaskSnapshotTaskChangeTaskEventChange": [
      "LatestTaskSnapshot",
      "TaskChange",
      "TaskEventChange"
    ],
    "ReturnWidget": [
      "ChoiceReturnWidget",
      "CustomReturnWidget"
    ],
    "StateSnapshotEventStatePatchEvent": [
      "StatePatchEvent",
      "StateSnapshotEvent"
    ],
    "_Entity": [
      "MediaStore",
      "Session",
      "User"
    ]
  }
};
      export default result;
    