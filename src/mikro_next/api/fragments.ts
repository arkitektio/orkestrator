
      export interface PossibleTypesResultData {
        possibleTypes: {
          [key: string]: string[]
        }
      }
      const result: PossibleTypesResultData = {
  "possibleTypes": {
    "ImageMetric": [
      "ImageIntMetric"
    ],
    "IntMetric": [
      "ImageIntMetric"
    ],
    "ROI": [],
    "Render": [
      "Snapshot",
      "Video"
    ],
    "View": [
      "ChannelView",
      "LabelView",
      "OpticsView",
      "TimepointView",
      "TransformationView"
    ]
  }
};
      export default result;
    