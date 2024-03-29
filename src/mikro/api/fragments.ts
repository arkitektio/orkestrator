
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
    ],
    "ProvenanceResult": [
      "Context",
      "Experiment",
      "ROI",
      "Representation",
      "Sample",
      "Stage",
      "Table"
    ],
    "Render": [
      "Thumbnail",
      "Video"
    ]
  }
};
      export default result;
    