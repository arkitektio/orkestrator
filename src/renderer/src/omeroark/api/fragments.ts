
      export interface PossibleTypesResultData {
        possibleTypes: {
          [key: string]: string[]
        }
      }
      const result: PossibleTypesResultData = {
  "possibleTypes": {
    "Annotation": [
      "BooleanAnnotation",
      "CommentAnnotation",
      "DoubleAnnotation",
      "FileAnnotation",
      "LongAnnotation",
      "MapAnnotation",
      "TagAnnotation",
      "TermAnnotation",
      "TimestampAnnotation"
    ],
    "OmeroObject": [
      "Dataset",
      "Image",
      "Plate",
      "PlateAcquisition",
      "Project",
      "Roi",
      "Screen",
      "Well"
    ],
    "Shape": [
      "Ellipse",
      "Label",
      "Line",
      "Mask",
      "Point",
      "Polygon",
      "Polyline",
      "Rectangle"
    ]
  }
};
      export default result;
    