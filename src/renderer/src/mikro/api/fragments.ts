
      export interface PossibleTypesResultData {
        possibleTypes: {
          [key: string]: string[]
        }
      }
      const result: PossibleTypesResultData = {
  "possibleTypes": {
    "FileLinkContainer": [
      "AnnotationCollection",
      "ArrayDataset",
      "MeshCollection",
      "TableDataset"
    ],
    "FolderChild": [
      "AnnotationCollection",
      "ArrayDataset",
      "File",
      "Folder",
      "MeshCollection",
      "TableDataset"
    ],
    "InViewSource": [
      "AnnotationCollection",
      "ArrayDataset",
      "MeshCollection",
      "TableDataset"
    ],
    "Layer": [
      "AnnotationLayer",
      "ImageLayer",
      "IntensityLayer",
      "LabelLayer",
      "MeshLayer",
      "NetworkLayer",
      "PhasorLayer",
      "PointLayer",
      "RgbLayer",
      "TrackLayer",
      "VectorLayer"
    ],
    "LayerRenderNode": [
      "BlendNode",
      "ChannelSourceNode",
      "PhasorNode",
      "ProjectionNode"
    ],
    "OpticalElement": [
      "ApertureElement",
      "BeamSplitterElement",
      "CCDElement",
      "DetectorElement",
      "FilterElement",
      "LampElement",
      "LaserElement",
      "LensElement",
      "MirrorElement",
      "ObjectiveElement",
      "OtherElement",
      "OtherSourceElement",
      "PinholeElement",
      "PolarizerElement",
      "SampleElement",
      "ShutterElement",
      "WaveplateElement"
    ],
    "Resident": [
      "AnnotationCollection",
      "ArrayDataset",
      "DataArray",
      "Lens",
      "MeshCollection",
      "NetworkCollection",
      "SparseDataset",
      "TableDataset"
    ],
    "SampleStep": [
      "ArraySample",
      "MeshSample",
      "NetworkSample"
    ],
    "Transformation": [
      "AffineTransformation",
      "ByDimensionTransformation",
      "FieldTransformation",
      "IdentityTransformation",
      "MapAxisTransformation",
      "RotationTransformation",
      "ScaleTransformation",
      "SequenceTransformation",
      "TranslationTransformation",
      "UnmappableTransformation"
    ],
    "_Entity": [
      "AffineTransformation",
      "Animation",
      "AnimationWaypoint",
      "Annotation",
      "AnnotationCollection",
      "AnnotationLayer",
      "ArrayDataset",
      "Axis",
      "BigFileStore",
      "ByDimensionTransformation",
      "ChannelLabel",
      "Client",
      "Column",
      "CoordinateAnchor",
      "CoordinateSystem",
      "DataArray",
      "FabriksStore",
      "FieldTransformation",
      "File",
      "FileLink",
      "Folder",
      "IdentityTransformation",
      "ImageLayer",
      "IntensityLayer",
      "KonnektionStore",
      "LabelLayer",
      "Lens",
      "LightPath",
      "MapAxisTransformation",
      "MediaStore",
      "Membership",
      "MeshCollection",
      "MeshLayer",
      "NetworkCollection",
      "NetworkLayer",
      "OmeMetadata",
      "OptikitState",
      "Organization",
      "ParquetStore",
      "PhasorCalibration",
      "PhasorHistogram",
      "PhasorLayer",
      "PointLayer",
      "RgbLayer",
      "RotationTransformation",
      "ScaleTransformation",
      "Scene",
      "SceneSnapshot",
      "SequenceTransformation",
      "SparseArray",
      "SparseAxisReference",
      "SparseDataset",
      "SparseStore",
      "TableDataset",
      "Task",
      "TrackLayer",
      "TranslationTransformation",
      "UnmappableTransformation",
      "User",
      "ValueHistogram",
      "VectorLayer",
      "ZarrStore"
    ]
  }
};
      export default result;
    