
      export interface PossibleTypesResultData {
        possibleTypes: {
          [key: string]: string[]
        }
      }
      const result: PossibleTypesResultData = {
  "possibleTypes": {
    "Descendent": [
      "Leaf",
      "MentionDescendent",
      "ParagraphDescendent"
    ],
    "GenericObject": [
      "Experiment",
      "Feature",
      "Label",
      "Model",
      "Position",
      "ROI",
      "Representation",
      "Sample",
      "Stage"
    ],
    "Node": [
      "MentionDescendent",
      "ParagraphDescendent"
    ]
  }
};
      export default result;
    