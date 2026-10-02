
      export interface PossibleTypesResultData {
        possibleTypes: {
          [key: string]: string[]
        }
      }
      const result: PossibleTypesResultData = {
  "possibleTypes": {
    "DecisionAnswer": [
      "ChoiceAnswer",
      "NoulAnswer",
      "ScoreAnswer"
    ],
    "_Entity": [
      "Agent",
      "App",
      "Client",
      "Message",
      "Organization",
      "Release",
      "Room",
      "User"
    ]
  }
};
      export default result;
    