
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
    ]
  }
};
      export default result;
    