
      export interface PossibleTypesResultData {
        possibleTypes: {
          [key: string]: string[]
        }
      }
      const result: PossibleTypesResultData = {
  "possibleTypes": {
    "ExperimentLayer": [
      "AnnotationLayer",
      "EventsLayer",
      "HeatmapLayer",
      "PointLayer",
      "SeriesLayer",
      "SpikesLayer",
      "TraceLayer",
      "WaveformLayer"
    ],
    "FileLinkContainer": [
      "AnnotationCollection",
      "ArrayDataset",
      "SparseDataset",
      "TableDataset"
    ],
    "FolderChild": [
      "AnnotationCollection",
      "ArrayDataset",
      "File",
      "Folder",
      "SparseDataset",
      "TableDataset"
    ],
    "InViewSource": [
      "AnnotationCollection",
      "ArrayDataset",
      "DataArray",
      "Lens",
      "SparseDataset",
      "TableDataset"
    ],
    "NetConnection": [
      "SynapticConnection"
    ],
    "NetSynapse": [
      "Exp2Synapse"
    ],
    "Resident": [
      "AnnotationCollection",
      "ArrayDataset",
      "DataArray",
      "Lens",
      "SparseDataset",
      "TableDataset"
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
      "AcquisitionMetadata",
      "AffineTransformation",
      "Annotation",
      "AnnotationCollection",
      "AnnotationLayer",
      "App",
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
      "EventsLayer",
      "FieldTransformation",
      "File",
      "FileLink",
      "Folder",
      "HeatmapLayer",
      "IdentityTransformation",
      "Lens",
      "MapAxisTransformation",
      "MediaStore",
      "ModEnvironment",
      "Organization",
      "ParquetStore",
      "PointLayer",
      "RecordingSite",
      "Release",
      "RigState",
      "RotationTransformation",
      "ScaleTransformation",
      "SequenceTransformation",
      "SeriesLayer",
      "SparseArray",
      "SparseAxisReference",
      "SparseDataset",
      "SparseStore",
      "SpikesLayer",
      "StimulusSite",
      "TableDataset",
      "TraceLayer",
      "TranslationTransformation",
      "UnmappableTransformation",
      "User",
      "ValueHistogram",
      "ValueUnit",
      "WaveformLayer",
      "ZarrStore"
    ]
  }
};
      export default result;
    