
      export interface PossibleTypesResultData {
        possibleTypes: {
          [key: string]: string[]
        }
      }
      const result: PossibleTypesResultData = {
  "possibleTypes": {
    "Annotation": [
      "AttributePredicate",
      "CustomAnnotation",
      "IsPredicate",
      "ValueRange"
    ],
    "CommentNode": [
      "MentionDescendent",
      "ParagraphDescendent"
    ],
    "Descendent": [
      "Leaf",
      "MentionDescendent",
      "ParagraphDescendent"
    ],
    "Repository": [
      "AppRepository",
      "MirrorRepository"
    ],
    "ReturnWidget": [
      "ChoiceReturnWidget",
      "CustomReturnWidget",
      "ImageReturnWidget"
    ],
    "Widget": [
      "BoolWidget",
      "ChoiceWidget",
      "ColorWidget",
      "CustomWidget",
      "DateWidget",
      "IntWidget",
      "LinkWidget",
      "QueryWidget",
      "SearchWidget",
      "SliderWidget",
      "StringWidget",
      "TemplateWidget"
    ]
  }
};
      export default result;
    