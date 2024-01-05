import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  AffineMatrix: any;
  AssignationID: any;
  BigFile: any;
  DateTime: any;
  FeatureValue: any;
  File: any;
  GenericScalar: any;
  ImageFile: any;
  MetricValue: any;
  ModelData: any;
  ModelFile: any;
  Parquet: any;
  ParquetInput: any;
  Slice: any;
  Store: any;
  UUID: any;
  XArrayInput: any;
};

/** What do the multiple positions in this acquistion represent? */
export enum AcquisitionKind {
  PositionIsRoi = 'POSITION_IS_ROI',
  PostionIsSample = 'POSTION_IS_SAMPLE',
  Unknown = 'UNKNOWN'
}

/** Camera(id, created_by, created_through, created_while, serial_number, name, model, bit_depth, sensor_size_x, sensor_size_y, physical_sensor_size_x, physical_sensor_size_y, physical_sensor_size_unit, manufacturer) */
export type Camera = {
  __typename?: 'Camera';
  bitDepth?: Maybe<Scalars['Int']>;
  comments?: Maybe<Array<Maybe<Comment>>>;
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  manufacturer?: Maybe<Scalars['String']>;
  model?: Maybe<Scalars['String']>;
  name: Scalars['String'];
  /** Associated images through Omero */
  omeros?: Maybe<Array<Maybe<Omero>>>;
  physicalSensorSizeUnit?: Maybe<Scalars['String']>;
  physicalSensorSizeX?: Maybe<Scalars['Float']>;
  physicalSensorSizeY?: Maybe<Scalars['Float']>;
  sensorSizeX?: Maybe<Scalars['Float']>;
  sensorSizeY?: Maybe<Scalars['Float']>;
  serialNumber: Scalars['String'];
};


/** Camera(id, created_by, created_through, created_while, serial_number, name, model, bit_depth, sensor_size_x, sensor_size_y, physical_sensor_size_x, physical_sensor_size_y, physical_sensor_size_unit, manufacturer) */
export type CameraOmerosArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  timepoints?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
};

export type ChangePermissionsResult = {
  __typename?: 'ChangePermissionsResult';
  message?: Maybe<Scalars['String']>;
  success?: Maybe<Scalars['Boolean']>;
};

/** Channel(id, created_by, created_through, created_while, name, emission_wavelength, excitation_wavelength, acquisition_mode, color) */
export type Channel = {
  __typename?: 'Channel';
  /** The acquisition mode of the channel */
  acquisitionMode?: Maybe<Scalars['String']>;
  /** The default color for the channel (might be ommited by the rendered) */
  color?: Maybe<Scalars['String']>;
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  /** Associated maps of dimensions */
  dimensionMaps?: Maybe<Array<Maybe<DimensionMap>>>;
  /** The emmission wavelength of the fluorophore in nm */
  emissionWavelength?: Maybe<Scalars['Float']>;
  /** The excitation wavelength of the fluorophore in nm */
  excitationWavelength?: Maybe<Scalars['Float']>;
  id: Scalars['ID'];
  /** The name of the channel */
  name: Scalars['String'];
  views: Array<View>;
};


/** Channel(id, created_by, created_through, created_while, name, emission_wavelength, excitation_wavelength, acquisition_mode, color) */
export type ChannelDimensionMapsArgs = {
  dims?: InputMaybe<Array<InputMaybe<Dimension>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  index?: InputMaybe<Scalars['Float']>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
};

/**
 * A channel in an image
 *
 * Channels can be highly variable in their properties. This class is a
 * representation of the most common properties of a channel.
 */
export type ChannelInput = {
  /** The acquisition mode of the channel */
  acquisitionMode?: InputMaybe<Scalars['String']>;
  /** The default color for the channel (might be ommited by the rendered) */
  color?: InputMaybe<Scalars['String']>;
  /** The emmission wavelength of the fluorophore in nm */
  emmissionWavelength?: InputMaybe<Scalars['Float']>;
  /** The excitation wavelength of the fluorophore in nm */
  excitationWavelength?: InputMaybe<Scalars['Float']>;
  /** The name of the channel */
  name?: InputMaybe<Scalars['String']>;
};

/**
 * A column in a table
 *
 * A Column describes the associated name and metadata of a column in a table.
 * It gives access to the pandas and numpy dtypes of the column.
 */
export type Column = {
  __typename?: 'Column';
  /** The FIeld Name */
  fieldName: Scalars['String'];
  /** Generic MetaData from Stuff */
  metadata?: Maybe<Scalars['GenericScalar']>;
  /** The Column Name */
  name?: Maybe<Scalars['String']>;
  /** The Numpy Types for the Column */
  numpyType?: Maybe<Scalars['String']>;
  /** The Panda Types for the Column */
  pandasType?: Maybe<PandasDType>;
};

/**
 * A comment
 *
 * A comment is a user generated comment on a commentable object. A comment can be a reply to another comment or a top level comment.
 * Comments can be nested to any depth. A comment can be edited and deleted by the user that created it.
 */
export type Comment = {
  __typename?: 'Comment';
  /** Comments that are replies to this comment */
  children?: Maybe<Array<Maybe<Comment>>>;
  /** The content type of the commentable object */
  contentType?: Maybe<CommentableModels>;
  createdAt: Scalars['DateTime'];
  /** The descendents of the comment (this referes to the Comment Tree) */
  descendents?: Maybe<Array<Maybe<Descendent>>>;
  id: Scalars['ID'];
  mentions: Array<User>;
  objectId: Scalars['Int'];
  parent?: Maybe<Comment>;
  resolved?: Maybe<Scalars['DateTime']>;
  resolvedBy?: Maybe<User>;
  /** The text of the comment (without any formatting) */
  text?: Maybe<Scalars['String']>;
  user: User;
};


/**
 * A comment
 *
 * A comment is a user generated comment on a commentable object. A comment can be a reply to another comment or a top level comment.
 * Comments can be nested to any depth. A comment can be edited and deleted by the user that created it.
 */
export type CommentChildrenArgs = {
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
};

export enum CommentableModels {
  BordGraph = 'BORD_GRAPH',
  BordTable = 'BORD_TABLE',
  GrunnlagAnimal = 'GRUNNLAG_ANIMAL',
  GrunnlagAntibody = 'GRUNNLAG_ANTIBODY',
  GrunnlagCamera = 'GRUNNLAG_CAMERA',
  GrunnlagChannel = 'GRUNNLAG_CHANNEL',
  GrunnlagContext = 'GRUNNLAG_CONTEXT',
  GrunnlagDatalink = 'GRUNNLAG_DATALINK',
  GrunnlagDataset = 'GRUNNLAG_DATASET',
  GrunnlagDimensionmap = 'GRUNNLAG_DIMENSIONMAP',
  GrunnlagEra = 'GRUNNLAG_ERA',
  GrunnlagExperiment = 'GRUNNLAG_EXPERIMENT',
  GrunnlagExperimentalgroup = 'GRUNNLAG_EXPERIMENTALGROUP',
  GrunnlagFeature = 'GRUNNLAG_FEATURE',
  GrunnlagInstrument = 'GRUNNLAG_INSTRUMENT',
  GrunnlagLabel = 'GRUNNLAG_LABEL',
  GrunnlagMetric = 'GRUNNLAG_METRIC',
  GrunnlagModel = 'GRUNNLAG_MODEL',
  GrunnlagObjective = 'GRUNNLAG_OBJECTIVE',
  GrunnlagOmero = 'GRUNNLAG_OMERO',
  GrunnlagOmerofile = 'GRUNNLAG_OMEROFILE',
  GrunnlagPosition = 'GRUNNLAG_POSITION',
  GrunnlagRelation = 'GRUNNLAG_RELATION',
  GrunnlagRepresentation = 'GRUNNLAG_REPRESENTATION',
  GrunnlagRoi = 'GRUNNLAG_ROI',
  GrunnlagSample = 'GRUNNLAG_SAMPLE',
  GrunnlagStage = 'GRUNNLAG_STAGE',
  GrunnlagThumbnail = 'GRUNNLAG_THUMBNAIL',
  GrunnlagTimepoint = 'GRUNNLAG_TIMEPOINT',
  GrunnlagUsermeta = 'GRUNNLAG_USERMETA',
  GrunnlagVideo = 'GRUNNLAG_VIDEO',
  GrunnlagView = 'GRUNNLAG_VIEW'
}

/** Context(id, created_by, created_through, created_while, name, created_at, experiment, creator) */
export type Context = {
  __typename?: 'Context';
  /** The time the context was created */
  createdAt: Scalars['DateTime'];
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  /** The user that created the context */
  creator?: Maybe<User>;
  datasets: Array<Dataset>;
  experiment?: Maybe<Experiment>;
  id: Scalars['ID'];
  links: Array<DataLink>;
  /** The contexts this model is valid for */
  models: Array<Model>;
  /** The name of the context */
  name: Scalars['String'];
  /** The users that have pinned the context */
  pinnedBy: Array<User>;
  /** Tags for the context */
  tags?: Maybe<Array<Maybe<Scalars['String']>>>;
};

export type Credentials = {
  __typename?: 'Credentials';
  accessKey: Scalars['String'];
  secretKey: Scalars['String'];
  sessionToken: Scalars['String'];
  status: Scalars['String'];
};

/** DataLink(id, created_by, created_through, created_while, x_content_type, x_id, y_content_type, y_id, relation, left_type, right_type, context, created_at, creator) */
export type DataLink = {
  __typename?: 'DataLink';
  context?: Maybe<Context>;
  /** The time the sample was created */
  createdAt: Scalars['DateTime'];
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  /** The user that created the sample */
  creator?: Maybe<User>;
  id: Scalars['ID'];
  /** X */
  left?: Maybe<GenericObject>;
  /** X */
  leftId: Scalars['ID'];
  /** Left Type */
  leftType?: Maybe<LinkableModels>;
  /** The relation between the two objects */
  relation: Relation;
  /** Y */
  right?: Maybe<GenericObject>;
  /** Y */
  rightId: Scalars['ID'];
  /** Left Type */
  rightType?: Maybe<LinkableModels>;
  /**
   * X
   * @deprecated Use left
   */
  x?: Maybe<GenericObject>;
  /**
   * X
   * @deprecated Use leftId
   */
  xId: Scalars['ID'];
  /**
   * Y
   * @deprecated Use right
   */
  y?: Maybe<GenericObject>;
  /**
   * Y
   * @deprecated Use rightId
   */
  yId: Scalars['ID'];
};

/**
 *
 *     A dataset is a collection of data files and metadata files.
 *     It mimics the concept of a folder in a file system and is the top level
 *     object in the data model.
 *
 *
 */
export type Dataset = {
  __typename?: 'Dataset';
  children: Array<Dataset>;
  contexts: Array<Context>;
  /** The time the experiment was created */
  createdAt: Scalars['DateTime'];
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  experiments: Array<Experiment>;
  graphs: Array<Graph>;
  id: Scalars['ID'];
  models: Array<Model>;
  /** The name of the experiment */
  name: Scalars['String'];
  omerofiles: Array<OmeroFile>;
  parent?: Maybe<Dataset>;
  /** Is the table pinned by the active user */
  pinned?: Maybe<Scalars['Boolean']>;
  /** The users that have pinned the experiment */
  pinnedBy: Array<User>;
  /** Associated images through Omero */
  representations?: Maybe<Array<Maybe<Representation>>>;
  samples: Array<Sample>;
  stages: Array<Stage>;
  tables: Array<Table>;
  /** Tags for the experiment */
  tags?: Maybe<Array<Maybe<Scalars['String']>>>;
};


/**
 *
 *     A dataset is a collection of data files and metadata files.
 *     It mimics the concept of a folder in a file system and is the top level
 *     object in the data model.
 *
 *
 */
export type DatasetRepresentationsArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['ID']>;
  datasets?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  derivedTags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  forceThumbnail?: InputMaybe<Scalars['Boolean']>;
  hasMetric?: InputMaybe<Scalars['String']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  isRoiDerived?: InputMaybe<Scalars['Boolean']>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  noChildren?: InputMaybe<Scalars['Boolean']>;
  noParents?: InputMaybe<Scalars['Boolean']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ordering?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  samples?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  stages?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  variety?: InputMaybe<RepresentationVarietyInput>;
};

export type DeleteChannelResult = {
  __typename?: 'DeleteChannelResult';
  id?: Maybe<Scalars['ID']>;
};

export type DeleteContextResult = {
  __typename?: 'DeleteContextResult';
  id?: Maybe<Scalars['String']>;
};

export type DeleteDatasetResult = {
  __typename?: 'DeleteDatasetResult';
  id?: Maybe<Scalars['String']>;
};

export type DeleteDimensionsMap = {
  __typename?: 'DeleteDimensionsMap';
  id?: Maybe<Scalars['ID']>;
};

export type DeleteEraResult = {
  __typename?: 'DeleteEraResult';
  id?: Maybe<Scalars['String']>;
};

export type DeleteExperimentResult = {
  __typename?: 'DeleteExperimentResult';
  id?: Maybe<Scalars['String']>;
};

export type DeleteGraphResult = {
  __typename?: 'DeleteGraphResult';
  id?: Maybe<Scalars['String']>;
};

export type DeleteLinkResult = {
  __typename?: 'DeleteLinkResult';
  id?: Maybe<Scalars['String']>;
};

export type DeleteModelResult = {
  __typename?: 'DeleteModelResult';
  id?: Maybe<Scalars['String']>;
};

export type DeleteOmeroFileResult = {
  __typename?: 'DeleteOmeroFileResult';
  id?: Maybe<Scalars['String']>;
};

export type DeletePlotResult = {
  __typename?: 'DeletePlotResult';
  id?: Maybe<Scalars['String']>;
};

export type DeletePositionResult = {
  __typename?: 'DeletePositionResult';
  id?: Maybe<Scalars['String']>;
};

export type DeleteRoiResult = {
  __typename?: 'DeleteROIResult';
  id?: Maybe<Scalars['String']>;
};

export type DeleteRepresentationResult = {
  __typename?: 'DeleteRepresentationResult';
  id?: Maybe<Scalars['String']>;
};

export type DeleteSampleResult = {
  __typename?: 'DeleteSampleResult';
  id?: Maybe<Scalars['String']>;
};

export type DeleteStageResult = {
  __typename?: 'DeleteStageResult';
  id?: Maybe<Scalars['String']>;
};

export type DeleteTableResult = {
  __typename?: 'DeleteTableResult';
  id?: Maybe<Scalars['String']>;
};

export type DeleteTimepointResult = {
  __typename?: 'DeleteTimepointResult';
  id?: Maybe<Scalars['String']>;
};

export type DeleteViewReturn = {
  __typename?: 'DeleteViewReturn';
  id?: Maybe<Scalars['ID']>;
};

export type DescendendInput = {
  /** Is this a bold leaf? */
  bold?: InputMaybe<Scalars['Boolean']>;
  children?: InputMaybe<Array<InputMaybe<DescendendInput>>>;
  /** Is this a code leaf? */
  code?: InputMaybe<Scalars['Boolean']>;
  /** Is this a italic leaf? */
  italic?: InputMaybe<Scalars['Boolean']>;
  /** The text of the leaf */
  text?: InputMaybe<Scalars['String']>;
  /** The type of the descendent */
  typename?: InputMaybe<Scalars['String']>;
  /** The user that is mentioned */
  user?: InputMaybe<Scalars['String']>;
};

/** A descendent of a node in the comment tree */
export type Descendent = {
  typename?: Maybe<Scalars['String']>;
};

/** The dimension of the data */
export enum Dimension {
  C = 'C',
  T = 'T',
  X = 'X',
  Y = 'Y',
  Z = 'Z'
}

/** DimensionMap(id, created_by, created_through, created_while, omero, channel, dimension, index) */
export type DimensionMap = {
  __typename?: 'DimensionMap';
  channel: Channel;
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  dimension: Scalars['String'];
  id: Scalars['ID'];
  /** The index of the channel */
  index: Scalars['Int'];
  omero: Omero;
};

/** Era(id, created_by, created_through, created_while, name, start, end, created_at) */
export type Era = {
  __typename?: 'Era';
  comments?: Maybe<Array<Maybe<Comment>>>;
  /** The time the experiment was created */
  createdAt: Scalars['DateTime'];
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  /** The end of the era */
  end?: Maybe<Scalars['DateTime']>;
  id: Scalars['ID'];
  /** The name of the era */
  name: Scalars['String'];
  pinned?: Maybe<Scalars['Boolean']>;
  /** The users that have pinned the era */
  pinnedBy: Array<User>;
  /** The start of the era */
  start?: Maybe<Scalars['DateTime']>;
  /** A comma-separated list of tags. */
  tags?: Maybe<Array<Maybe<Scalars['String']>>>;
  /** Associated Timepoints */
  timepoints?: Maybe<Array<Maybe<Timepoint>>>;
};


/** Era(id, created_by, created_through, created_while, name, start, end, created_at) */
export type EraTimepointsArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  deltaT?: InputMaybe<Scalars['Float']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
};

/**
 *
 *     An experiment is a collection of samples and their representations.
 *     It mimics the concept of an experiment in the lab and is the top level
 *     object in the data model.
 *
 *     You can use the experiment to group samples and representations likewise
 *     to how you would group files into folders in a file system.
 *
 */
export type Experiment = {
  __typename?: 'Experiment';
  comments?: Maybe<Array<Maybe<Comment>>>;
  contexts: Array<Context>;
  /** The time the experiment was created */
  createdAt: Scalars['DateTime'];
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  /** The user that created the experiment */
  creator?: Maybe<User>;
  datasets: Array<Dataset>;
  /** A short description of the experiment */
  description?: Maybe<Scalars['String']>;
  /** A long description of the experiment */
  descriptionLong?: Maybe<Scalars['String']>;
  /** The experiments this image belongs to */
  experiments: Array<Representation>;
  id: Scalars['ID'];
  /** An image to be used as a banner for the experiment */
  image?: Maybe<Scalars['String']>;
  /** A link to a paper describing the experiment */
  linkedPaper?: Maybe<Scalars['String']>;
  /** The Representatoin this Metric belongs to */
  metrics: Array<Metric>;
  /** The experiment this model belongs to */
  models: Array<Model>;
  /** The name of the experiment */
  name: Scalars['String'];
  /** The experiment this file belongs to */
  omeroFiles: Array<OmeroFile>;
  pinned?: Maybe<Scalars['Boolean']>;
  /** The users that have pinned the experiment */
  pinnedBy: Array<User>;
  samples?: Maybe<Array<Maybe<Sample>>>;
  /** The Experiment this Table belongs to. */
  tables: Array<Table>;
  /** Tags for the experiment */
  tags?: Maybe<Array<Maybe<Scalars['String']>>>;
};


/**
 *
 *     An experiment is a collection of samples and their representations.
 *     It mimics the concept of an experiment in the lab and is the top level
 *     object in the data model.
 *
 *     You can use the experiment to group samples and representations likewise
 *     to how you would group files into folders in a file system.
 *
 */
export type ExperimentSamplesArgs = {
  app?: InputMaybe<Scalars['String']>;
  bioseries?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['ID']>;
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  representations?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};

export type ExperimentsEvent = {
  __typename?: 'ExperimentsEvent';
  create?: Maybe<Experiment>;
  deleted?: Maybe<Scalars['ID']>;
  update?: Maybe<Experiment>;
};

/**
 * A Feature is a numerical key value pair that is attached to a Label.
 *
 *     You can model it for example as a key value pair of a class instance of a segmentation mask.
 *     Representation -> Label0 -> Feature0
 *                              -> Feature1
 *                    -> Label1 -> Feature0
 *
 *     Features can be used to store any numerical value that is attached to a class instance.
 *     THere can only ever be one key per label. If you want to store multiple values for a key, you can
 *     store them as a list in the value field.
 *
 *     Feature are analogous to metrics on a representation, but for a specific class instance (Label)
 *
 *
 */
export type Feature = {
  __typename?: 'Feature';
  comments?: Maybe<Array<Maybe<Comment>>>;
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  /** The user that created the Feature */
  creator?: Maybe<User>;
  id: Scalars['ID'];
  /** The key of the feature */
  key: Scalars['String'];
  /** The Label this Feature belongs to */
  label?: Maybe<Label>;
  /** Value */
  value?: Maybe<Scalars['FeatureValue']>;
};

export type GenericObject = Experiment | Feature | Label | Model | Position | Roi | Representation | Sample | Stage;

/** Graph(id, created_by, created_through, created_while, name, used_columns, image) */
export type Graph = {
  __typename?: 'Graph';
  comments?: Maybe<Array<Maybe<Comment>>>;
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  datasets: Array<Dataset>;
  id: Scalars['ID'];
  image?: Maybe<Scalars['String']>;
  name: Scalars['String'];
  pinnedBy: Array<User>;
  tables: Array<Table>;
  /** A comma-separated list of tags. */
  tags?: Maybe<Array<Maybe<Scalars['String']>>>;
  usedColumns?: Maybe<Scalars['GenericScalar']>;
};

/**
 * Group
 *
 * This object represents a group in the system. Groups are used to
 * control access to different parts of the system. Groups are assigned
 * to users. A user has access to a part of the system if the user is
 * a member of a group that has the permission assigned to it.
 */
export type Group = {
  __typename?: 'Group';
  id: Scalars['ID'];
  name: Scalars['String'];
  permissions: Array<Permission>;
  /** The groups this user belongs to. A user will get all permissions granted to each of their groups. */
  userSet: Array<User>;
};

export type GroupAssignment = {
  __typename?: 'GroupAssignment';
  /** A query that returns an image path */
  group: Group;
  permissions: Array<Maybe<Scalars['String']>>;
};

export type GroupAssignmentInput = {
  group: Scalars['ID'];
  permissions: Array<InputMaybe<Scalars['String']>>;
};

/**
 * The imaging environment during the acquisition
 *
 * Follows the OME model for imaging environment
 */
export type ImagingEnvironment = {
  __typename?: 'ImagingEnvironment';
  /** The air pressure during the acquisition */
  airPressure?: Maybe<Scalars['Float']>;
  /** The CO2 percentage in the environment */
  co2Percent?: Maybe<Scalars['Float']>;
  /** The humidity of the imaging environment */
  humidity?: Maybe<Scalars['Float']>;
  /** A map of the imaging environment. Key value based */
  map?: Maybe<Scalars['GenericScalar']>;
  /** The temperature of the imaging environment */
  temperature?: Maybe<Scalars['Float']>;
};

/**
 * The imaging environment during the acquisition
 *
 * Follows the OME model for imaging environment
 */
export type ImagingEnvironmentInput = {
  /** The air pressure during the acquisition */
  airPressure?: InputMaybe<Scalars['Float']>;
  /** The CO2 percentage in the environment */
  co2Percent?: InputMaybe<Scalars['Float']>;
  /** The humidity of the imaging environment */
  humidity?: InputMaybe<Scalars['Float']>;
  /** A map of the imaging environment. Key value based */
  map?: InputMaybe<Scalars['GenericScalar']>;
  /** The temperature of the imaging environment */
  temperature?: InputMaybe<Scalars['Float']>;
};

export type InputVector = {
  /** C-coordinate */
  c?: InputMaybe<Scalars['Float']>;
  /** T-coordinate */
  t?: InputMaybe<Scalars['Float']>;
  /** X-coordinate */
  x?: InputMaybe<Scalars['Float']>;
  /** Y-coordinate */
  y?: InputMaybe<Scalars['Float']>;
  /** Z-coordinate */
  z?: InputMaybe<Scalars['Float']>;
};

/** Instrument(id, created_by, created_through, created_while, name, detectors, dichroics, filters, lot_number, manufacturer, model, serial_number) */
export type Instrument = {
  __typename?: 'Instrument';
  comments?: Maybe<Array<Maybe<Comment>>>;
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  detectors?: Maybe<Scalars['GenericScalar']>;
  dichroics?: Maybe<Scalars['GenericScalar']>;
  filters?: Maybe<Scalars['GenericScalar']>;
  id: Scalars['ID'];
  lotNumber?: Maybe<Scalars['String']>;
  manufacturer?: Maybe<Scalars['String']>;
  model?: Maybe<Scalars['String']>;
  name: Scalars['String'];
  objectives: Array<Objective>;
  /** Associated images through Omero */
  omeros?: Maybe<Array<Maybe<Omero>>>;
  serialNumber?: Maybe<Scalars['String']>;
  stageSet: Array<Stage>;
  views: Array<View>;
};


/** Instrument(id, created_by, created_through, created_while, name, detectors, dichroics, filters, lot_number, manufacturer, model, serial_number) */
export type InstrumentOmerosArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  timepoints?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
};

/**
 * A Label is a trough model for image and features.
 *
 *     Its map an instance value of a representation
 *     (e.g. a pixel value of a segmentation mask) to a set of corresponding features of the segmented
 *     class instance.
 *
 *     There can only be one label per representation and class instance. You can then attach
 *     features to the label.
 *
 *
 *
 */
export type Label = {
  __typename?: 'Label';
  comments?: Maybe<Array<Maybe<Comment>>>;
  /** The time the Label was created */
  createdAt: Scalars['DateTime'];
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  /** The user that created the Label */
  creator: User;
  feature?: Maybe<Feature>;
  /** Features attached to this Label */
  features?: Maybe<Array<Maybe<Feature>>>;
  id: Scalars['ID'];
  /** The instance value of the representation (pixel value). Must be a value of the image array */
  instance: Scalars['Int'];
  /** The name of the instance */
  name?: Maybe<Scalars['String']>;
  pinned?: Maybe<Scalars['Boolean']>;
  /** The users that pinned this Label */
  pinnedBy: Array<User>;
  /** The Representation this Label instance belongs to */
  representation?: Maybe<Representation>;
  /** A comma-separated list of tags. */
  tags?: Maybe<Array<Maybe<Scalars['String']>>>;
};


/**
 * A Label is a trough model for image and features.
 *
 *     Its map an instance value of a representation
 *     (e.g. a pixel value of a segmentation mask) to a set of corresponding features of the segmented
 *     class instance.
 *
 *     There can only be one label per representation and class instance. You can then attach
 *     features to the label.
 *
 *
 *
 */
export type LabelFeatureArgs = {
  key: Scalars['String'];
};


/**
 * A Label is a trough model for image and features.
 *
 *     Its map an instance value of a representation
 *     (e.g. a pixel value of a segmentation mask) to a set of corresponding features of the segmented
 *     class instance.
 *
 *     There can only be one label per representation and class instance. You can then attach
 *     features to the label.
 *
 *
 *
 */
export type LabelFeaturesArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['Float']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  keys?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  label?: InputMaybe<Scalars['ID']>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  substring?: InputMaybe<Scalars['String']>;
};

/** A leaf in the comment tree. Representations some sort of text */
export type Leaf = Descendent & {
  __typename?: 'Leaf';
  /** Is this a bold leaf? */
  bold?: Maybe<Scalars['Boolean']>;
  /** Is this a code leaf? */
  code?: Maybe<Scalars['Boolean']>;
  /** Is this a italic leaf? */
  italic?: Maybe<Scalars['Boolean']>;
  /** The text of the leaf */
  text?: Maybe<Scalars['String']>;
  typename?: Maybe<Scalars['String']>;
};

/** LinkableModels Models are models that can be shared amongst users and groups. They representent the models of the DB */
export enum LinkableModels {
  AdminLogentry = 'ADMIN_LOGENTRY',
  AuthGroup = 'AUTH_GROUP',
  AuthPermission = 'AUTH_PERMISSION',
  BordGraph = 'BORD_GRAPH',
  BordTable = 'BORD_TABLE',
  ContenttypesContenttype = 'CONTENTTYPES_CONTENTTYPE',
  DbTestmodel = 'DB_TESTMODEL',
  GrunnlagAnimal = 'GRUNNLAG_ANIMAL',
  GrunnlagAntibody = 'GRUNNLAG_ANTIBODY',
  GrunnlagCamera = 'GRUNNLAG_CAMERA',
  GrunnlagChannel = 'GRUNNLAG_CHANNEL',
  GrunnlagContext = 'GRUNNLAG_CONTEXT',
  GrunnlagDatalink = 'GRUNNLAG_DATALINK',
  GrunnlagDataset = 'GRUNNLAG_DATASET',
  GrunnlagDimensionmap = 'GRUNNLAG_DIMENSIONMAP',
  GrunnlagEra = 'GRUNNLAG_ERA',
  GrunnlagExperiment = 'GRUNNLAG_EXPERIMENT',
  GrunnlagExperimentalgroup = 'GRUNNLAG_EXPERIMENTALGROUP',
  GrunnlagFeature = 'GRUNNLAG_FEATURE',
  GrunnlagInstrument = 'GRUNNLAG_INSTRUMENT',
  GrunnlagLabel = 'GRUNNLAG_LABEL',
  GrunnlagMetric = 'GRUNNLAG_METRIC',
  GrunnlagModel = 'GRUNNLAG_MODEL',
  GrunnlagObjective = 'GRUNNLAG_OBJECTIVE',
  GrunnlagOmero = 'GRUNNLAG_OMERO',
  GrunnlagOmerofile = 'GRUNNLAG_OMEROFILE',
  GrunnlagPosition = 'GRUNNLAG_POSITION',
  GrunnlagRelation = 'GRUNNLAG_RELATION',
  GrunnlagRepresentation = 'GRUNNLAG_REPRESENTATION',
  GrunnlagRoi = 'GRUNNLAG_ROI',
  GrunnlagSample = 'GRUNNLAG_SAMPLE',
  GrunnlagStage = 'GRUNNLAG_STAGE',
  GrunnlagThumbnail = 'GRUNNLAG_THUMBNAIL',
  GrunnlagTimepoint = 'GRUNNLAG_TIMEPOINT',
  GrunnlagUsermeta = 'GRUNNLAG_USERMETA',
  GrunnlagVideo = 'GRUNNLAG_VIDEO',
  GrunnlagView = 'GRUNNLAG_VIEW',
  GuardianGroupobjectpermission = 'GUARDIAN_GROUPOBJECTPERMISSION',
  GuardianUserobjectpermission = 'GUARDIAN_USEROBJECTPERMISSION',
  KommentComment = 'KOMMENT_COMMENT',
  LokLokapp = 'LOK_LOKAPP',
  LokLokclient = 'LOK_LOKCLIENT',
  LokLokuser = 'LOK_LOKUSER',
  PlotqlPlot = 'PLOTQL_PLOT',
  SessionsSession = 'SESSIONS_SESSION',
  TaggitTag = 'TAGGIT_TAG',
  TaggitTaggeditem = 'TAGGIT_TAGGEDITEM'
}

export type LokApp = {
  __typename?: 'LokApp';
  id: Scalars['ID'];
  identifier: Scalars['String'];
  lokclientSet: Array<LokClient>;
  version: Scalars['String'];
};

export type LokClient = {
  __typename?: 'LokClient';
  app: LokApp;
  cameraCreatedThrough: Array<Camera>;
  channelCreatedThrough: Array<Channel>;
  clientId: Scalars['String'];
  contextCreatedThrough: Array<Context>;
  datalinkCreatedThrough: Array<DataLink>;
  datasetCreatedThrough: Array<Dataset>;
  dimensionmapCreatedThrough: Array<DimensionMap>;
  eraCreatedThrough: Array<Era>;
  experimentCreatedThrough: Array<Experiment>;
  featureCreatedThrough: Array<Feature>;
  grantType: LokClientGrantType;
  graphCreatedThrough: Array<Graph>;
  id: Scalars['ID'];
  instrumentCreatedThrough: Array<Instrument>;
  iss: Scalars['String'];
  labelCreatedThrough: Array<Label>;
  metricCreatedThrough: Array<Metric>;
  modelCreatedThrough: Array<Model>;
  name: Scalars['String'];
  objectiveCreatedThrough: Array<Objective>;
  omeroCreatedThrough: Array<Omero>;
  omerofileCreatedThrough: Array<OmeroFile>;
  positionCreatedThrough: Array<Position>;
  relationCreatedThrough: Array<Relation>;
  representationCreatedThrough: Array<Representation>;
  roiCreatedThrough: Array<Roi>;
  sampleCreatedThrough: Array<Sample>;
  stageCreatedThrough: Array<Stage>;
  tableCreatedThrough: Array<Table>;
  thumbnailCreatedThrough: Array<Thumbnail>;
  timepointCreatedThrough: Array<Timepoint>;
  videoCreatedThrough: Array<Video>;
  viewCreatedThrough: Array<View>;
};

/** An enumeration. */
export enum LokClientGrantType {
  /** Authorization Code */
  AuthorizationCode = 'AUTHORIZATION_CODE',
  /** Backend (Client Credentials) */
  ClientCredentials = 'CLIENT_CREDENTIALS',
  /** Implicit Grant */
  Implicit = 'IMPLICIT',
  /** Password */
  Password = 'PASSWORD',
  /** Django Session */
  Session = 'SESSION'
}

/**
 * The medium of the imaging environment
 *
 * Important for the objective settings
 */
export enum Medium {
  Air = 'AIR',
  Glycerol = 'GLYCEROL',
  Oil = 'OIL',
  Other = 'OTHER',
  Water = 'WATER'
}

/** A mention in the comment tree. This  is a reference to another user on the platform */
export type MentionDescendent = Descendent & Node & {
  __typename?: 'MentionDescendent';
  children?: Maybe<Array<Maybe<Descendent>>>;
  typename?: Maybe<Scalars['String']>;
  untypedChildren?: Maybe<Scalars['GenericScalar']>;
  /** The user that is mentioned */
  user: User;
};

export type MentionEvent = {
  __typename?: 'MentionEvent';
  create?: Maybe<Comment>;
  deleted?: Maybe<Scalars['ID']>;
  update?: Maybe<Comment>;
};

export type Metric = {
  __typename?: 'Metric';
  comments?: Maybe<Array<Maybe<Comment>>>;
  createdAt: Scalars['DateTime'];
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  creator?: Maybe<User>;
  /** The Representatoin this Metric belongs to */
  experiment?: Maybe<Experiment>;
  id: Scalars['ID'];
  /** The Key */
  key: Scalars['String'];
  /** The Representatoin this Metric belongs to */
  representation?: Maybe<Representation>;
  /** The Sample this Metric belongs to */
  sample?: Maybe<Sample>;
  /** Value */
  value?: Maybe<Scalars['MetricValue']>;
};

/**
 * A
 *
 *     Mikro uses the omero-meta data to create representations of the file. See Representation for more information.
 *
 */
export type Model = {
  __typename?: 'Model';
  comments?: Maybe<Array<Maybe<Comment>>>;
  /** The contexts this model is valid for */
  contexts: Array<Context>;
  /** The time the file was created */
  createdAt: Scalars['DateTime'];
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  /** The user that created/uploaded the file */
  creator?: Maybe<User>;
  /** The model data */
  data?: Maybe<Scalars['ModelData']>;
  datasets: Array<Dataset>;
  /** The experiment this model belongs to */
  experiments: Array<Experiment>;
  id: Scalars['ID'];
  /** The kind of model */
  kind?: Maybe<ModelKind>;
  /** The name of the model */
  name: Scalars['String'];
};

/** What format is the model in? */
export enum ModelKind {
  Onnx = 'ONNX',
  Pytorch = 'PYTORCH',
  Tensorflow = 'TENSORFLOW',
  Unknown = 'UNKNOWN'
}

/** The root Mutation */
export type Mutation = {
  __typename?: 'Mutation';
  /**
   * Add Posistion
   *
   *     This mutation adds a position to an experiment and returns the experiment.
   */
  addPosition?: Maybe<Omero>;
  /**
   * Add Timepoint
   *
   *     This mutation adds a position to an experiment and returns the experiment.
   */
  addTimepoint?: Maybe<Omero>;
  associateFiles?: Maybe<Experiment>;
  associateSamples?: Maybe<Experiment>;
  /** Creates a Sample */
  changePermissions?: Maybe<ChangePermissionsResult>;
  /**
   * Creates an Camera
   *
   *     This mutation creates an Instrument and returns the created Instrument.
   *     The serial number is required and the manufacturer is inferred from the serial number.
   *
   */
  createCamera?: Maybe<Camera>;
  /**
   * Creates a Feature
   *
   *     This mutation creates a Feature and returns the created Feature.
   *     We require a reference to the label that the feature belongs to.
   *     As well as the key and value of the feature.
   *
   *     There can be multiple features with the same label, but only one feature per key
   *     per label
   */
  createChannel?: Maybe<Channel>;
  /**
   * Create an Comment
   *
   *     This mutation creates a comment. It takes a commentable_id and a commentable_type.
   *     If this is the first comment on the commentable, it will create a new comment thread.
   *     If there is already a comment thread, it will add the comment to the thread (by setting
   *     it's parent to the last parent comment in the thread).
   *
   *     CreateComment takes a list of Descendents, which are the comment tree. The Descendents
   *     are a recursive structure, where each Descendent can have a list of Descendents as children.
   *     The Descendents are either a Leaf, which is a text node, or a MentionDescendent, which is a
   *     reference to another user on the platform.
   *
   *     Please convert your comment tree to a list of Descendents before sending it to the server.
   *     TODO: Add a converter from a comment tree to a list of Descendents.
   *
   *
   *     (only signed in users)
   */
  createComment?: Maybe<Comment>;
  /**
   * Create an Experiment
   *
   *     This mutation creates an Experiment and returns the created Experiment.
   *
   */
  createContext?: Maybe<Context>;
  /**
   * Create an Experiment
   *
   *     This mutation creates an Experiment and returns the created Experiment.
   *
   */
  createDataset?: Maybe<Dataset>;
  /**
   * Creates a Feature
   *
   *     This mutation creates a Feature and returns the created Feature.
   *     We require a reference to the label that the feature belongs to.
   *     As well as the key and value of the feature.
   *
   *     There can be multiple features with the same label, but only one feature per key
   *     per label
   */
  createDimensionMap?: Maybe<DimensionMap>;
  /**
   * Creates a Stage
   *
   *     This mutation creates a Feature and returns the created Feature.
   *     We require a reference to the label that the feature belongs to.
   *     As well as the key and value of the feature.
   *
   *     There can be multiple features with the same label, but only one feature per key
   *     per label
   */
  createEra?: Maybe<Era>;
  /**
   * Create an Experiment
   *
   *     This mutation creates an Experiment and returns the created Experiment.
   *
   */
  createExperiment?: Maybe<Experiment>;
  /** Creates a Representation */
  createGraph?: Maybe<Graph>;
  /**
   * Creates an Instrument
   *
   *     This mutation creates an Instrument and returns the created Instrument.
   *     The serial number is required and the manufacturer is inferred from the serial number.
   *
   */
  createInstrument?: Maybe<Instrument>;
  /**
   * Creates a Label
   *
   *     This mutation creates a Label and returns the created Label.
   *     We require a reference to the image pixel value that the label belongs to.
   *     (Labels can be created for any pixel in an image, no matter if this image
   *     is a mask or not). However labels can only be created for pixels that are
   *     integer values.
   *
   *
   *
   *
   */
  createLabel?: Maybe<Label>;
  /**
   * Create a metric
   *
   *     This mutation creates a metric and returns the created metric.
   *
   *
   */
  createMetric?: Maybe<Metric>;
  /**
   * Creates an Instrument
   *
   *     This mutation creates an Instrument and returns the created Instrument.
   *     The serial number is required and the manufacturer is inferred from the serial number.
   *
   */
  createModel?: Maybe<Model>;
  /**
   * Creates an Instrument
   *
   *     This mutation creates an Instrument and returns the created Instrument.
   *     The serial number is required and the manufacturer is inferred from the serial number.
   *
   */
  createObjective?: Maybe<Objective>;
  /** Create an experiment (only signed in users) */
  createPlot?: Maybe<Plot>;
  /**
   * Creates a Feature
   *
   *     This mutation creates a Feature and returns the created Feature.
   *     We require a reference to the label that the feature belongs to.
   *     As well as the key and value of the feature.
   *
   *     There can be multiple features with the same label, but only one feature per key
   *     per label
   */
  createPosition?: Maybe<Position>;
  /** Creates a Sample */
  createROI?: Maybe<Roi>;
  /** Creates a Sample */
  createROIS?: Maybe<Representation>;
  /**
   * Creates a new Relation
   *
   *     This mutation creates a Feature and returns the created Feature.
   *     We require a reference to the label that the feature belongs to.
   *     As well as the key and value of the feature.
   *
   *     There can be multiple features with the same label, but only one feature per key
   *     per label
   */
  createRelation?: Maybe<Relation>;
  /** Creates a Sample */
  createSample?: Maybe<Sample>;
  /**
   * Creates a Stage
   *
   *     This mutation creates a Feature and returns the created Feature.
   *     We require a reference to the label that the feature belongs to.
   *     As well as the key and value of the feature.
   *
   *     There can be multiple features with the same label, but only one feature per key
   *     per label
   */
  createStage?: Maybe<Stage>;
  /** Creates a Representation */
  createTable?: Maybe<Table>;
  /**
   * Creates a Timepoint
   *
   *     This mutation creates a Feature and returns the created Feature.
   *     We require a reference to the label that the feature belongs to.
   *     As well as the key and value of the feature.
   *
   *     There can be multiple features with the same label, but only one feature per key
   *     per label
   */
  createTimepoint?: Maybe<Timepoint>;
  /**
   * Creates a Feature
   *
   *     This mutation creates a Feature and returns the created Feature.
   *     We require a reference to the label that the feature belongs to.
   *     As well as the key and value of the feature.
   *
   *     There can be multiple features with the same label, but only one feature per key
   *     per label
   */
  createView?: Maybe<View>;
  /**
   * Creates a Feature
   *
   *     This mutation creates a Feature and returns the created Feature.
   *     We require a reference to the label that the feature belongs to.
   *     As well as the key and value of the feature.
   *
   *     There can be multiple features with the same label, but only one feature per key
   *     per label
   */
  createfeature?: Maybe<Feature>;
  /**
   * Delete Experiment
   *
   *     This mutation deletes an Experiment and returns the deleted Experiment.
   */
  deleteChannel?: Maybe<DeleteChannelResult>;
  /**
   * Delete Experiment
   *
   *     This mutation deletes an Experiment and returns the deleted Experiment.
   */
  deleteContext?: Maybe<DeleteContextResult>;
  /**
   * Delete Experiment
   *
   *     This mutation deletes an Experiment and returns the deleted Experiment.
   */
  deleteDataset?: Maybe<DeleteDatasetResult>;
  /**
   * Delete Experiment
   *
   *     This mutation deletes an Experiment and returns the deleted Experiment.
   */
  deleteDimensionMap?: Maybe<DeleteDimensionsMap>;
  /**
   * Delete Experiment
   *
   *     This mutation deletes an Experiment and returns the deleted Experiment.
   */
  deleteEra?: Maybe<DeleteEraResult>;
  /**
   * Delete Experiment
   *
   *     This mutation deletes an Experiment and returns the deleted Experiment.
   */
  deleteExperiment?: Maybe<DeleteExperimentResult>;
  /** Create an experiment (only signed in users) */
  deleteGraph?: Maybe<DeleteGraphResult>;
  /**
   * Delete Experiment
   *
   *     This mutation deletes an Experiment and returns the deleted Experiment.
   */
  deleteLink?: Maybe<DeleteLinkResult>;
  /**
   * Delete Experiment
   *
   *     This mutation deletes an Experiment and returns the deleted Experiment.
   */
  deleteModel?: Maybe<DeleteModelResult>;
  /** Delete OmeroFile */
  deleteOmeroFile?: Maybe<DeleteOmeroFileResult>;
  /** Create an experiment (only signed in users) */
  deletePlot?: Maybe<DeletePlotResult>;
  /**
   * Delete Experiment
   *
   *     This mutation deletes an Experiment and returns the deleted Experiment.
   */
  deletePosition?: Maybe<DeletePositionResult>;
  /** Create an experiment (only signed in users) */
  deleteROI?: Maybe<DeleteRoiResult>;
  /** Create an experiment (only signed in users) */
  deleteRepresentation?: Maybe<DeleteRepresentationResult>;
  /** Create an experiment (only signed in users) */
  deleteSample?: Maybe<DeleteSampleResult>;
  /**
   * Delete Experiment
   *
   *     This mutation deletes an Experiment and returns the deleted Experiment.
   */
  deleteStage?: Maybe<DeleteStageResult>;
  /** Create an experiment (only signed in users) */
  deleteTable?: Maybe<DeleteTableResult>;
  /**
   * Delete Experiment
   *
   *     This mutation deletes an Experiment and returns the deleted Experiment.
   */
  deleteTimepoint?: Maybe<DeleteTimepointResult>;
  /**
   * Delete Experiment
   *
   *     This mutation deletes an Experiment and returns the deleted Experiment.
   */
  deleteView?: Maybe<DeleteViewReturn>;
  /** Create an experiment (only signed in users) */
  freeRepresentation?: Maybe<Representation>;
  /** Creates a Representation */
  fromDf?: Maybe<Table>;
  /** Creates a Representation */
  fromXArray?: Maybe<Representation>;
  /**
   * Create an Comment
   *
   *     This mutation creates a comment. It takes a commentable_id and a commentable_type.
   *     If this is the first comment on the commentable, it will create a new comment thread.
   *     If there is already a comment thread, it will add the comment to the thread (by setting
   *     it's parent to the last parent comment in the thread).
   *
   *     CreateComment takes a list of Descendents, which are the comment tree. The Descendents
   *     are a recursive structure, where each Descendent can have a list of Descendents as children.
   *     The Descendents are either a Leaf, which is a text node, or a MentionDescendent, which is a
   *     reference to another user on the platform.
   *
   *     Please convert your comment tree to a list of Descendents before sending it to the server.
   *     TODO: Add a converter from a comment tree to a list of Descendents.
   *
   *
   *     (only signed in users)
   */
  link?: Maybe<DataLink>;
  negotiate?: Maybe<Scalars['GenericScalar']>;
  /**
   * Pin Experiment
   *
   *     This mutation pins an Experiment and returns the pinned Experiment.
   */
  pinDataset?: Maybe<Dataset>;
  /**
   * Pin Stage
   *
   *     This mutation pins an Experiment and returns the pinned Experiment.
   */
  pinEra?: Maybe<Era>;
  /**
   * Pin Experiment
   *
   *     This mutation pins an Experiment and returns the pinned Experiment.
   */
  pinExperiment?: Maybe<Experiment>;
  /**
   * Pin Acquisition
   *
   *     This mutation pins an Experiment and returns the pinned Experiment.
   */
  pinPosition?: Maybe<Position>;
  /** Sets the pin */
  pinROI?: Maybe<Roi>;
  /** Sets the pin */
  pinRepresentation?: Maybe<Representation>;
  /** Sets the pin */
  pinSample?: Maybe<Sample>;
  /**
   * Pin Stage
   *
   *     This mutation pins an Experiment and returns the pinned Experiment.
   */
  pinStage?: Maybe<Stage>;
  /**
   * Pin Acquisition
   *
   *     This mutation pins an Experiment and returns the pinned Experiment.
   */
  pinTimepoint?: Maybe<Timepoint>;
  /** Presign a file for upload */
  presign?: Maybe<Presigned>;
  putDatasets?: Maybe<Dataset>;
  putFiles?: Maybe<Dataset>;
  putRepresentations?: Maybe<Dataset>;
  putSamples?: Maybe<Dataset>;
  releaseDatasets?: Maybe<Dataset>;
  releaseFiles?: Maybe<Dataset>;
  releaseRepresentations?: Maybe<Dataset>;
  releaseSamples?: Maybe<Dataset>;
  /**
   * Remove Posistion
   *
   *     This mutation adds a position to an experiment and returns the experiment.
   */
  removePosition?: Maybe<Omero>;
  /**
   * Add Posistion
   *
   *     This mutation adds a position to an experiment and returns the experiment.
   */
  removeTimepoint?: Maybe<Omero>;
  /**
   * Reply to an Comment
   *
   *     This mutation creates a comment. It takes a commentable_id and a commentable_type.
   *     If this is the first comment on the commentable, it will create a new comment thread.
   *     If there is already a comment thread, it will add the comment to the thread (by setting
   *     it's parent to the last parent comment in the thread).
   *
   *     CreateComment takes a list of Descendents, which are the comment tree. The Descendents
   *     are a recursive structure, where each Descendent can have a list of Descendents as children.
   *     The Descendents are either a Leaf, which is a text node, or a MentionDescendent, which is a
   *     reference to another user on the platform.
   *
   *     Please convert your comment tree to a list of Descendents before sending it to the server.
   *     TODO: Add a converter from a comment tree to a list of Descendents.
   *
   *
   *     (only signed in users)
   */
  replyTo?: Maybe<Comment>;
  /**
   * Create an Comment
   *
   *     This mutation resolves a comment. By resolving a comment, it will be marked as resolved,
   *     and the user that resolved it will be set as the resolver.
   *
   *     (only signed in users)
   */
  resolveComment?: Maybe<Comment>;
  unassociateFiles?: Maybe<Experiment>;
  unassociateSamples?: Maybe<Experiment>;
  /**
   *  Update an Experiment
   *
   *     This mutation updates an Experiment and returns the updated Experiment.
   */
  updateDataset?: Maybe<Dataset>;
  /**
   *  Update an Experiment
   *
   *     This mutation updates an Experiment and returns the updated Experiment.
   */
  updateExperiment?: Maybe<Experiment>;
  /** Update an omero file */
  updateOmeroFile?: Maybe<OmeroFile>;
  /** Create an experiment (only signed in users) */
  updatePlot?: Maybe<Plot>;
  /** Updates an Representation (also retriggers meta-data retrieval from data stored in) */
  updateRepresentation?: Maybe<Representation>;
  /** Creates a Sample */
  updateSample?: Maybe<Sample>;
  /**
   *  Update an Experiment
   *
   *     This mutation updates an Experiment and returns the updated Experiment.
   */
  updateStage?: Maybe<Stage>;
  /** Updates an Representation (also retriggers meta-data retrieval from data stored in) */
  updateTable?: Maybe<Table>;
  /**
   * Upload a file to Mikro
   *
   *     This mutation uploads a file to Omero and returns the created OmeroFile.
   *
   */
  uploadBigFile?: Maybe<OmeroFile>;
  /**
   * Upload a file to Mikro
   *
   *     This mutation uploads a file to Omero and returns the created OmeroFile.
   *
   */
  uploadOmeroFile?: Maybe<OmeroFile>;
  uploadThumbnail?: Maybe<Thumbnail>;
  uploadVideo?: Maybe<Video>;
};


/** The root Mutation */
export type MutationAddPositionArgs = {
  omero: Scalars['ID'];
  position: Scalars['ID'];
};


/** The root Mutation */
export type MutationAddTimepointArgs = {
  omero: Scalars['ID'];
  timepoint: Scalars['ID'];
};


/** The root Mutation */
export type MutationAssociateFilesArgs = {
  experiment: Scalars['ID'];
  files: Array<InputMaybe<Scalars['ID']>>;
};


/** The root Mutation */
export type MutationAssociateSamplesArgs = {
  experiment: Scalars['ID'];
  samples: Array<InputMaybe<Scalars['ID']>>;
};


/** The root Mutation */
export type MutationChangePermissionsArgs = {
  groupAssignments?: InputMaybe<Array<InputMaybe<GroupAssignmentInput>>>;
  object: Scalars['ID'];
  type: SharableModels;
  userAssignments?: InputMaybe<Array<InputMaybe<UserAssignmentInput>>>;
};


/** The root Mutation */
export type MutationCreateCameraArgs = {
  bitDepth?: InputMaybe<Scalars['Int']>;
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  model?: InputMaybe<Scalars['String']>;
  name: Scalars['String'];
  physicalSensorSizeX: Scalars['Float'];
  physicalSensorSizeY: Scalars['Float'];
  sensorSizeX: Scalars['Int'];
  sensorSizeY: Scalars['Int'];
  serialNumber: Scalars['String'];
};


/** The root Mutation */
export type MutationCreateChannelArgs = {
  acquisitionMode?: InputMaybe<Scalars['String']>;
  color?: InputMaybe<Scalars['String']>;
  emissionWavelength?: InputMaybe<Scalars['Float']>;
  excitationWavelength?: InputMaybe<Scalars['Float']>;
  name?: InputMaybe<Scalars['String']>;
};


/** The root Mutation */
export type MutationCreateCommentArgs = {
  descendents: Array<InputMaybe<DescendendInput>>;
  object: Scalars['ID'];
  parent?: InputMaybe<Scalars['ID']>;
  type: CommentableModels;
};


/** The root Mutation */
export type MutationCreateContextArgs = {
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  experiment?: InputMaybe<Scalars['ID']>;
  name: Scalars['String'];
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Mutation */
export type MutationCreateDatasetArgs = {
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  name: Scalars['String'];
  parent?: InputMaybe<Scalars['ID']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Mutation */
export type MutationCreateDimensionMapArgs = {
  channel?: InputMaybe<Scalars['ID']>;
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  dim: Dimension;
  index: Scalars['Int'];
  omero: Scalars['ID'];
};


/** The root Mutation */
export type MutationCreateEraArgs = {
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  end?: InputMaybe<Scalars['DateTime']>;
  name?: InputMaybe<Scalars['String']>;
  start?: InputMaybe<Scalars['DateTime']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Mutation */
export type MutationCreateExperimentArgs = {
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  creator?: InputMaybe<Scalars['String']>;
  description?: InputMaybe<Scalars['String']>;
  name: Scalars['String'];
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Mutation */
export type MutationCreateGraphArgs = {
  columns?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  image: Scalars['ImageFile'];
  name?: InputMaybe<Scalars['String']>;
  tables?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Mutation */
export type MutationCreateInstrumentArgs = {
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  detectors?: InputMaybe<Array<InputMaybe<Scalars['GenericScalar']>>>;
  dichroics?: InputMaybe<Array<InputMaybe<Scalars['GenericScalar']>>>;
  filters?: InputMaybe<Array<InputMaybe<Scalars['GenericScalar']>>>;
  lotNumber?: InputMaybe<Scalars['String']>;
  manufacturer?: InputMaybe<Scalars['String']>;
  model?: InputMaybe<Scalars['String']>;
  name: Scalars['String'];
  objectives?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  serialNumber?: InputMaybe<Scalars['String']>;
};


/** The root Mutation */
export type MutationCreateLabelArgs = {
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  creator?: InputMaybe<Scalars['ID']>;
  instance: Scalars['Int'];
  name?: InputMaybe<Scalars['String']>;
  representation: Scalars['ID'];
};


/** The root Mutation */
export type MutationCreateMetricArgs = {
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  creator?: InputMaybe<Scalars['String']>;
  experiment?: InputMaybe<Scalars['ID']>;
  key: Scalars['String'];
  representation?: InputMaybe<Scalars['ID']>;
  sample?: InputMaybe<Scalars['ID']>;
  value: Scalars['MetricValue'];
};


/** The root Mutation */
export type MutationCreateModelArgs = {
  contexts?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  data: Scalars['ModelFile'];
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  kind: ModelKind;
  name: Scalars['String'];
};


/** The root Mutation */
export type MutationCreateObjectiveArgs = {
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  immersion?: InputMaybe<Scalars['String']>;
  magnification: Scalars['Float'];
  manufacturer?: InputMaybe<Scalars['String']>;
  na?: InputMaybe<Scalars['Float']>;
  name: Scalars['String'];
  serialNumber: Scalars['String'];
};


/** The root Mutation */
export type MutationCreatePlotArgs = {
  name: Scalars['String'];
};


/** The root Mutation */
export type MutationCreatePositionArgs = {
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  creator?: InputMaybe<Scalars['ID']>;
  name?: InputMaybe<Scalars['String']>;
  roiOrigins?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  stage: Scalars['ID'];
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  tolerance?: InputMaybe<Scalars['Float']>;
  x: Scalars['Float'];
  y: Scalars['Float'];
  z: Scalars['Float'];
};


/** The root Mutation */
export type MutationCreateRoiArgs = {
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  creator?: InputMaybe<Scalars['ID']>;
  label?: InputMaybe<Scalars['String']>;
  meta?: InputMaybe<Scalars['GenericScalar']>;
  representation: Scalars['ID'];
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  type: RoiTypeInput;
  vectors: Array<InputMaybe<InputVector>>;
};


/** The root Mutation */
export type MutationCreateRoisArgs = {
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  creator?: InputMaybe<Scalars['ID']>;
  labels?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  meta?: InputMaybe<Scalars['GenericScalar']>;
  representation: Scalars['ID'];
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  type: RoiTypeInput;
  vectorsList?: InputMaybe<Array<InputMaybe<Array<InputMaybe<InputVector>>>>>;
};


/** The root Mutation */
export type MutationCreateRelationArgs = {
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  description?: InputMaybe<Scalars['String']>;
  name: Scalars['String'];
};


/** The root Mutation */
export type MutationCreateSampleArgs = {
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  creator?: InputMaybe<Scalars['String']>;
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  meta?: InputMaybe<Scalars['GenericScalar']>;
  name?: InputMaybe<Scalars['String']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Mutation */
export type MutationCreateStageArgs = {
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  creator?: InputMaybe<Scalars['ID']>;
  instrument?: InputMaybe<Scalars['ID']>;
  name?: InputMaybe<Scalars['String']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Mutation */
export type MutationCreateTableArgs = {
  columns?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  creator?: InputMaybe<Scalars['String']>;
  experiment?: InputMaybe<Scalars['ID']>;
  name?: InputMaybe<Scalars['String']>;
  representation?: InputMaybe<Scalars['ID']>;
  sample?: InputMaybe<Scalars['ID']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Mutation */
export type MutationCreateTimepointArgs = {
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  deltaT: Scalars['Float'];
  era: Scalars['ID'];
  name?: InputMaybe<Scalars['String']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  tolerance?: InputMaybe<Scalars['Float']>;
};


/** The root Mutation */
export type MutationCreateViewArgs = {
  view: ViewInput;
};


/** The root Mutation */
export type MutationCreatefeatureArgs = {
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  creator?: InputMaybe<Scalars['ID']>;
  key?: InputMaybe<Scalars['String']>;
  label: Scalars['ID'];
  value: Scalars['FeatureValue'];
};


/** The root Mutation */
export type MutationDeleteChannelArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteContextArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteDatasetArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteDimensionMapArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteEraArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteExperimentArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteGraphArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteLinkArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteModelArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteOmeroFileArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeletePlotArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeletePositionArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteRoiArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteRepresentationArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteSampleArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteStageArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteTableArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteTimepointArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteViewArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationFreeRepresentationArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationFromDfArgs = {
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  creator?: InputMaybe<Scalars['String']>;
  df: Scalars['ParquetInput'];
  experiment?: InputMaybe<Scalars['ID']>;
  name?: InputMaybe<Scalars['String']>;
  repOrigins?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  sample?: InputMaybe<Scalars['ID']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Mutation */
export type MutationFromXArrayArgs = {
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  creator?: InputMaybe<Scalars['String']>;
  datasets?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  fileOrigins?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  meta?: InputMaybe<Scalars['GenericScalar']>;
  name?: InputMaybe<Scalars['String']>;
  omero?: InputMaybe<OmeroRepresentationInput>;
  origins?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  roiOrigins?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  sample?: InputMaybe<Scalars['ID']>;
  tableOrigins?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  variety?: InputMaybe<RepresentationVarietyInput>;
  views?: InputMaybe<Array<InputMaybe<RepresentationViewInput>>>;
  xarray: Scalars['XArrayInput'];
};


/** The root Mutation */
export type MutationLinkArgs = {
  context?: InputMaybe<Scalars['ID']>;
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  leftId: Scalars['ID'];
  leftType: LinkableModels;
  relation: Scalars['ID'];
  rightId: Scalars['ID'];
  rightType: LinkableModels;
};


/** The root Mutation */
export type MutationNegotiateArgs = {
  additionals?: InputMaybe<Scalars['GenericScalar']>;
  internal?: InputMaybe<Scalars['Boolean']>;
};


/** The root Mutation */
export type MutationPinDatasetArgs = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};


/** The root Mutation */
export type MutationPinEraArgs = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};


/** The root Mutation */
export type MutationPinExperimentArgs = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};


/** The root Mutation */
export type MutationPinPositionArgs = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};


/** The root Mutation */
export type MutationPinRoiArgs = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};


/** The root Mutation */
export type MutationPinRepresentationArgs = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};


/** The root Mutation */
export type MutationPinSampleArgs = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};


/** The root Mutation */
export type MutationPinStageArgs = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};


/** The root Mutation */
export type MutationPinTimepointArgs = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};


/** The root Mutation */
export type MutationPresignArgs = {
  file: Scalars['String'];
};


/** The root Mutation */
export type MutationPutDatasetsArgs = {
  dataset: Scalars['ID'];
  datasets: Array<InputMaybe<Scalars['ID']>>;
};


/** The root Mutation */
export type MutationPutFilesArgs = {
  dataset: Scalars['ID'];
  files: Array<InputMaybe<Scalars['ID']>>;
};


/** The root Mutation */
export type MutationPutRepresentationsArgs = {
  dataset: Scalars['ID'];
  representations: Array<InputMaybe<Scalars['ID']>>;
};


/** The root Mutation */
export type MutationPutSamplesArgs = {
  dataset: Scalars['ID'];
  samples: Array<InputMaybe<Scalars['ID']>>;
};


/** The root Mutation */
export type MutationReleaseDatasetsArgs = {
  dataset: Scalars['ID'];
  datasets: Array<InputMaybe<Scalars['ID']>>;
};


/** The root Mutation */
export type MutationReleaseFilesArgs = {
  dataset: Scalars['ID'];
  files: Array<InputMaybe<Scalars['ID']>>;
};


/** The root Mutation */
export type MutationReleaseRepresentationsArgs = {
  dataset: Scalars['ID'];
  representations: Array<InputMaybe<Scalars['ID']>>;
};


/** The root Mutation */
export type MutationReleaseSamplesArgs = {
  dataset: Scalars['ID'];
  samples: Array<InputMaybe<Scalars['ID']>>;
};


/** The root Mutation */
export type MutationRemovePositionArgs = {
  omero: Scalars['ID'];
  position: Scalars['ID'];
};


/** The root Mutation */
export type MutationRemoveTimepointArgs = {
  omero: Scalars['ID'];
  timepoint: Scalars['ID'];
};


/** The root Mutation */
export type MutationReplyToArgs = {
  descendents: Array<InputMaybe<DescendendInput>>;
  parent: Scalars['ID'];
};


/** The root Mutation */
export type MutationResolveCommentArgs = {
  id: Scalars['ID'];
  imitate?: InputMaybe<Scalars['ID']>;
};


/** The root Mutation */
export type MutationUnassociateFilesArgs = {
  experiment: Scalars['ID'];
  files: Array<InputMaybe<Scalars['ID']>>;
};


/** The root Mutation */
export type MutationUnassociateSamplesArgs = {
  experiment: Scalars['ID'];
  samples: Array<InputMaybe<Scalars['ID']>>;
};


/** The root Mutation */
export type MutationUpdateDatasetArgs = {
  id: Scalars['ID'];
  name: Scalars['String'];
  parent?: InputMaybe<Scalars['ID']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Mutation */
export type MutationUpdateExperimentArgs = {
  creator?: InputMaybe<Scalars['String']>;
  description?: InputMaybe<Scalars['String']>;
  id: Scalars['ID'];
  name: Scalars['String'];
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Mutation */
export type MutationUpdateOmeroFileArgs = {
  id: Scalars['ID'];
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Mutation */
export type MutationUpdatePlotArgs = {
  id: Scalars['ID'];
  name?: InputMaybe<Scalars['String']>;
  query?: InputMaybe<Scalars['String']>;
};


/** The root Mutation */
export type MutationUpdateRepresentationArgs = {
  origins?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  position?: InputMaybe<Scalars['ID']>;
  rep: Scalars['ID'];
  sample?: InputMaybe<Scalars['ID']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  variety?: InputMaybe<RepresentationVarietyInput>;
};


/** The root Mutation */
export type MutationUpdateSampleArgs = {
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  id: Scalars['ID'];
  meta?: InputMaybe<Scalars['GenericScalar']>;
  name?: InputMaybe<Scalars['String']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Mutation */
export type MutationUpdateStageArgs = {
  id: Scalars['ID'];
  name: Scalars['String'];
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Mutation */
export type MutationUpdateTableArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationUploadBigFileArgs = {
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  datasets?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  file: Scalars['BigFile'];
};


/** The root Mutation */
export type MutationUploadOmeroFileArgs = {
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  datasets?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  file: Scalars['ImageFile'];
  name?: InputMaybe<Scalars['String']>;
};


/** The root Mutation */
export type MutationUploadThumbnailArgs = {
  blurhash?: InputMaybe<Scalars['String']>;
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  file: Scalars['ImageFile'];
  majorColor?: InputMaybe<Scalars['String']>;
  rep: Scalars['ID'];
};


/** The root Mutation */
export type MutationUploadVideoArgs = {
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  file: Scalars['BigFile'];
  frontImage?: InputMaybe<Scalars['BigFile']>;
  representations: Array<InputMaybe<Scalars['ID']>>;
};

/** A node in the comment tree */
export type Node = {
  children?: Maybe<Array<Maybe<Descendent>>>;
  untypedChildren?: Maybe<Scalars['GenericScalar']>;
};

/** Objective(id, created_by, created_through, created_while, serial_number, name, magnification, na, immersion) */
export type Objective = {
  __typename?: 'Objective';
  comments?: Maybe<Array<Maybe<Comment>>>;
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  immersion?: Maybe<Scalars['String']>;
  instruments: Array<Instrument>;
  magnification?: Maybe<Scalars['Float']>;
  na?: Maybe<Scalars['Float']>;
  name: Scalars['String'];
  /** Associated images through Omero */
  omeros?: Maybe<Array<Maybe<Omero>>>;
  serialNumber: Scalars['String'];
  views: Array<View>;
};


/** Objective(id, created_by, created_through, created_while, serial_number, name, magnification, na, immersion) */
export type ObjectiveOmerosArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  timepoints?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
};

/**
 * Settings of the objective used to acquire the image
 *
 * Follows the OME model for objective settings
 */
export type ObjectiveSettings = {
  __typename?: 'ObjectiveSettings';
  /** The correction collar of the objective */
  correctionCollar?: Maybe<Scalars['Float']>;
  /** The medium of the objective */
  medium?: Maybe<Medium>;
  /** The numerical aperture of the objective */
  numericalAperture?: Maybe<Scalars['Float']>;
  /** The working distance of the objective */
  workingDistance?: Maybe<Scalars['Float']>;
};

/**
 * Settings of the objective used to acquire the image
 *
 * Follows the OME model for objective settings
 */
export type ObjectiveSettingsInput = {
  /** The correction collar of the objective */
  correctionCollar?: InputMaybe<Scalars['Float']>;
  /** The medium of the objective */
  medium?: InputMaybe<Medium>;
  /** The numerical aperture of the objective */
  numericalAperture?: InputMaybe<Scalars['Float']>;
  /** The working distance of the objective */
  workingDistance?: InputMaybe<Scalars['Float']>;
};

/**
 * Omero is a through model that stores the real world context of an image
 *
 *     This means that it stores the position (corresponding to the relative displacement to
 *     a stage (Both are models)), objective and other meta data of the image.
 *
 *
 */
export type Omero = {
  __typename?: 'Omero';
  acquisitionDate?: Maybe<Scalars['DateTime']>;
  affineTransformation?: Maybe<Scalars['AffineMatrix']>;
  cameras: Array<Camera>;
  channels?: Maybe<Array<Maybe<OmeroChannel>>>;
  comments?: Maybe<Array<Maybe<Comment>>>;
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  /** Associated maps of dimensions */
  dimensionMaps?: Maybe<Array<Maybe<DimensionMap>>>;
  id: Scalars['ID'];
  imagingEnvironment?: Maybe<ImagingEnvironment>;
  instrument?: Maybe<Instrument>;
  objective?: Maybe<Objective>;
  objectiveSettings?: Maybe<ObjectiveSettings>;
  physicalSize?: Maybe<PhysicalSize>;
  planes?: Maybe<Array<Maybe<Plane>>>;
  positions: Array<Position>;
  representation: Representation;
  scale?: Maybe<Array<Maybe<Scalars['Float']>>>;
  /** Associated Timepoints */
  timepoints?: Maybe<Array<Maybe<Timepoint>>>;
  /** Associated views */
  views?: Maybe<Array<Maybe<View>>>;
};


/**
 * Omero is a through model that stores the real world context of an image
 *
 *     This means that it stores the position (corresponding to the relative displacement to
 *     a stage (Both are models)), objective and other meta data of the image.
 *
 *
 */
export type OmeroDimensionMapsArgs = {
  dims?: InputMaybe<Array<InputMaybe<Dimension>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  index?: InputMaybe<Scalars['Float']>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
};


/**
 * Omero is a through model that stores the real world context of an image
 *
 *     This means that it stores the position (corresponding to the relative displacement to
 *     a stage (Both are models)), objective and other meta data of the image.
 *
 *
 */
export type OmeroTimepointsArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  deltaT?: InputMaybe<Scalars['Float']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
};


/**
 * Omero is a through model that stores the real world context of an image
 *
 *     This means that it stores the position (corresponding to the relative displacement to
 *     a stage (Both are models)), objective and other meta data of the image.
 *
 *
 */
export type OmeroViewsArgs = {
  activeForC?: InputMaybe<Scalars['Float']>;
  activeForT?: InputMaybe<Scalars['Float']>;
  activeForX?: InputMaybe<Scalars['Float']>;
  activeForY?: InputMaybe<Scalars['Float']>;
  activeForZ?: InputMaybe<Scalars['Float']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  isGlobal?: InputMaybe<Scalars['Boolean']>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  omero?: InputMaybe<Scalars['ID']>;
  representation?: InputMaybe<Scalars['ID']>;
  z?: InputMaybe<Scalars['String']>;
};

/**
 * A channel in an image
 *
 * Channels can be highly variable in their properties. This class is a
 * representation of the most common properties of a channel.
 */
export type OmeroChannel = {
  __typename?: 'OmeroChannel';
  /** The acquisition mode of the channel */
  acquisitionMode?: Maybe<Scalars['String']>;
  /** The default color for the channel (might be ommited by the rendered) */
  color?: Maybe<Scalars['String']>;
  /** The emmission wavelength of the fluorophore in nm */
  emmissionWavelength?: Maybe<Scalars['Float']>;
  /** The excitation wavelength of the fluorophore in nm */
  excitationWavelength?: Maybe<Scalars['Float']>;
  /** The name of the channel */
  name?: Maybe<Scalars['String']>;
};

export type OmeroFile = {
  __typename?: 'OmeroFile';
  /** The time the file was created */
  createdAt: Scalars['DateTime'];
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  /** The user that created/uploaded the file */
  creator?: Maybe<User>;
  datasets: Array<Dataset>;
  derivedRepresentations: Array<Representation>;
  /** The experiment this file belongs to */
  experiments: Array<Experiment>;
  /**  the associaed file */
  file?: Maybe<Scalars['File']>;
  id: Scalars['ID'];
  /** The name of the file */
  name: Scalars['String'];
  /** Tags for the file */
  tags?: Maybe<Array<Maybe<Scalars['String']>>>;
  /** Url of a thumbnail */
  thumbnail?: Maybe<Scalars['String']>;
  /** The type of the file */
  type: OmeroFileType;
};

/** An enumeration. */
export enum OmeroFileType {
  /** Zeiss Microscopy File */
  Czi = 'CZI',
  /** Jpeg */
  Jpeg = 'JPEG',
  /** MSR File */
  Msr = 'MSR',
  /** Tiff */
  Tiff = 'TIFF',
  /** Unwknon File Format */
  Unknown = 'UNKNOWN'
}

/**
 * The Omero Meta Data of an Image
 *
 * Follows closely the omexml model. With a few alterations:
 * - The data model of the datasets and experimenters is
 * part of the mikro datamodel and are not accessed here.
 * - Some parameters are ommited as they are not really used
 */
export type OmeroRepresentationInput = {
  acquisitionDate?: InputMaybe<Scalars['DateTime']>;
  affineTransformation?: InputMaybe<Scalars['AffineMatrix']>;
  cameras?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  channels?: InputMaybe<Array<InputMaybe<ChannelInput>>>;
  imagingEnvironment?: InputMaybe<ImagingEnvironmentInput>;
  instrument?: InputMaybe<Scalars['ID']>;
  maps?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  objective?: InputMaybe<Scalars['ID']>;
  objectiveSettings?: InputMaybe<ObjectiveSettingsInput>;
  physicalSize?: InputMaybe<PhysicalSizeInput>;
  planes?: InputMaybe<Array<InputMaybe<PlaneInput>>>;
  positions?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  scale?: InputMaybe<Array<InputMaybe<Scalars['Float']>>>;
  timepoints?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
};

export enum PandasDType {
  Bool = 'BOOL',
  Category = 'CATEGORY',
  Datetime = 'DATETIME',
  Datetime64 = 'DATETIME64',
  Datetime64Ns = 'DATETIME64NS',
  Datetime64Nsutc = 'DATETIME64NSUTC',
  Datetime64Nsz = 'DATETIME64NSZ',
  Datetime64Nszutc = 'DATETIME64NSZUTC',
  Datetime64Tz = 'DATETIME64TZ',
  Datetime65 = 'DATETIME65',
  Datetimetz = 'DATETIMETZ',
  Datetimez = 'DATETIMEZ',
  Float64 = 'FLOAT64',
  Int64 = 'INT64',
  Object = 'OBJECT',
  Timedelta = 'TIMEDELTA',
  Unicode = 'UNICODE'
}

/** A paragraph in the comment tree. This paragraph contains other nodes (list nodes) */
export type ParagraphDescendent = Descendent & Node & {
  __typename?: 'ParagraphDescendent';
  children?: Maybe<Array<Maybe<Descendent>>>;
  /** The size of the paragraph */
  size?: Maybe<Scalars['String']>;
  typename?: Maybe<Scalars['String']>;
  untypedChildren?: Maybe<Scalars['GenericScalar']>;
};

/**
 * A Permission object
 *
 * This object represents a permission in the system. Permissions are
 * used to control access to different parts of the system. Permissions
 * are assigned to groups and users. A user has access to a part of the
 * system if the user is a member of a group that has the permission
 * assigned to it.
 */
export type Permission = {
  __typename?: 'Permission';
  codename: Scalars['String'];
  groupSet: Array<Group>;
  id: Scalars['ID'];
  name: Scalars['String'];
  /** Unique ID for this permission */
  unique: Scalars['String'];
  /** Specific permissions for this user. */
  userSet: Array<User>;
};

export type PermissionsOfReturn = {
  __typename?: 'PermissionsOfReturn';
  available?: Maybe<Array<Maybe<Permission>>>;
  groupAssignments?: Maybe<Array<Maybe<GroupAssignment>>>;
  userAssignments?: Maybe<Array<Maybe<UserAssignment>>>;
};

/**
 * Physical size of the image
 *
 * Each dimensions of the image has a physical size. This is the size of the
 * pixel in the image. The physical size is given in micrometers on a PIXEL
 * basis. This means that the physical size of the image is the size of the
 * pixel in the image * the number of pixels in the image. For example, if
 * the image is 1000x1000 pixels and the physical size of the image is 3 (x params) x 3 (y params),
 * micrometer, the physical size of the image is 3000x3000 micrometer. If the image
 *
 * The t dimension is given in ms, since the time is given in ms.
 * The C dimension is given in nm, since the wavelength is given in nm.
 */
export type PhysicalSize = {
  __typename?: 'PhysicalSize';
  /** Physical size of *one* Pixel in the c dimension (in µm) */
  c?: Maybe<Scalars['Float']>;
  /** Physical size of *one* Pixel in the t dimension (in ms) */
  t?: Maybe<Scalars['Float']>;
  /** Physical size of *one* Pixel in the x dimension (in µm) */
  x?: Maybe<Scalars['Float']>;
  /** Physical size of *one* Pixel in the t dimension (in µm) */
  y?: Maybe<Scalars['Float']>;
  /** Physical size of *one* Pixel in the z dimension (in µm) */
  z?: Maybe<Scalars['Float']>;
};

/**
 * Physical size of the image
 *
 * Each dimensions of the image has a physical size. This is the size of the
 * pixel in the image. The physical size is given in micrometers on a PIXEL
 * basis. This means that the physical size of the image is the size of the
 * pixel in the image * the number of pixels in the image. For example, if
 * the image is 1000x1000 pixels and the physical size of the image is 3 (x params) x 3 (y params),
 * micrometer, the physical size of the image is 3000x3000 micrometer. If the image
 *
 * The t dimension is given in ms, since the time is given in ms.
 * The C dimension is given in nm, since the wavelength is given in nm.
 */
export type PhysicalSizeInput = {
  /** Physical size of *one* Pixel in the c dimension (in nm) */
  c?: InputMaybe<Scalars['Float']>;
  /** Physical size of *one* Pixel in the t dimension (in ms) */
  t?: InputMaybe<Scalars['Float']>;
  /** Physical size of *one* Pixel in the x dimension (in µm) */
  x?: InputMaybe<Scalars['Float']>;
  /** Physical size of *one* Pixel in the t dimension (in µm) */
  y?: InputMaybe<Scalars['Float']>;
  /** Physical size of *one* Pixel in the z dimension (in µm) */
  z?: InputMaybe<Scalars['Float']>;
};

/**
 * A plane in an image
 *
 * Plane follows the convention of the OME model, where the first index is the
 * Z axis, the second is the Y axis, the third is the X axis, the fourth is the
 * C axis, and the fifth is the T axis.
 *
 * It attached the image at the indicated index to the image and gives information
 * about the plane (e.g. exposure time, delta t to the origin, etc.)
 */
export type Plane = {
  __typename?: 'Plane';
  /** C index of the plane */
  c?: Maybe<Scalars['Int']>;
  /** The Delta T to the origin of the image acqusition */
  deltaT?: Maybe<Scalars['Float']>;
  /** The exposure time of the plane (e.g. Laser exposure) */
  exposureTime?: Maybe<Scalars['Float']>;
  /** The planes X position on the stage of the microscope */
  positionX?: Maybe<Scalars['Float']>;
  /** The planes Y position on the stage of the microscope */
  positionY?: Maybe<Scalars['Float']>;
  /** The planes Z position on the stage of the microscope */
  positionZ?: Maybe<Scalars['Float']>;
  /** Z index of the plane */
  t?: Maybe<Scalars['Int']>;
  /** X index of the plane */
  x?: Maybe<Scalars['Int']>;
  /** Y index of the plane */
  y?: Maybe<Scalars['Int']>;
  /** Z index of the plane */
  z?: Maybe<Scalars['Int']>;
};

/**
 * " A plane in an image
 *
 * Plane follows the convention of the OME model, where the first index is the
 * Z axis, the second is the Y axis, the third is the X axis, the fourth is the
 * C axis, and the fifth is the T axis.
 *
 * It attached the image at the indicated index to the image and gives information
 * about the plane (e.g. exposure time, delta t to the origin, etc.)
 */
export type PlaneInput = {
  /** C index of the plane */
  c?: InputMaybe<Scalars['Int']>;
  /** The Delta T to the origin of the image acqusition */
  deltaT?: InputMaybe<Scalars['Float']>;
  /** The exposure time of the plane (e.g. Laser exposure) */
  exposureTime?: InputMaybe<Scalars['Float']>;
  /** The planes X position on the stage of the microscope */
  positionX?: InputMaybe<Scalars['Float']>;
  /** The planes Y position on the stage of the microscope */
  positionY?: InputMaybe<Scalars['Float']>;
  /** The planes Z position on the stage of the microscope */
  positionZ?: InputMaybe<Scalars['Float']>;
  /** Z index of the plane */
  t?: InputMaybe<Scalars['Int']>;
  /** X index of the plane */
  x?: InputMaybe<Scalars['Int']>;
  /** Y index of the plane */
  y?: InputMaybe<Scalars['Int']>;
  /** Z index of the plane */
  z?: InputMaybe<Scalars['Int']>;
};

/**
 * A plot is a template to generate a graph
 *
 * Its store a PlotQL query and a list of variables that can be used in the
 * query. The variables are stored as a JSON object. The variables are
 * validated against the query before the query is executed.
 *
 * This query then returns a graph that can be rendered in the frontend.
 */
export type Plot = {
  __typename?: 'Plot';
  /** When was this plot created */
  createdAt: Scalars['DateTime'];
  /** The user who created this plot */
  creator: User;
  /** A description of the plot */
  description: Scalars['String'];
  id: Scalars['ID'];
  /** The name of the plot */
  name: Scalars['String'];
  /** The PlotQL query (see documentation for PlotQL) */
  query: Scalars['String'];
  /** When was this plot last updated */
  updatedAt: Scalars['DateTime'];
};

/** The relative position of a sample on a microscope stage */
export type Position = {
  __typename?: 'Position';
  comments?: Maybe<Array<Maybe<Comment>>>;
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  /** The name of the possition */
  name: Scalars['String'];
  /** Associated images through Omero */
  omeros?: Maybe<Array<Maybe<Omero>>>;
  /** Is the table pinned by the active user */
  pinned?: Maybe<Scalars['Boolean']>;
  /** The users that have pinned the position */
  pinnedBy: Array<User>;
  roiOrigins: Array<Roi>;
  stage: Stage;
  /** A comma-separated list of tags. */
  tags?: Maybe<Array<Maybe<Scalars['String']>>>;
  views: Array<View>;
  /** pixelSize for x in microns */
  x: Scalars['Float'];
  /** pixelSize for y in microns */
  y: Scalars['Float'];
  /** pixelSize for z in microns */
  z: Scalars['Float'];
};


/** The relative position of a sample on a microscope stage */
export type PositionOmerosArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  timepoints?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
};

export type Presigned = {
  __typename?: 'Presigned';
  bucket: Scalars['String'];
  fields: PresignedFields;
};

export type PresignedFields = {
  __typename?: 'PresignedFields';
  key: Scalars['String'];
  policy: Scalars['String'];
  xAmzAlgorithm: Scalars['String'];
  xAmzCredential: Scalars['String'];
  xAmzDate: Scalars['String'];
  xAmzSignature: Scalars['String'];
};

export type ProvenanceResult = Context | Experiment | Roi | Representation | Sample | Stage | Table;

/** The root Query */
export type Query = {
  __typename?: 'Query';
  accessiblerepresentations?: Maybe<Array<Maybe<Representation>>>;
  /**
   * Get a single instrumes by ID
   *
   *     Returns a single instrument by ID. If the user does not have access
   *     to the instrument, an error will be raised.
   */
  camera?: Maybe<Camera>;
  /**
   * All Instruments
   *
   *     This query returns all Instruments that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Instruments that the user has access to. If the user is an amdin
   *     or superuser, all Instruments will be returned.
   */
  cameras?: Maybe<Array<Maybe<Camera>>>;
  /**
   * Get a single experiment by ID"
   *
   *     Returns a single experiment by ID. If the user does not have access
   *     to the experiment, an error will be raised.
   *
   *
   */
  channel?: Maybe<Channel>;
  /**
   * All Experiments
   *
   *     This query returns all Experiments that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Experiments that the user has access to. If the user is an amdin
   *     or superuser, all Experiments will be returned.
   *
   *     If you want to retrieve only the Experiments that you have created,
   *     use the `myExperiments` query.
   *
   *
   */
  channels?: Maybe<Array<Maybe<Channel>>>;
  columnsof?: Maybe<Array<Maybe<Column>>>;
  comment?: Maybe<Comment>;
  /**
   * Comments for a specific object
   *
   *     This query returns all comments for a specific object. The object is
   *     specified by the `model` and `id` arguments. The `model` argument is
   *     a string that is the name of the model. The `id` argument is the id of
   *     the object.
   *
   *     You can only query for comments for objects that you have access to.
   *
   *
   */
  commentsfor?: Maybe<Array<Maybe<Comment>>>;
  /**
   * Get a single experiment by ID"
   *
   *     Returns a single experiment by ID. If the user does not have access
   *     to the experiment, an error will be raised.
   *
   *
   */
  context?: Maybe<Context>;
  /**
   * All Experiments
   *
   *     This query returns all Experiments that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Experiments that the user has access to. If the user is an amdin
   *     or superuser, all Experiments will be returned.
   *
   *     If you want to retrieve only the Experiments that you have created,
   *     use the `myExperiments` query.
   *
   *
   */
  contexts?: Maybe<Array<Maybe<Context>>>;
  /**
   * Get a single experiment by ID"
   *
   *     Returns a single experiment by ID. If the user does not have access
   *     to the experiment, an error will be raised.
   *
   *
   */
  dataset?: Maybe<Dataset>;
  /**
   * All Experiments
   *  ![Image](/static/img/data.png)
   *  This query returns all Experiments that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Experiments that the user has access to. If the user is an amdin
   *     or superuser, all Experiments will be returned.
   *  If you want to retrieve only the Experiments that you have created,
   *     use the `myExperiments` query.
   *
   *
   *
   */
  datasets?: Maybe<Array<Maybe<Dataset>>>;
  /**
   * Get a single experiment by ID"
   *
   *     Returns a single experiment by ID. If the user does not have access
   *     to the experiment, an error will be raised.
   *
   *
   */
  dimensionmap?: Maybe<DimensionMap>;
  /**
   * All Experiments
   *
   *     This query returns all Experiments that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Experiments that the user has access to. If the user is an amdin
   *     or superuser, all Experiments will be returned.
   *
   *     If you want to retrieve only the Experiments that you have created,
   *     use the `myExperiments` query.
   *
   *
   */
  dimensionmaps?: Maybe<Array<Maybe<DimensionMap>>>;
  /**
   * Get a single experiment by ID"
   *
   *     Returns a single experiment by ID. If the user does not have access
   *     to the experiment, an error will be raised.
   *
   *
   */
  era?: Maybe<Era>;
  /**
   * All Experiments
   *
   *     This query returns all Experiments that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Experiments that the user has access to. If the user is an amdin
   *     or superuser, all Experiments will be returned.
   *
   *     If you want to retrieve only the Experiments that you have created,
   *     use the `myExperiments` query.
   *
   *
   */
  eras?: Maybe<Array<Maybe<Era>>>;
  /**
   * Get a single experiment by ID"
   *
   *     Returns a single experiment by ID. If the user does not have access
   *     to the experiment, an error will be raised.
   *
   *
   */
  experiment?: Maybe<Experiment>;
  /**
   * All Experiments
   *  ![Image](/static/img/data.png)
   *  This query returns all Experiments that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Experiments that the user has access to. If the user is an amdin
   *     or superuser, all Experiments will be returned.
   *  If you want to retrieve only the Experiments that you have created,
   *     use the `myExperiments` query.
   *
   *
   *
   */
  experiments?: Maybe<Array<Maybe<Experiment>>>;
  /**
   * Get a single feature by ID
   *
   *     Returns a single feature by ID. If the user does not have access
   *     to the feature, an error will be raised.
   *
   */
  feature?: Maybe<Feature>;
  /**
   * All features
   *
   *     This query returns all features that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all features that the user has access to. If the user is an amdin
   *     or superuser, all features will be returned.
   *
   */
  features?: Maybe<Array<Maybe<Feature>>>;
  /** Get a single representation by ID */
  graph?: Maybe<Graph>;
  /** My samples return all of the users samples attached to the current user */
  graphs?: Maybe<Array<Maybe<Graph>>>;
  hello?: Maybe<Scalars['String']>;
  /**
   * Get a single Image by ID
   *
   *     Returns a single Representation by ID. If the user does not have access
   *     to the Representation, an error will be raised.
   *
   */
  image?: Maybe<Representation>;
  /**
   * Get a single instrumes by ID
   *
   *     Returns a single instrument by ID. If the user does not have access
   *     to the instrument, an error will be raised.
   */
  instrument?: Maybe<Instrument>;
  /**
   * All Instruments
   *
   *     This query returns all Instruments that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Instruments that the user has access to. If the user is an amdin
   *     or superuser, all Instruments will be returned.
   */
  instruments?: Maybe<Array<Maybe<Instrument>>>;
  /**
   * Get a single label by ID
   *
   *     Returns a single label by ID. If the user does not have access
   *     to the label, an error will be raised.
   */
  label?: Maybe<Label>;
  /**
   * Get a label for a specific instance on a specific representation
   *
   *
   */
  labelFor?: Maybe<Label>;
  /**
   * All Labels
   *
   *     This query returns all Labels that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Labels that the user has access to. If the user is an amdin
   *     or superuser, all Labels will be returned.
   *
   */
  labels?: Maybe<Array<Maybe<Label>>>;
  /**
   * Get a single experiment by ID"
   *
   *     Returns a single experiment by ID. If the user does not have access
   *     to the experiment, an error will be raised.
   *
   *
   */
  link?: Maybe<DataLink>;
  /**
   * All Experiments
   *
   *     This query returns all Experiments that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Experiments that the user has access to. If the user is an amdin
   *     or superuser, all Experiments will be returned.
   *
   *     If you want to retrieve only the Experiments that you have created,
   *     use the `myExperiments` query.
   *
   *
   */
  links?: Maybe<Array<Maybe<DataLink>>>;
  /**
   * Get a single experiment by ID"
   *
   *     Returns a single experiment by ID. If the user does not have access
   *     to the experiment, an error will be raised.
   *
   *
   */
  meta?: Maybe<Omero>;
  /**
   * All Experiments
   *
   *     This query returns all Experiments that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Experiments that the user has access to. If the user is an amdin
   *     or superuser, all Experiments will be returned.
   *
   *     If you want to retrieve only the Experiments that you have created,
   *     use the `myExperiments` query.
   *
   *
   */
  metas?: Maybe<Array<Maybe<Omero>>>;
  /**
   * Get a single Metric by ID
   *
   *     Returns a single Metric by ID. If the user does not have access
   *     to the Metric, an error will be raised.
   *
   */
  metric?: Maybe<Metric>;
  /**
   * All Metric
   *
   *     This query returns all Metric that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Metric that the user has access to. If the user is an amdin
   *     or superuser, all Metric will be returned.
   *
   */
  metrics?: Maybe<Array<Maybe<Metric>>>;
  /**
   * Get a single label by ID
   *
   *     Returns a single label by ID. If the user does not have access
   *     to the label, an error will be raised.
   */
  model?: Maybe<Model>;
  /**
   * All Labels
   *
   *     This query returns all Labels that are stored on the platform
   *     depending on the user's permissions.s Generally, this query will return
   *     all Labels that the user has access to. If the user is an amdin
   *     or superuser, all Labels wsill be returned.
   *
   */
  models?: Maybe<Array<Maybe<Model>>>;
  /**
   * My Experiments runs a fast query on the database to return all
   *     Experiments that the user has created. This query is faster than
   *     the `experiments` query, but it does not return all Experiments that
   *     the user has access to.
   */
  mycontexts?: Maybe<Array<Maybe<Context>>>;
  /**
   * My Experiments runs a fast query on the database to return all
   *     Experiments that the user has created. This query is faster than
   *     the `experiments` query, but it does not return all Experiments that
   *     the user has access to.
   */
  mydatasets?: Maybe<Array<Maybe<Dataset>>>;
  /**
   * My Experiments runs a fast query on the database to return all
   *     Experiments that the user has created. This query is faster than
   *     the `experiments` query, but it does not return all Experiments that
   *     the user has access to.
   */
  myeras?: Maybe<Array<Maybe<Era>>>;
  /**
   * My Experiments runs a fast query on the database to return all
   *     Experiments that the user has created. This query is faster than
   *     the `experiments` query, but it does not return all Experiments that
   *     the user has access to.
   */
  myexperiments?: Maybe<Array<Maybe<Experiment>>>;
  /** My samples return all of the users samples attached to the current user */
  mygraphs?: Maybe<Array<Maybe<Graph>>>;
  mymentions?: Maybe<Array<Maybe<Comment>>>;
  /**
   * My Experiments runs a fast query on the database to return all
   *     Experiments that the user has created. This query is faster than
   *     the `experiments` query, but it does not return all Experiments that
   *     the user has access to.
   */
  mymetas?: Maybe<Array<Maybe<Omero>>>;
  /**
   * My Experiments runs a fast query on the database to return all
   *     Experiments that the user has created. This query is faster than
   *     the `experiments` query, but it does not return all Experiments that
   *     the user has access to.
   */
  mymodels?: Maybe<Array<Maybe<Model>>>;
  /**
   * My Omerofiles runs a fast query on the database to return all
   *     Omerofile that the user has created. This query is faster than
   *     the `omerofiles` query, but it does not return all OmeroFile that
   *     the user has access to.
   */
  myomerofiles?: Maybe<Array<Maybe<OmeroFile>>>;
  myplots?: Maybe<Array<Maybe<Plot>>>;
  /**
   * My Representatoin runs a fast query on the database to return all
   *     Representation that the user has created. This query is faster than
   *     the `representations` query, but it does not return all Representation that
   *     the user has access to.
   */
  myrepresentations?: Maybe<Array<Maybe<Representation>>>;
  /**
   * My Samples runs a fast query on the database to return all
   *     Samples that the user has *created*. This query is faster than
   *     the `samples` query, but it does not return all Samples that
   *     the user has access to.
   */
  mysamples?: Maybe<Array<Maybe<Sample>>>;
  /**
   * My Experiments runs a fast query on the database to return all
   *     Experiments that the user has created. This query is faster than
   *     the `experiments` query, but it does not return all Experiments that
   *     the user has access to.
   */
  mystages?: Maybe<Array<Maybe<Stage>>>;
  /** My samples return all of the users samples attached to the current user */
  mytables?: Maybe<Array<Maybe<Table>>>;
  /**
   * My Experiments runs a fast query on the database to return all
   *     Experiments that the user has created. This query is faster than
   *     the `experiments` query, but it does not return all Experiments that
   *     the user has access to.
   */
  mytimepoints?: Maybe<Array<Maybe<Timepoint>>>;
  /**
   * Get a single instrumes by ID
   *
   *     Returns a single instrument by ID. If the user does not have access
   *     to the instrument, an error will be raised.
   */
  objective?: Maybe<Objective>;
  /**
   * All Instruments
   *
   *     This query returns all Instruments that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Instruments that the user has access to. If the user is an amdin
   *     or superuser, all Instruments will be returned.
   */
  objectives?: Maybe<Array<Maybe<Objective>>>;
  /**
   * Get a single Omero File by ID
   *
   *     Returns a single Omero File by ID. If the user does not have access
   *     to the Omero File, an error will be raised.
   */
  omerofile?: Maybe<OmeroFile>;
  /**
   * All OmeroFiles
   *
   *     This query returns all OmeroFiles that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all OmeroFiles that the user has access to. If the user is an amdin
   *     or superuser, all OmeroFiles will be returned.
   *
   *
   */
  omerofiles?: Maybe<Array<Maybe<OmeroFile>>>;
  permissionsFor?: Maybe<Array<Maybe<Permission>>>;
  permissionsOf?: Maybe<PermissionsOfReturn>;
  plot?: Maybe<Plot>;
  /**
   * Get a single experiment by ID"
   *
   *     Returns a single experiment by ID. If the user does not have access
   *     to the experiment, an error will be raised.
   *
   *
   */
  position?: Maybe<Position>;
  /**
   * All Experiments
   *
   *     This query returns all Experiments that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Experiments that the user has access to. If the user is an amdin
   *     or superuser, all Experiments will be returned.
   *
   *     If you want to retrieve only the Experiments that you have created,
   *     use the `myExperiments` query.
   *
   *
   */
  positions?: Maybe<Array<Maybe<Position>>>;
  /**
   * All Experiments
   *
   *     This query returns all Experiments that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Experiments that the user has access to. If the user is an amdin
   *     or superuser, all Experiments will be returned.
   *
   *     If you want to retrieve only the Experiments that you have created,
   *     use the `myExperiments` query.
   *
   *
   */
  provenance?: Maybe<Array<Maybe<ProvenanceResult>>>;
  /**
   * Get a random Representation
   *
   *     Gets a random Representation from the database. This is used for
   *     testing purposes
   *
   *
   */
  randomRepresentation?: Maybe<Representation>;
  /**
   * Get a single experiment by ID"
   *
   *     Returns a single experiment by ID. If the user does not have access
   *     to the experiment, an error will be raised.
   *
   *
   */
  relation?: Maybe<Relation>;
  /**
   * All Experiments
   *
   *     This query returns all Experiments that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Experiments that the user has access to. If the user is an amdin
   *     or superuser, all Experiments will be returned.
   *
   *     If you want to retrieve only the Experiments that you have created,
   *     use the `myExperiments` query.
   *
   *
   */
  relations?: Maybe<Array<Maybe<Relation>>>;
  /**
   * Get a single Representation by ID
   *
   *     Returns a single Representation by ID. If the user does not have access
   *     to the Representation, an error will be raised.
   *
   */
  representation?: Maybe<Representation>;
  /**
   * All Representations
   *
   *     This query returns all Representations that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Representations that the user has access to. If the user is an amdin
   *     or superuser, all Representations will be returned.
   */
  representations?: Maybe<Array<Maybe<Representation>>>;
  representationsForGroup?: Maybe<Array<Maybe<Representation>>>;
  representationsForUser?: Maybe<Array<Maybe<Representation>>>;
  /**
   * Requets a new set of credentials from the S3 server
   *     encompassing the users credentials and the access key and secret key
   */
  request?: Maybe<Credentials>;
  /**
   * Get a single Roi by ID"
   *
   *     Returns a single Roi by ID. If the user does not have access
   *     to the Roi, an error will be raised.
   */
  roi?: Maybe<Roi>;
  /**
   * All Rois
   *
   *     This query returns all Rois that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Rois that the user has access to. If the user is an amdin
   *     or superuser, all Rois will be returned.
   */
  rois?: Maybe<Array<Maybe<Roi>>>;
  /**
   * Get a Sample by ID
   *
   *     Returns a single Sample by ID. If the user does not have access
   *     to the Sample, an error will be raised.
   *
   */
  sample?: Maybe<Sample>;
  /**
   * All Samples
   *
   *     This query returns all Samples that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Samples that the user has access to. If the user is an amdin
   *     or superuser, all Samples will be returned.
   *
   *
   */
  samples?: Maybe<Array<Maybe<Sample>>>;
  sharedrepresentations?: Maybe<Array<Maybe<Representation>>>;
  /**
   * Get a single experiment by ID"
   *
   *     Returns a single experiment by ID. If the user does not have access
   *     to the experiment, an error will be raised.
   *
   *
   */
  stage?: Maybe<Stage>;
  /**
   * All Experiments
   *
   *     This query returns all Experiments that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Experiments that the user has access to. If the user is an amdin
   *     or superuser, all Experiments will be returned.
   *
   *     If you want to retrieve only the Experiments that you have created,
   *     use the `myExperiments` query.
   *
   *
   */
  stages?: Maybe<Array<Maybe<Stage>>>;
  /** Get a single representation by ID */
  table?: Maybe<Table>;
  /** My samples return all of the users samples attached to the current user */
  tables?: Maybe<Array<Maybe<Table>>>;
  /**
   * All Tags
   *
   *     Returns all Tags that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Tags that the user has access to. If the user is an amdin
   *     or superuser, all Tags will be returned.
   *
   */
  tags?: Maybe<Array<Maybe<Tag>>>;
  /**
   * Get a single Thumbnail by ID
   *
   *     Get a single Thumbnail by ID. If the user does not have access
   *     to the Thumbnail, an error will be raised.
   *
   */
  thumbnail?: Maybe<Thumbnail>;
  /**
   * All Thumbnails
   *
   *     This query returns all Thumbnails that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Thumbnails that the user has access to. If the user is an amdin
   *     or superuser, all Thumbnails will be returned.
   *
   *
   */
  thumbnails?: Maybe<Array<Maybe<Thumbnail>>>;
  /**
   * Get a single experiment by ID"
   *
   *     Returns a single experiment by ID. If the user does not have access
   *     to the experiment, an error will be raised.
   *
   *
   */
  timepoint?: Maybe<Timepoint>;
  /**
   * All Experiments
   *
   *     This query returns all Experiments that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Experiments that the user has access to. If the user is an amdin
   *     or superuser, all Experiments will be returned.
   *
   *     If you want to retrieve only the Experiments that you have created,
   *     use the `myExperiments` query.
   *
   *
   */
  timepoints?: Maybe<Array<Maybe<Timepoint>>>;
  /** Get a list of users */
  user?: Maybe<User>;
  /** Get a list of users */
  users?: Maybe<Array<Maybe<User>>>;
  /**
   * Get a single Thumbnail by ID
   *
   *     Get a single Thumbnail by ID. If the user does not have access
   *     to the Thumbnail, an error will be raised.
   *
   */
  video?: Maybe<Video>;
  /**
   * All Thumbnails
   *
   *     This query returns all Thumbnails that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Thumbnails that the user has access to. If the user is an amdin
   *     or superuser, all Thumbnails will be returned.
   *
   *
   */
  videos?: Maybe<Array<Maybe<Video>>>;
  /**
   * Get a single experiment by ID"
   *
   *     Returns a single experiment by ID. If the user does not have access
   *     to the experiment, an error will be raised.
   *
   *
   */
  view?: Maybe<View>;
  /**
   * All Experiments
   *
   *     This query returns all Experiments that are stored on the platform
   *     depending on the user's permissions. Generally, this query will return
   *     all Experiments that the user has access to. If the user is an amdin
   *     or superuser, all Experiments will be returned.
   *
   *     If you want to retrieve only the Experiments that you have created,
   *     use the `myExperiments` query.
   *
   *
   */
  views?: Maybe<Array<Maybe<View>>>;
  void?: Maybe<Scalars['String']>;
};


/** The root Query */
export type QueryCameraArgs = {
  id?: InputMaybe<Scalars['ID']>;
  name?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryCamerasArgs = {
  app?: InputMaybe<Scalars['String']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  search?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryChannelArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryChannelsArgs = {
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
};


/** The root Query */
export type QueryColumnsofArgs = {
  dtype?: InputMaybe<Array<InputMaybe<PandasDType>>>;
  search?: InputMaybe<Scalars['String']>;
  table: Scalars['ID'];
  values?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
};


/** The root Query */
export type QueryCommentArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryCommentsforArgs = {
  deep?: InputMaybe<Scalars['Boolean']>;
  id?: InputMaybe<Scalars['ID']>;
  model: CommentableModels;
};


/** The root Query */
export type QueryContextArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryContextsArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['ID']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Query */
export type QueryDatasetArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryDatasetsArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
};


/** The root Query */
export type QueryDimensionmapArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryDimensionmapsArgs = {
  dims?: InputMaybe<Array<InputMaybe<Dimension>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  index?: InputMaybe<Scalars['Float']>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
};


/** The root Query */
export type QueryEraArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryErasArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
};


/** The root Query */
export type QueryExperimentArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryExperimentsArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['ID']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Query */
export type QueryFeatureArgs = {
  id?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryFeaturesArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['Float']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  keys?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  label?: InputMaybe<Scalars['ID']>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  substring?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryGraphArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryGraphsArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  creator?: InputMaybe<Scalars['ID']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Query */
export type QueryImageArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryInstrumentArgs = {
  id?: InputMaybe<Scalars['ID']>;
  name?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryInstrumentsArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
};


/** The root Query */
export type QueryLabelArgs = {
  id?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryLabelForArgs = {
  instance: Scalars['Int'];
  representation: Scalars['ID'];
};


/** The root Query */
export type QueryLabelsArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['Float']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  representation?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryLinkArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryLinksArgs = {
  context?: InputMaybe<Scalars['ID']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['ID']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  relation?: InputMaybe<Scalars['String']>;
  xType?: InputMaybe<LinkableModels>;
  yType?: InputMaybe<LinkableModels>;
};


/** The root Query */
export type QueryMetaArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryMetasArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  timepoints?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
};


/** The root Query */
export type QueryMetricArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryMetricsArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['ID']>;
  experiment?: InputMaybe<Scalars['ID']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  keys?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  representation?: InputMaybe<Scalars['ID']>;
  sample?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryModelArgs = {
  id?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryModelsArgs = {
  app?: InputMaybe<Scalars['String']>;
  contexts?: InputMaybe<Scalars['ID']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['Float']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
};


/** The root Query */
export type QueryMycontextsArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['ID']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Query */
export type QueryMydatasetsArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
};


/** The root Query */
export type QueryMyerasArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
};


/** The root Query */
export type QueryMyexperimentsArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['ID']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Query */
export type QueryMygraphsArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  creator?: InputMaybe<Scalars['ID']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Query */
export type QueryMymetasArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  timepoints?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
};


/** The root Query */
export type QueryMymodelsArgs = {
  app?: InputMaybe<Scalars['String']>;
  contexts?: InputMaybe<Scalars['ID']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['Float']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
};


/** The root Query */
export type QueryMyomerofilesArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
};


/** The root Query */
export type QueryMyplotsArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
};


/** The root Query */
export type QueryMyrepresentationsArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['ID']>;
  datasets?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  derivedTags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  forceThumbnail?: InputMaybe<Scalars['Boolean']>;
  hasMetric?: InputMaybe<Scalars['String']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  isRoiDerived?: InputMaybe<Scalars['Boolean']>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  noChildren?: InputMaybe<Scalars['Boolean']>;
  noParents?: InputMaybe<Scalars['Boolean']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ordering?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  samples?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  stages?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  variety?: InputMaybe<RepresentationVarietyInput>;
};


/** The root Query */
export type QueryMysamplesArgs = {
  app?: InputMaybe<Scalars['String']>;
  bioseries?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['ID']>;
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  representations?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Query */
export type QueryMystagesArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
};


/** The root Query */
export type QueryMytablesArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  creator?: InputMaybe<Scalars['ID']>;
  datasets?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Query */
export type QueryMytimepointsArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  deltaT?: InputMaybe<Scalars['Float']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryObjectiveArgs = {
  id?: InputMaybe<Scalars['ID']>;
  name?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryObjectivesArgs = {
  app?: InputMaybe<Scalars['String']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  search?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryOmerofileArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryOmerofilesArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
};


/** The root Query */
export type QueryPermissionsForArgs = {
  model: SharableModels;
  name?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryPermissionsOfArgs = {
  id: Scalars['ID'];
  model: SharableModels;
};


/** The root Query */
export type QueryPlotArgs = {
  id?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryPositionArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryPositionsArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  stage?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryProvenanceArgs = {
  createdWhiles: Array<InputMaybe<Scalars['ID']>>;
};


/** The root Query */
export type QueryRelationArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryRelationsArgs = {
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
};


/** The root Query */
export type QueryRepresentationArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryRepresentationsArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['ID']>;
  datasets?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  derivedTags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  forceThumbnail?: InputMaybe<Scalars['Boolean']>;
  hasMetric?: InputMaybe<Scalars['String']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  isRoiDerived?: InputMaybe<Scalars['Boolean']>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  noChildren?: InputMaybe<Scalars['Boolean']>;
  noParents?: InputMaybe<Scalars['Boolean']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ordering?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  samples?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  stages?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  variety?: InputMaybe<RepresentationVarietyInput>;
};


/** The root Query */
export type QueryRepresentationsForGroupArgs = {
  name: Scalars['String'];
};


/** The root Query */
export type QueryRepresentationsForUserArgs = {
  email: Scalars['String'];
};


/** The root Query */
export type QueryRequestArgs = {
  id?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryRoiArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryRoisArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['ID']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  ordering?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  repname?: InputMaybe<Scalars['String']>;
  representation?: InputMaybe<Scalars['ID']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  type?: InputMaybe<Array<InputMaybe<RoiTypeInput>>>;
};


/** The root Query */
export type QuerySampleArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QuerySamplesArgs = {
  app?: InputMaybe<Scalars['String']>;
  bioseries?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['ID']>;
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  representations?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Query */
export type QueryStageArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryStagesArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
};


/** The root Query */
export type QueryTableArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryTablesArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  creator?: InputMaybe<Scalars['ID']>;
  datasets?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Query */
export type QueryTagsArgs = {
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  values?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Query */
export type QueryThumbnailArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryThumbnailsArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['ID']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Query */
export type QueryTimepointArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryTimepointsArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  deltaT?: InputMaybe<Scalars['Float']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryUserArgs = {
  id?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryUsersArgs = {
  email?: InputMaybe<Scalars['String']>;
  search?: InputMaybe<Scalars['String']>;
  username?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryVideoArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryVideosArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['ID']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Query */
export type QueryViewArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryViewsArgs = {
  activeForC?: InputMaybe<Scalars['Float']>;
  activeForT?: InputMaybe<Scalars['Float']>;
  activeForX?: InputMaybe<Scalars['Float']>;
  activeForY?: InputMaybe<Scalars['Float']>;
  activeForZ?: InputMaybe<Scalars['Float']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  isGlobal?: InputMaybe<Scalars['Boolean']>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  omero?: InputMaybe<Scalars['ID']>;
  representation?: InputMaybe<Scalars['ID']>;
  z?: InputMaybe<Scalars['String']>;
};

/**
 * A ROI is a region of interest in a representation.
 *
 *     This region is to be regarded as a view on the representation. Depending
 *     on the implementatoin (type) of the ROI, the view can be constructed
 *     differently. For example, a rectangular ROI can be constructed by cropping
 *     the representation according to its 2 vectors. while a polygonal ROI can be constructed by masking the
 *     representation with the polygon.
 *
 *     The ROI can also store a name and a description. This is used to display the ROI in the UI.
 *
 *
 */
export type Roi = {
  __typename?: 'ROI';
  /** The color of the ROI (for UI) */
  color?: Maybe<Scalars['String']>;
  comments?: Maybe<Array<Maybe<Comment>>>;
  /** The time the ROI was created */
  createdAt: Scalars['DateTime'];
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  /** The user that created the ROI */
  creator: User;
  derivedPositions: Array<Position>;
  derivedRepresentations: Array<Representation>;
  /** The dimensions of the ROI. Only valid for rectangular ROIs */
  dimensions?: Maybe<RoiDimensions>;
  id: Scalars['ID'];
  /** The label of the ROI (for UI) */
  label?: Maybe<Scalars['String']>;
  /** Is the ROI pinned by the active user */
  pinned?: Maybe<Scalars['Boolean']>;
  /** The users that pinned this ROI */
  pinnedBy: Array<User>;
  /** The Representation this ROI was original used to create (drawn on) */
  representation?: Maybe<Representation>;
  /** A comma-separated list of tags. */
  tags?: Maybe<Array<Maybe<Scalars['String']>>>;
  /** The Roi can have varying types, consult your API */
  type: RoiType;
  /** The vectors of the ROI */
  vectors?: Maybe<Array<Maybe<Vector>>>;
};

/** An enumeration. */
export enum RoiType {
  /** Ellipse */
  Ellipse = 'ELLIPSE',
  /** Frame */
  Frame = 'FRAME',
  /** Line */
  Line = 'LINE',
  /** Path */
  Path = 'PATH',
  /** Point */
  Point = 'POINT',
  /** POLYGON */
  Polygon = 'POLYGON',
  /** Rectangle */
  Rectangle = 'RECTANGLE',
  /** Slice */
  Slice = 'SLICE',
  /** Unknown */
  Unknown = 'UNKNOWN'
}

/** Relation(id, created_by, created_through, created_while, name, description) */
export type Relation = {
  __typename?: 'Relation';
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  /** The relation between the two objects */
  datalinkSet: Array<DataLink>;
  /** A verbose description of the relation */
  description?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  /** The name of the relation */
  name: Scalars['String'];
};

export type Render = Thumbnail | Video;

/**
 * A Representation is 5-dimensional representation of an image
 *
 *     Mikro stores each image as sa 5-dimensional representation. The dimensions are:
 *     - t: time
 *     - c: channel
 *     - z: z-stack
 *     - x: x-dimension
 *     - y: y-dimension
 *
 *     This ensures a unified api for all images, regardless of their original dimensions. Another main
 *     determining factor for a representation is its variety:
 *     A representation can be a raw image representating voxels (VOXEL)
 *     or a segmentation mask representing instances of a class. (MASK)
 *     It can also representate a human perception of the image (RGB) or a human perception of the mask (RGBMASK)
 *
 *     # Meta
 *
 *     Meta information is stored in the omero field which gives access to the omero-meta data. Refer to the omero documentation for more information.
 *
 *
 *     #Origins and Derivations
 *
 *     Images can be filtered, which means that a new representation is created from the other (original) representations. This new representation is then linked to the original representations. This way, we can always trace back to the original representation.
 *     Both are encapsulaed in the origins and derived fields.
 *
 *     Representations belong to *one* sample. Every transaction to our image data is still part of the original acuqistion, so also filtered images are refering back to the sample
 *     Each iamge has also a name, which is used to identify the image. The name is unique within a sample.
 *     File and Rois that are used to create images are saved in the file origins and roi origins repectively.
 *
 *
 *
 */
export type Representation = {
  __typename?: 'Representation';
  comments?: Maybe<Array<Maybe<Comment>>>;
  createdAt: Scalars['DateTime'];
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  creator?: Maybe<User>;
  datasets: Array<Dataset>;
  /** Derived Images from this Image */
  derived?: Maybe<Array<Maybe<Representation>>>;
  description?: Maybe<Scalars['String']>;
  /** The arrays dimension */
  dims?: Maybe<Array<Scalars['String']>>;
  /** The experiments this image belongs to */
  experiments: Array<Experiment>;
  fileOrigins: Array<OmeroFile>;
  /** The File Version of this Array */
  fileversion: Scalars['String'];
  /** Does this Model have attached Data? */
  hasArray: Scalars['Boolean'];
  id: Scalars['ID'];
  /** The Arkitekt identifier */
  identifier?: Maybe<Scalars['String']>;
  /** The Representation this Label instance belongs to */
  labels: Array<Label>;
  latestThumbnail?: Maybe<Thumbnail>;
  meta?: Maybe<Scalars['GenericScalar']>;
  metric?: Maybe<Metric>;
  /** Associated metrics of this Imasge */
  metrics?: Maybe<Array<Maybe<Metric>>>;
  /** Cleartext name */
  name?: Maybe<Scalars['String']>;
  omero?: Maybe<Omero>;
  origins: Array<Representation>;
  pinned?: Maybe<Scalars['Boolean']>;
  /** The users that have pinned the representation */
  pinnedBy: Array<User>;
  renders?: Maybe<Array<Maybe<Render>>>;
  /** Originating from rois */
  roiOrigins?: Maybe<Array<Maybe<Roi>>>;
  /** Associated rois */
  rois?: Maybe<Array<Maybe<Roi>>>;
  /** The Sample this representation belosngs to */
  sample?: Maybe<Sample>;
  /** The arrays shape format [c,t,z,y,x] */
  shape?: Maybe<Array<Scalars['Int']>>;
  store?: Maybe<Scalars['Store']>;
  table?: Maybe<Table>;
  tableOrigins: Array<Table>;
  /** Associated tables */
  tables?: Maybe<Array<Maybe<Table>>>;
  /** A comma-separated list of tags. */
  tags?: Maybe<Array<Maybe<Scalars['String']>>>;
  /** The rendered biomage */
  thumbnails: Array<Thumbnail>;
  /** A unique identifier for this array */
  unique: Scalars['UUID'];
  /** The Representation can have vasrying types, consult your API */
  variety: RepresentationVariety;
  /** The rendered bioimages */
  videos: Array<Video>;
  /** Associated views */
  views?: Maybe<Array<Maybe<View>>>;
};


/**
 * A Representation is 5-dimensional representation of an image
 *
 *     Mikro stores each image as sa 5-dimensional representation. The dimensions are:
 *     - t: time
 *     - c: channel
 *     - z: z-stack
 *     - x: x-dimension
 *     - y: y-dimension
 *
 *     This ensures a unified api for all images, regardless of their original dimensions. Another main
 *     determining factor for a representation is its variety:
 *     A representation can be a raw image representating voxels (VOXEL)
 *     or a segmentation mask representing instances of a class. (MASK)
 *     It can also representate a human perception of the image (RGB) or a human perception of the mask (RGBMASK)
 *
 *     # Meta
 *
 *     Meta information is stored in the omero field which gives access to the omero-meta data. Refer to the omero documentation for more information.
 *
 *
 *     #Origins and Derivations
 *
 *     Images can be filtered, which means that a new representation is created from the other (original) representations. This new representation is then linked to the original representations. This way, we can always trace back to the original representation.
 *     Both are encapsulaed in the origins and derived fields.
 *
 *     Representations belong to *one* sample. Every transaction to our image data is still part of the original acuqistion, so also filtered images are refering back to the sample
 *     Each iamge has also a name, which is used to identify the image. The name is unique within a sample.
 *     File and Rois that are used to create images are saved in the file origins and roi origins repectively.
 *
 *
 *
 */
export type RepresentationDerivedArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['ID']>;
  datasets?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  derivedTags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  flatten?: InputMaybe<Scalars['Int']>;
  forceThumbnail?: InputMaybe<Scalars['Boolean']>;
  hasMetric?: InputMaybe<Scalars['String']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  isRoiDerived?: InputMaybe<Scalars['Boolean']>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  noChildren?: InputMaybe<Scalars['Boolean']>;
  noParents?: InputMaybe<Scalars['Boolean']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ordering?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  samples?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  stages?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  variety?: InputMaybe<RepresentationVarietyInput>;
};


/**
 * A Representation is 5-dimensional representation of an image
 *
 *     Mikro stores each image as sa 5-dimensional representation. The dimensions are:
 *     - t: time
 *     - c: channel
 *     - z: z-stack
 *     - x: x-dimension
 *     - y: y-dimension
 *
 *     This ensures a unified api for all images, regardless of their original dimensions. Another main
 *     determining factor for a representation is its variety:
 *     A representation can be a raw image representating voxels (VOXEL)
 *     or a segmentation mask representing instances of a class. (MASK)
 *     It can also representate a human perception of the image (RGB) or a human perception of the mask (RGBMASK)
 *
 *     # Meta
 *
 *     Meta information is stored in the omero field which gives access to the omero-meta data. Refer to the omero documentation for more information.
 *
 *
 *     #Origins and Derivations
 *
 *     Images can be filtered, which means that a new representation is created from the other (original) representations. This new representation is then linked to the original representations. This way, we can always trace back to the original representation.
 *     Both are encapsulaed in the origins and derived fields.
 *
 *     Representations belong to *one* sample. Every transaction to our image data is still part of the original acuqistion, so also filtered images are refering back to the sample
 *     Each iamge has also a name, which is used to identify the image. The name is unique within a sample.
 *     File and Rois that are used to create images are saved in the file origins and roi origins repectively.
 *
 *
 *
 */
export type RepresentationMetricArgs = {
  key: Scalars['String'];
};


/**
 * A Representation is 5-dimensional representation of an image
 *
 *     Mikro stores each image as sa 5-dimensional representation. The dimensions are:
 *     - t: time
 *     - c: channel
 *     - z: z-stack
 *     - x: x-dimension
 *     - y: y-dimension
 *
 *     This ensures a unified api for all images, regardless of their original dimensions. Another main
 *     determining factor for a representation is its variety:
 *     A representation can be a raw image representating voxels (VOXEL)
 *     or a segmentation mask representing instances of a class. (MASK)
 *     It can also representate a human perception of the image (RGB) or a human perception of the mask (RGBMASK)
 *
 *     # Meta
 *
 *     Meta information is stored in the omero field which gives access to the omero-meta data. Refer to the omero documentation for more information.
 *
 *
 *     #Origins and Derivations
 *
 *     Images can be filtered, which means that a new representation is created from the other (original) representations. This new representation is then linked to the original representations. This way, we can always trace back to the original representation.
 *     Both are encapsulaed in the origins and derived fields.
 *
 *     Representations belong to *one* sample. Every transaction to our image data is still part of the original acuqistion, so also filtered images are refering back to the sample
 *     Each iamge has also a name, which is used to identify the image. The name is unique within a sample.
 *     File and Rois that are used to create images are saved in the file origins and roi origins repectively.
 *
 *
 *
 */
export type RepresentationMetricsArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['ID']>;
  experiment?: InputMaybe<Scalars['ID']>;
  flatten?: InputMaybe<Scalars['Int']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  keys?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  representation?: InputMaybe<Scalars['ID']>;
  sample?: InputMaybe<Scalars['ID']>;
};


/**
 * A Representation is 5-dimensional representation of an image
 *
 *     Mikro stores each image as sa 5-dimensional representation. The dimensions are:
 *     - t: time
 *     - c: channel
 *     - z: z-stack
 *     - x: x-dimension
 *     - y: y-dimension
 *
 *     This ensures a unified api for all images, regardless of their original dimensions. Another main
 *     determining factor for a representation is its variety:
 *     A representation can be a raw image representating voxels (VOXEL)
 *     or a segmentation mask representing instances of a class. (MASK)
 *     It can also representate a human perception of the image (RGB) or a human perception of the mask (RGBMASK)
 *
 *     # Meta
 *
 *     Meta information is stored in the omero field which gives access to the omero-meta data. Refer to the omero documentation for more information.
 *
 *
 *     #Origins and Derivations
 *
 *     Images can be filtered, which means that a new representation is created from the other (original) representations. This new representation is then linked to the original representations. This way, we can always trace back to the original representation.
 *     Both are encapsulaed in the origins and derived fields.
 *
 *     Representations belong to *one* sample. Every transaction to our image data is still part of the original acuqistion, so also filtered images are refering back to the sample
 *     Each iamge has also a name, which is used to identify the image. The name is unique within a sample.
 *     File and Rois that are used to create images are saved in the file origins and roi origins repectively.
 *
 *
 *
 */
export type RepresentationRoiOriginsArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['ID']>;
  flatten?: InputMaybe<Scalars['Int']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  ordering?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  recursive?: InputMaybe<Scalars['Boolean']>;
  repname?: InputMaybe<Scalars['String']>;
  representation?: InputMaybe<Scalars['ID']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  type?: InputMaybe<Array<InputMaybe<RoiTypeInput>>>;
};


/**
 * A Representation is 5-dimensional representation of an image
 *
 *     Mikro stores each image as sa 5-dimensional representation. The dimensions are:
 *     - t: time
 *     - c: channel
 *     - z: z-stack
 *     - x: x-dimension
 *     - y: y-dimension
 *
 *     This ensures a unified api for all images, regardless of their original dimensions. Another main
 *     determining factor for a representation is its variety:
 *     A representation can be a raw image representating voxels (VOXEL)
 *     or a segmentation mask representing instances of a class. (MASK)
 *     It can also representate a human perception of the image (RGB) or a human perception of the mask (RGBMASK)
 *
 *     # Meta
 *
 *     Meta information is stored in the omero field which gives access to the omero-meta data. Refer to the omero documentation for more information.
 *
 *
 *     #Origins and Derivations
 *
 *     Images can be filtered, which means that a new representation is created from the other (original) representations. This new representation is then linked to the original representations. This way, we can always trace back to the original representation.
 *     Both are encapsulaed in the origins and derived fields.
 *
 *     Representations belong to *one* sample. Every transaction to our image data is still part of the original acuqistion, so also filtered images are refering back to the sample
 *     Each iamge has also a name, which is used to identify the image. The name is unique within a sample.
 *     File and Rois that are used to create images are saved in the file origins and roi origins repectively.
 *
 *
 *
 */
export type RepresentationRoisArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['ID']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  ordering?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  repname?: InputMaybe<Scalars['String']>;
  representation?: InputMaybe<Scalars['ID']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  type?: InputMaybe<Array<InputMaybe<RoiTypeInput>>>;
};


/**
 * A Representation is 5-dimensional representation of an image
 *
 *     Mikro stores each image as sa 5-dimensional representation. The dimensions are:
 *     - t: time
 *     - c: channel
 *     - z: z-stack
 *     - x: x-dimension
 *     - y: y-dimension
 *
 *     This ensures a unified api for all images, regardless of their original dimensions. Another main
 *     determining factor for a representation is its variety:
 *     A representation can be a raw image representating voxels (VOXEL)
 *     or a segmentation mask representing instances of a class. (MASK)
 *     It can also representate a human perception of the image (RGB) or a human perception of the mask (RGBMASK)
 *
 *     # Meta
 *
 *     Meta information is stored in the omero field which gives access to the omero-meta data. Refer to the omero documentation for more information.
 *
 *
 *     #Origins and Derivations
 *
 *     Images can be filtered, which means that a new representation is created from the other (original) representations. This new representation is then linked to the original representations. This way, we can always trace back to the original representation.
 *     Both are encapsulaed in the origins and derived fields.
 *
 *     Representations belong to *one* sample. Every transaction to our image data is still part of the original acuqistion, so also filtered images are refering back to the sample
 *     Each iamge has also a name, which is used to identify the image. The name is unique within a sample.
 *     File and Rois that are used to create images are saved in the file origins and roi origins repectively.
 *
 *
 *
 */
export type RepresentationTableArgs = {
  first?: InputMaybe<Scalars['Boolean']>;
};


/**
 * A Representation is 5-dimensional representation of an image
 *
 *     Mikro stores each image as sa 5-dimensional representation. The dimensions are:
 *     - t: time
 *     - c: channel
 *     - z: z-stack
 *     - x: x-dimension
 *     - y: y-dimension
 *
 *     This ensures a unified api for all images, regardless of their original dimensions. Another main
 *     determining factor for a representation is its variety:
 *     A representation can be a raw image representating voxels (VOXEL)
 *     or a segmentation mask representing instances of a class. (MASK)
 *     It can also representate a human perception of the image (RGB) or a human perception of the mask (RGBMASK)
 *
 *     # Meta
 *
 *     Meta information is stored in the omero field which gives access to the omero-meta data. Refer to the omero documentation for more information.
 *
 *
 *     #Origins and Derivations
 *
 *     Images can be filtered, which means that a new representation is created from the other (original) representations. This new representation is then linked to the original representations. This way, we can always trace back to the original representation.
 *     Both are encapsulaed in the origins and derived fields.
 *
 *     Representations belong to *one* sample. Every transaction to our image data is still part of the original acuqistion, so also filtered images are refering back to the sample
 *     Each iamge has also a name, which is used to identify the image. The name is unique within a sample.
 *     File and Rois that are used to create images are saved in the file origins and roi origins repectively.
 *
 *
 *
 */
export type RepresentationTablesArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  creator?: InputMaybe<Scalars['ID']>;
  datasets?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/**
 * A Representation is 5-dimensional representation of an image
 *
 *     Mikro stores each image as sa 5-dimensional representation. The dimensions are:
 *     - t: time
 *     - c: channel
 *     - z: z-stack
 *     - x: x-dimension
 *     - y: y-dimension
 *
 *     This ensures a unified api for all images, regardless of their original dimensions. Another main
 *     determining factor for a representation is its variety:
 *     A representation can be a raw image representating voxels (VOXEL)
 *     or a segmentation mask representing instances of a class. (MASK)
 *     It can also representate a human perception of the image (RGB) or a human perception of the mask (RGBMASK)
 *
 *     # Meta
 *
 *     Meta information is stored in the omero field which gives access to the omero-meta data. Refer to the omero documentation for more information.
 *
 *
 *     #Origins and Derivations
 *
 *     Images can be filtered, which means that a new representation is created from the other (original) representations. This new representation is then linked to the original representations. This way, we can always trace back to the original representation.
 *     Both are encapsulaed in the origins and derived fields.
 *
 *     Representations belong to *one* sample. Every transaction to our image data is still part of the original acuqistion, so also filtered images are refering back to the sample
 *     Each iamge has also a name, which is used to identify the image. The name is unique within a sample.
 *     File and Rois that are used to create images are saved in the file origins and roi origins repectively.
 *
 *
 *
 */
export type RepresentationViewsArgs = {
  activeForC?: InputMaybe<Scalars['Float']>;
  activeForT?: InputMaybe<Scalars['Float']>;
  activeForX?: InputMaybe<Scalars['Float']>;
  activeForY?: InputMaybe<Scalars['Float']>;
  activeForZ?: InputMaybe<Scalars['Float']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  isGlobal?: InputMaybe<Scalars['Boolean']>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  omero?: InputMaybe<Scalars['ID']>;
  representation?: InputMaybe<Scalars['ID']>;
  z?: InputMaybe<Scalars['String']>;
};

export type RepresentationEvent = {
  __typename?: 'RepresentationEvent';
  create?: Maybe<Representation>;
  deleted?: Maybe<Scalars['ID']>;
  update?: Maybe<Representation>;
};

/** An enumeration. */
export enum RepresentationVariety {
  /** Mask (Value represent Labels) */
  Mask = 'MASK',
  /** RGB (First three channel represent RGB) */
  Rgb = 'RGB',
  /** Unknown */
  Unknown = 'UNKNOWN',
  /** Voxel (Value represent Intensity) */
  Voxel = 'VOXEL'
}

/** Variety expresses the Type of Representation we are dealing with */
export enum RepresentationVarietyInput {
  /** Mask (Value represent Labels) */
  Mask = 'MASK',
  /** RGB (First three channel represent RGB) */
  Rgb = 'RGB',
  /** Unknown */
  Unknown = 'UNKNOWN',
  /** Voxel (Value represent Intensity) */
  Voxel = 'VOXEL'
}

export type RepresentationViewInput = {
  /** The x coord of the position (relative to origin) */
  cMax?: InputMaybe<Scalars['Int']>;
  /** The x coord of the position (relative to origin) */
  cMin?: InputMaybe<Scalars['Int']>;
  /** The channel you want to associate with this map */
  channel?: InputMaybe<Scalars['ID']>;
  /** The assignation id */
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  /** The position you want to associate with this map */
  position?: InputMaybe<Scalars['ID']>;
  /** The x coord of the position (relative to origin) */
  tMax?: InputMaybe<Scalars['Int']>;
  /** The x coord of the position (relative to origin) */
  tMin?: InputMaybe<Scalars['Int']>;
  /** The position you want to associate with this map */
  timepoint?: InputMaybe<Scalars['ID']>;
  /** The x coord of the position (relative to origin) */
  xMax?: InputMaybe<Scalars['Int']>;
  /** The x coord of the position (relative to origin) */
  xMin?: InputMaybe<Scalars['Int']>;
  /** The x coord of the position (relative to origin) */
  yMax?: InputMaybe<Scalars['Int']>;
  /** The x coord of the position (relative to origin) */
  yMin?: InputMaybe<Scalars['Int']>;
  /** The x coord of the position (relative to origin) */
  zMax?: InputMaybe<Scalars['Int']>;
  /** The x coord of the position (relative to origin) */
  zMin?: InputMaybe<Scalars['Int']>;
};

export type RoiDimensions = {
  __typename?: 'RoiDimensions';
  /** Height of the image */
  height?: Maybe<Scalars['Float']>;
  /** The dimensions of the image */
  width?: Maybe<Scalars['Float']>;
};

export type RoiEvent = {
  __typename?: 'RoiEvent';
  create?: Maybe<Roi>;
  delete?: Maybe<Scalars['ID']>;
  update?: Maybe<Roi>;
};

/** An enumeration. */
export enum RoiTypeInput {
  /** Ellipse */
  Ellipsis = 'ELLIPSIS',
  /** Frame */
  Frame = 'FRAME',
  /** Line */
  Line = 'LINE',
  /** Path */
  Path = 'PATH',
  /** Point */
  Point = 'POINT',
  /** POLYGON */
  Polygon = 'POLYGON',
  /** Rectangle */
  Rectangle = 'RECTANGLE',
  /** Slice */
  Slice = 'SLICE',
  /** Unknown */
  Unknown = 'UNKNOWN'
}

/** Samples are storage containers for representations. A Sample is to be understood analogous to a Biological Sample. It existed in Time (the time of acquisiton and experimental procedure), was measured in space (x,y,z) and in different modalities (c). Sample therefore provide a datacontainer where each Representation of the data shares the same dimensions. Every transaction to our image data is still part of the original acuqistion, so also filtered images are refering back to the sample */
export type Sample = {
  __typename?: 'Sample';
  comments?: Maybe<Array<Maybe<Comment>>>;
  /** The time the sample was created */
  createdAt: Scalars['DateTime'];
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  /** The user that created the sample */
  creator?: Maybe<User>;
  datasets: Array<Dataset>;
  /** The experiments this sample belongs to */
  experiments: Array<Experiment>;
  id: Scalars['ID'];
  meta?: Maybe<Scalars['GenericScalar']>;
  /** The Sample this Metric belongs to */
  metrics: Array<Metric>;
  /** The name of the sample */
  name: Scalars['String'];
  pinned?: Maybe<Scalars['Boolean']>;
  /** The users that have pinned the sample */
  pinnedBy: Array<User>;
  /** Associated representations of this Sample */
  representations?: Maybe<Array<Maybe<Representation>>>;
  /** Sample this table belongs to */
  tables: Array<Table>;
  /** A comma-separated list of tags. */
  tags?: Maybe<Array<Maybe<Scalars['String']>>>;
};


/** Samples are storage containers for representations. A Sample is to be understood analogous to a Biological Sample. It existed in Time (the time of acquisiton and experimental procedure), was measured in space (x,y,z) and in different modalities (c). Sample therefore provide a datacontainer where each Representation of the data shares the same dimensions. Every transaction to our image data is still part of the original acuqistion, so also filtered images are refering back to the sample */
export type SampleRepresentationsArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['ID']>;
  datasets?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  derivedTags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  forceThumbnail?: InputMaybe<Scalars['Boolean']>;
  hasMetric?: InputMaybe<Scalars['String']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  isRoiDerived?: InputMaybe<Scalars['Boolean']>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  noChildren?: InputMaybe<Scalars['Boolean']>;
  noParents?: InputMaybe<Scalars['Boolean']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ordering?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  samples?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  stages?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  variety?: InputMaybe<RepresentationVarietyInput>;
};

export type SamplesEvent = {
  __typename?: 'SamplesEvent';
  create?: Maybe<Sample>;
  deleted?: Maybe<Scalars['ID']>;
  update?: Maybe<Sample>;
};

/** Sharable Models are models that can be shared amongst users and groups. They representent the models of the DB */
export enum SharableModels {
  BordGraph = 'BORD_GRAPH',
  BordTable = 'BORD_TABLE',
  GrunnlagAnimal = 'GRUNNLAG_ANIMAL',
  GrunnlagAntibody = 'GRUNNLAG_ANTIBODY',
  GrunnlagCamera = 'GRUNNLAG_CAMERA',
  GrunnlagChannel = 'GRUNNLAG_CHANNEL',
  GrunnlagContext = 'GRUNNLAG_CONTEXT',
  GrunnlagDatalink = 'GRUNNLAG_DATALINK',
  GrunnlagDataset = 'GRUNNLAG_DATASET',
  GrunnlagDimensionmap = 'GRUNNLAG_DIMENSIONMAP',
  GrunnlagEra = 'GRUNNLAG_ERA',
  GrunnlagExperiment = 'GRUNNLAG_EXPERIMENT',
  GrunnlagExperimentalgroup = 'GRUNNLAG_EXPERIMENTALGROUP',
  GrunnlagFeature = 'GRUNNLAG_FEATURE',
  GrunnlagInstrument = 'GRUNNLAG_INSTRUMENT',
  GrunnlagLabel = 'GRUNNLAG_LABEL',
  GrunnlagMetric = 'GRUNNLAG_METRIC',
  GrunnlagModel = 'GRUNNLAG_MODEL',
  GrunnlagObjective = 'GRUNNLAG_OBJECTIVE',
  GrunnlagOmero = 'GRUNNLAG_OMERO',
  GrunnlagOmerofile = 'GRUNNLAG_OMEROFILE',
  GrunnlagPosition = 'GRUNNLAG_POSITION',
  GrunnlagRelation = 'GRUNNLAG_RELATION',
  GrunnlagRepresentation = 'GRUNNLAG_REPRESENTATION',
  GrunnlagRoi = 'GRUNNLAG_ROI',
  GrunnlagSample = 'GRUNNLAG_SAMPLE',
  GrunnlagStage = 'GRUNNLAG_STAGE',
  GrunnlagThumbnail = 'GRUNNLAG_THUMBNAIL',
  GrunnlagTimepoint = 'GRUNNLAG_TIMEPOINT',
  GrunnlagUsermeta = 'GRUNNLAG_USERMETA',
  GrunnlagVideo = 'GRUNNLAG_VIDEO',
  GrunnlagView = 'GRUNNLAG_VIEW'
}

/**
 * An Stage is a set of positions that share a common space on a microscope and can
 *     be use to translate.
 *
 *
 *
 */
export type Stage = {
  __typename?: 'Stage';
  comments?: Maybe<Array<Maybe<Comment>>>;
  /** The time the acquistion was created */
  createdAt: Scalars['DateTime'];
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  /** The user that created the stage */
  creator?: Maybe<User>;
  datasets: Array<Dataset>;
  id: Scalars['ID'];
  instrument?: Maybe<Instrument>;
  /** The kind of acquisition */
  kind?: Maybe<AcquisitionKind>;
  /** The name of the stage */
  name: Scalars['String'];
  /** Is the table pinned by the active user */
  pinned?: Maybe<Scalars['Boolean']>;
  /** The users that have pinned the stage */
  pinnedBy: Array<User>;
  /** Derived Images from this Image */
  positions?: Maybe<Array<Maybe<Position>>>;
  /** A comma-separated list of tags. */
  tags?: Maybe<Array<Maybe<Scalars['String']>>>;
};


/**
 * An Stage is a set of positions that share a common space on a microscope and can
 *     be use to translate.
 *
 *
 *
 */
export type StagePositionsArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  stage?: InputMaybe<Scalars['ID']>;
};

/** The root Subscriptions */
export type Subscription = {
  __typename?: 'Subscription';
  myExperiments?: Maybe<ExperimentsEvent>;
  myRepresentations?: Maybe<RepresentationEvent>;
  mySamples?: Maybe<SamplesEvent>;
  myTables?: Maybe<TablesEvent>;
  /**
   * My Mentions
   *
   *     Returns an event of a new mention for the user if the user
   *     was mentioned in a comment.
   *
   */
  mymentions?: Maybe<MentionEvent>;
  rois?: Maybe<RoiEvent>;
};


/** The root Subscriptions */
export type SubscriptionMyRepresentationsArgs = {
  origin?: InputMaybe<Scalars['ID']>;
  streamChildren?: InputMaybe<Scalars['Boolean']>;
};


/** The root Subscriptions */
export type SubscriptionRoisArgs = {
  representation: Scalars['ID'];
};

/**
 *  A Table is a collection of tabular data.
 *
 *     It provides a way to store data in a tabular format and associate it with a Representation,
 *     Sample or Experiment. It is a way to store data that might be to large to store in a
 *     Feature or Metric on this Experiments. Or it might be data that is not easily represented
 *     as a Feature or Metric.
 *
 *     Tables can be easily created from a pandas DataFrame and can be converted to a pandas DataFrame.
 *     Its columns are defined by the columns of the DataFrame.
 *
 *
 *
 */
export type Table = {
  __typename?: 'Table';
  /** Columns Data */
  columns?: Maybe<Array<Maybe<Column>>>;
  comments?: Maybe<Array<Maybe<Comment>>>;
  /** When the Table was created */
  createdAt: Scalars['DateTime'];
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  /** The creator of the Table */
  creator?: Maybe<User>;
  datasets: Array<Dataset>;
  derivedRepresentations: Array<Representation>;
  /** The Experiment this Table belongs to. */
  experiment?: Maybe<Experiment>;
  graphs: Array<Graph>;
  id: Scalars['ID'];
  name: Scalars['String'];
  /** Is the table pinned by the active user */
  pinned?: Maybe<Scalars['Boolean']>;
  pinnedBy: Array<User>;
  /** List of Records */
  query?: Maybe<Array<Maybe<Scalars['GenericScalar']>>>;
  /** Images that were used to create this table */
  repOrigins?: Maybe<Array<Maybe<Representation>>>;
  /** Sample this table belongs to */
  sample?: Maybe<Sample>;
  /** The parquet store for the table */
  store?: Maybe<Scalars['Parquet']>;
  /** Tables that were used to create this table */
  tableOrigins?: Maybe<Array<Maybe<Table>>>;
  /** A comma-separated list of tags. */
  tags?: Maybe<Array<Maybe<Scalars['String']>>>;
};


/**
 *  A Table is a collection of tabular data.
 *
 *     It provides a way to store data in a tabular format and associate it with a Representation,
 *     Sample or Experiment. It is a way to store data that might be to large to store in a
 *     Feature or Metric on this Experiments. Or it might be data that is not easily represented
 *     as a Feature or Metric.
 *
 *     Tables can be easily created from a pandas DataFrame and can be converted to a pandas DataFrame.
 *     Its columns are defined by the columns of the DataFrame.
 *
 *
 *
 */
export type TableColumnsArgs = {
  filter?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/**
 *  A Table is a collection of tabular data.
 *
 *     It provides a way to store data in a tabular format and associate it with a Representation,
 *     Sample or Experiment. It is a way to store data that might be to large to store in a
 *     Feature or Metric on this Experiments. Or it might be data that is not easily represented
 *     as a Feature or Metric.
 *
 *     Tables can be easily created from a pandas DataFrame and can be converted to a pandas DataFrame.
 *     Its columns are defined by the columns of the DataFrame.
 *
 *
 *
 */
export type TableQueryArgs = {
  columns?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  query?: InputMaybe<Scalars['String']>;
};


/**
 *  A Table is a collection of tabular data.
 *
 *     It provides a way to store data in a tabular format and associate it with a Representation,
 *     Sample or Experiment. It is a way to store data that might be to large to store in a
 *     Feature or Metric on this Experiments. Or it might be data that is not easily represented
 *     as a Feature or Metric.
 *
 *     Tables can be easily created from a pandas DataFrame and can be converted to a pandas DataFrame.
 *     Its columns are defined by the columns of the DataFrame.
 *
 *
 *
 */
export type TableRepOriginsArgs = {
  app?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['ID']>;
  datasets?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  derivedTags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  flatten?: InputMaybe<Scalars['Int']>;
  forceThumbnail?: InputMaybe<Scalars['Boolean']>;
  hasMetric?: InputMaybe<Scalars['String']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  isRoiDerived?: InputMaybe<Scalars['Boolean']>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  noChildren?: InputMaybe<Scalars['Boolean']>;
  noParents?: InputMaybe<Scalars['Boolean']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ordering?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  recursive?: InputMaybe<Scalars['Boolean']>;
  samples?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  stages?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  variety?: InputMaybe<RepresentationVarietyInput>;
};


/**
 *  A Table is a collection of tabular data.
 *
 *     It provides a way to store data in a tabular format and associate it with a Representation,
 *     Sample or Experiment. It is a way to store data that might be to large to store in a
 *     Feature or Metric on this Experiments. Or it might be data that is not easily represented
 *     as a Feature or Metric.
 *
 *     Tables can be easily created from a pandas DataFrame and can be converted to a pandas DataFrame.
 *     Its columns are defined by the columns of the DataFrame.
 *
 *
 *
 */
export type TableTableOriginsArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  creator?: InputMaybe<Scalars['ID']>;
  datasets?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  flatten?: InputMaybe<Scalars['Int']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  recursive?: InputMaybe<Scalars['Boolean']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};

export type TablesEvent = {
  __typename?: 'TablesEvent';
  create?: Maybe<Table>;
  deleted?: Maybe<Scalars['ID']>;
  update?: Maybe<Table>;
};

export type Tag = {
  __typename?: 'Tag';
  id: Scalars['ID'];
  name: Scalars['String'];
  slug: Scalars['String'];
};

/**
 * A Thumbnail is a render of a representation that is used to display the representation in the UI.
 *
 *     Thumbnails can also store the major color of the representation. This is used to color the representation in the UI.
 *
 */
export type Thumbnail = {
  __typename?: 'Thumbnail';
  blurhash?: Maybe<Scalars['String']>;
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  image?: Maybe<Scalars['String']>;
  majorColor?: Maybe<Scalars['String']>;
  /** The rendered biomage */
  representation: Representation;
};

/** The relative position of a sample on a microscope stage */
export type Timepoint = {
  __typename?: 'Timepoint';
  comments?: Maybe<Array<Maybe<Comment>>>;
  /** The time the experiment was created */
  createdAt: Scalars['DateTime'];
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  deltaT?: Maybe<Scalars['Float']>;
  era: Era;
  id: Scalars['ID'];
  /** The name of the timepoint */
  name?: Maybe<Scalars['String']>;
  /** Associated images through Omero */
  omeros?: Maybe<Array<Maybe<Omero>>>;
  pinned?: Maybe<Scalars['Boolean']>;
  /** The users that have pinned the position */
  pinnedBy: Array<User>;
  /** A comma-separated list of tags. */
  tags?: Maybe<Array<Maybe<Scalars['String']>>>;
  views: Array<View>;
};


/** The relative position of a sample on a microscope stage */
export type TimepointOmerosArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  timepoints?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
};

/**
 * User
 *
 * This object represents a user in the system. Users are used to
 * control access to different parts of the system. Users are assigned
 * to groups. A user has access to a part of the system if the user is
 * a member of a group that has the permission assigned to it.
 *
 * Users can be be "creator" of objects. This means that the user has
 * created the object. This is used to control access to objects. A user
 * can only access objects that they have created, or objects that they
 * have access to through a group that they are a member of.
 *
 * See the documentation for "Object Level Permissions" for more information.
 */
export type User = {
  __typename?: 'User';
  /** The prefered color of the user */
  color: Scalars['String'];
  email: Scalars['String'];
  firstName: Scalars['String'];
  /** The groups this user belongs to. A user will get all permissions granted to each of their groups. */
  groups: Array<Group>;
  id: Scalars['ID'];
  lastName: Scalars['String'];
  /** The name of the user */
  name: Scalars['String'];
  sub?: Maybe<Scalars['String']>;
  /** Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. */
  username: Scalars['String'];
};

export type UserAssignment = {
  __typename?: 'UserAssignment';
  permissions: Array<Maybe<Scalars['String']>>;
  /** A query that returns an image path */
  user: User;
};

export type UserAssignmentInput = {
  permissions: Array<InputMaybe<Scalars['String']>>;
  /** The user id */
  user: Scalars['String'];
};

export type Vector = {
  __typename?: 'Vector';
  /** C-coordinate */
  c?: Maybe<Scalars['Float']>;
  /** T-coordinate */
  t?: Maybe<Scalars['Float']>;
  /** X-coordinate */
  x?: Maybe<Scalars['Float']>;
  /** Y-coordinate */
  y?: Maybe<Scalars['Float']>;
  /** Z-coordinate */
  z?: Maybe<Scalars['Float']>;
};

export type Video = {
  __typename?: 'Video';
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  data?: Maybe<Scalars['String']>;
  frontImage?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  /** The rendered bioimages */
  representations: Array<Representation>;
};

/** View(id, created_by, created_through, created_while, omero, z_min, z_max, x_min, x_max, y_min, y_max, t_min, t_max, c_min, c_max, channel, position, objective, instrument, timepoint) */
export type View = {
  __typename?: 'View';
  accessors?: Maybe<Array<Maybe<Scalars['String']>>>;
  c?: Maybe<Scalars['Slice']>;
  /** The index of the channel */
  cMax?: Maybe<Scalars['Int']>;
  /** The index of the channel */
  cMin?: Maybe<Scalars['Int']>;
  channel?: Maybe<Channel>;
  createdBy?: Maybe<User>;
  createdThrough?: Maybe<LokClient>;
  createdWhile?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  instrument?: Maybe<Instrument>;
  objective?: Maybe<Objective>;
  omero: Omero;
  position?: Maybe<Position>;
  t?: Maybe<Scalars['Slice']>;
  /** The index of the channel */
  tMax?: Maybe<Scalars['Int']>;
  /** The index of the channel */
  tMin?: Maybe<Scalars['Int']>;
  timepoint?: Maybe<Timepoint>;
  x?: Maybe<Scalars['Slice']>;
  /** The index of the channel */
  xMax?: Maybe<Scalars['Int']>;
  /** The index of the channel */
  xMin?: Maybe<Scalars['Int']>;
  y?: Maybe<Scalars['Slice']>;
  /** The index of the channel */
  yMax?: Maybe<Scalars['Int']>;
  /** The index of the channel */
  yMin?: Maybe<Scalars['Int']>;
  z?: Maybe<Scalars['Slice']>;
  /** The index of the channel */
  zMax?: Maybe<Scalars['Int']>;
  /** The index of the channel */
  zMin?: Maybe<Scalars['Int']>;
};

export type ViewInput = {
  /** The x coord of the position (relative to origin) */
  cMax?: InputMaybe<Scalars['Int']>;
  /** The x coord of the position (relative to origin) */
  cMin?: InputMaybe<Scalars['Int']>;
  /** The channel you want to associate with this map */
  channel?: InputMaybe<Scalars['ID']>;
  /** The assignation id */
  createdWhile?: InputMaybe<Scalars['AssignationID']>;
  /** The stage this position belongs to */
  omero: Scalars['ID'];
  /** The position you want to associate with this map */
  position?: InputMaybe<Scalars['ID']>;
  /** The x coord of the position (relative to origin) */
  tMax?: InputMaybe<Scalars['Int']>;
  /** The x coord of the position (relative to origin) */
  tMin?: InputMaybe<Scalars['Int']>;
  /** The position you want to associate with this map */
  timepoint?: InputMaybe<Scalars['ID']>;
  /** The x coord of the position (relative to origin) */
  xMax?: InputMaybe<Scalars['Int']>;
  /** The x coord of the position (relative to origin) */
  xMin?: InputMaybe<Scalars['Int']>;
  /** The x coord of the position (relative to origin) */
  yMax?: InputMaybe<Scalars['Int']>;
  /** The x coord of the position (relative to origin) */
  yMin?: InputMaybe<Scalars['Int']>;
  /** The x coord of the position (relative to origin) */
  zMax?: InputMaybe<Scalars['Int']>;
  /** The x coord of the position (relative to origin) */
  zMin?: InputMaybe<Scalars['Int']>;
};

export type ChannelFragment = { __typename?: 'Channel', name: string, id: string, emissionWavelength?: number | null, excitationWavelength?: number | null, dimensionMaps?: Array<{ __typename?: 'DimensionMap', id: string, omero: { __typename?: 'Omero', id: string } } | null> | null };

export type LeafFragment = { __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' };

type Node_MentionDescendent_Fragment = { __typename?: 'MentionDescendent', typename: 'MentionDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null };

type Node_ParagraphDescendent_Fragment = { __typename?: 'ParagraphDescendent', typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null };

export type NodeFragment = Node_MentionDescendent_Fragment | Node_ParagraphDescendent_Fragment;

export type LevelDownParagraphFragment = { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null };

export type LevelDownMentionFragment = { __typename?: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } };

type LevelDownDescendent_Leaf_Fragment = { __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' };

type LevelDownDescendent_MentionDescendent_Fragment = { __typename?: 'MentionDescendent', typename: 'MentionDescendent' };

type LevelDownDescendent_ParagraphDescendent_Fragment = { __typename?: 'ParagraphDescendent', typename: 'ParagraphDescendent' };

export type LevelDownDescendentFragment = LevelDownDescendent_Leaf_Fragment | LevelDownDescendent_MentionDescendent_Fragment | LevelDownDescendent_ParagraphDescendent_Fragment;

export type MentionFragment = { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null };

export type ParagraphFragment = { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null };

type Descendent_Leaf_Fragment = { __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' };

type Descendent_MentionDescendent_Fragment = { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null };

type Descendent_ParagraphDescendent_Fragment = { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null };

export type DescendentFragment = Descendent_Leaf_Fragment | Descendent_MentionDescendent_Fragment | Descendent_ParagraphDescendent_Fragment;

export type SubthreadCommentFragment = { __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', id: string, sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null };

export type ListCommentFragment = { __typename?: 'Comment', resolved?: any | null, id: string, createdAt: any, user: { __typename?: 'User', id: string, sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, resolvedBy?: { __typename?: 'User', sub?: string | null } | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', id: string, sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null };

export type MentionCommentFragment = { __typename?: 'Comment', id: string, createdAt: any, resolved?: any | null, objectId: number, contentType?: CommentableModels | null, user: { __typename?: 'User', id: string, sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', id: string, sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null, mentions: Array<{ __typename?: 'User', id: string, sub?: string | null }>, resolvedBy?: { __typename?: 'User', sub?: string | null } | null };

export type DetailCommentFragment = { __typename?: 'Comment', id: string, resolved?: any | null, createdAt: any, objectId: number, contentType?: CommentableModels | null, user: { __typename?: 'User', id: string, sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, resolvedBy?: { __typename?: 'User', sub?: string | null } | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', id: string, sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null, mentions: Array<{ __typename?: 'User', id: string, sub?: string | null }> };

export type DetailContextFragment = { __typename?: 'Context', id: string, name: string, createdAt: any, links: Array<{ __typename?: 'DataLink', id: string, xId: string, yId: string, leftType?: LinkableModels | null, rightType?: LinkableModels | null, relation: { __typename?: 'Relation', id: string, name: string } }>, models: Array<{ __typename?: 'Model', id: string, name: string }> };

export type ListContextFragment = { __typename?: 'Context', name: string, id: string };

export type DetailDatasetFragment = { __typename?: 'Dataset', id: string, name: string, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples: Array<{ __typename?: 'Sample', id: string, name: string }>, createdBy?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }>, omerofiles: Array<{ __typename?: 'OmeroFile', id: string, name: string, file?: any | null }>, representations?: Array<{ __typename?: 'Representation', id: string, name?: string | null } | null> | null, children: Array<{ __typename?: 'Dataset', id: string, name: string }> };

export type ListDatasetFragment = { __typename?: 'Dataset', id: string, name: string };

export type EraFragment = { __typename?: 'Era', name: string, id: string, start?: any | null, end?: any | null, tags?: Array<string | null> | null, pinned?: boolean | null, timepoints?: Array<{ __typename?: 'Timepoint', id: string, name?: string | null, deltaT?: number | null, omeros?: Array<{ __typename?: 'Omero', id: string, representation: { __typename?: 'Representation', id: string, name?: string | null } } | null> | null } | null> | null };

export type ListEraFragment = { __typename?: 'Era', id: string, name: string, start?: any | null, end?: any | null };

export type DetailExperimentFragment = { __typename?: 'Experiment', id: string, name: string, description?: string | null, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples?: Array<{ __typename?: 'Sample', id: string, name: string } | null> | null, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }>, omeroFiles: Array<{ __typename?: 'OmeroFile', id: string, name: string }> };

export type ListExperimentFragment = { __typename?: 'Experiment', id: string, name: string, description?: string | null };

export type ListGraphFragment = { __typename?: 'Graph', id: string, name: string, image?: string | null, usedColumns?: any | null, tables: Array<{ __typename?: 'Table', id: string, name: string }> };

export type DetailGraphFragment = { __typename?: 'Graph', id: string, name: string, image?: string | null, usedColumns?: any | null, tables: Array<{ __typename?: 'Table', id: string, name: string }> };

export type InstrumentFragment = { __typename?: 'Instrument', id: string, name: string, omeros?: Array<{ __typename?: 'Omero', acquisitionDate?: any | null, representation: { __typename?: 'Representation', id: string, shape?: Array<number> | null, name?: string | null } } | null> | null };

export type ListInstrumentFragment = { __typename?: 'Instrument', id: string, name: string };

export type DetailLinkFragment = { __typename?: 'DataLink', id: string, xId: string, yId: string, leftType?: LinkableModels | null, rightType?: LinkableModels | null, context?: { __typename?: 'Context', name: string, id: string } | null, relation: { __typename?: 'Relation', id: string, name: string } };

export type ListLinkFragment = { __typename?: 'DataLink', id: string, xId: string, yId: string, leftType?: LinkableModels | null, rightType?: LinkableModels | null, relation: { __typename?: 'Relation', id: string, name: string } };

export type DetailModelFragment = { __typename?: 'Model', id: string, name: string, data?: any | null, kind?: ModelKind | null, contexts: Array<{ __typename?: 'Context', id: string, name: string }> };

export type ListModelFragment = { __typename?: 'Model', id: string, name: string, data?: any | null, kind?: ModelKind | null, contexts: Array<{ __typename?: 'Context', id: string, name: string }> };

export type ObjectiveFragment = { __typename?: 'Objective', id: string, name: string, magnification?: number | null, omeros?: Array<{ __typename?: 'Omero', acquisitionDate?: any | null, representation: { __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } } | null> | null };

export type ListObjectiveFragment = { __typename?: 'Objective', id: string, name: string, magnification?: number | null };

export type OmeroFragment = { __typename?: 'Omero', id: string, acquisitionDate?: any | null, affineTransformation?: any | null, scale?: Array<number | null> | null, physicalSize?: { __typename?: 'PhysicalSize', x?: number | null, y?: number | null, z?: number | null, t?: number | null } | null, planes?: Array<{ __typename?: 'Plane', z?: number | null, t?: number | null, exposureTime?: number | null, deltaT?: number | null } | null> | null, channels?: Array<{ __typename?: 'OmeroChannel', name?: string | null, emmissionWavelength?: number | null, excitationWavelength?: number | null, color?: string | null } | null> | null, objectiveSettings?: { __typename?: 'ObjectiveSettings', correctionCollar?: number | null, medium?: Medium | null } | null, positions: Array<{ __typename?: 'Position', id: string, x: number, y: number, z: number, stage: { __typename?: 'Stage', id: string, name: string } }>, views?: Array<{ __typename?: 'View', id: string, xMin?: number | null, xMax?: number | null, yMin?: number | null, yMax?: number | null, zMin?: number | null, zMax?: number | null, tMin?: number | null, tMax?: number | null, cMin?: number | null, cMax?: number | null, channel?: { __typename?: 'Channel', id: string, name: string, color?: string | null } | null, position?: { __typename?: 'Position', id: string, name: string, x: number } | null } | null> | null, dimensionMaps?: Array<{ __typename?: 'DimensionMap', id: string, index: number, dimension: string, channel: { __typename?: 'Channel', id: string, name: string, color?: string | null, emissionWavelength?: number | null, excitationWavelength?: number | null } } | null> | null, instrument?: { __typename?: 'Instrument', id: string, name: string, model?: string | null } | null, objective?: { __typename?: 'Objective', id: string, name: string, magnification?: number | null } | null, timepoints?: Array<{ __typename?: 'Timepoint', id: string, deltaT?: number | null, era: { __typename?: 'Era', id: string, name: string } } | null> | null, imagingEnvironment?: { __typename?: 'ImagingEnvironment', airPressure?: number | null, co2Percent?: number | null, humidity?: number | null, temperature?: number | null } | null };

export type DetailOmeroFragment = { __typename?: 'Omero', id: string, acquisitionDate?: any | null, affineTransformation?: any | null, scale?: Array<number | null> | null, representation: { __typename?: 'Representation', id: string, name?: string | null }, physicalSize?: { __typename?: 'PhysicalSize', x?: number | null, y?: number | null, z?: number | null, t?: number | null } | null, planes?: Array<{ __typename?: 'Plane', z?: number | null, t?: number | null, exposureTime?: number | null, deltaT?: number | null } | null> | null, channels?: Array<{ __typename?: 'OmeroChannel', name?: string | null, emmissionWavelength?: number | null, excitationWavelength?: number | null, color?: string | null } | null> | null, objectiveSettings?: { __typename?: 'ObjectiveSettings', correctionCollar?: number | null, medium?: Medium | null } | null, positions: Array<{ __typename?: 'Position', id: string, x: number, y: number, z: number, stage: { __typename?: 'Stage', id: string, name: string } }>, timepoints?: Array<{ __typename?: 'Timepoint', id: string, name?: string | null, deltaT?: number | null } | null> | null, views?: Array<{ __typename?: 'View', id: string, xMin?: number | null, xMax?: number | null, yMin?: number | null, yMax?: number | null, zMin?: number | null, zMax?: number | null, tMin?: number | null, tMax?: number | null, cMin?: number | null, cMax?: number | null, channel?: { __typename?: 'Channel', id: string, name: string, color?: string | null } | null, position?: { __typename?: 'Position', id: string, name: string, x: number, y: number, z: number } | null, timepoint?: { __typename?: 'Timepoint', id: string, name?: string | null, deltaT?: number | null } | null } | null> | null, dimensionMaps?: Array<{ __typename?: 'DimensionMap', id: string, index: number, dimension: string, channel: { __typename?: 'Channel', id: string, name: string, color?: string | null, emissionWavelength?: number | null, excitationWavelength?: number | null } } | null> | null, instrument?: { __typename?: 'Instrument', id: string, name: string, model?: string | null } | null, objective?: { __typename?: 'Objective', id: string, name: string, magnification?: number | null } | null, imagingEnvironment?: { __typename?: 'ImagingEnvironment', airPressure?: number | null, co2Percent?: number | null, humidity?: number | null, temperature?: number | null } | null };

export type DetailOmeroFileFragment = { __typename?: 'OmeroFile', id: string, name: string, type: OmeroFileType, createdAt: any, file?: any | null, tags?: Array<string | null> | null, createdWhile?: string | null, derivedRepresentations: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null }>, experiments: Array<{ __typename?: 'Experiment', id: string, name: string, description?: string | null }> };

export type ListOmeroFileFragment = { __typename?: 'OmeroFile', id: string, name: string, type: OmeroFileType, createdAt: any, file?: any | null };

export type UserAssignmentFragment = { __typename?: 'UserAssignment', permissions: Array<string | null>, user: { __typename?: 'User', sub?: string | null, username: string, email: string } };

export type GroupAssignmentFragment = { __typename?: 'GroupAssignment', permissions: Array<string | null>, group: { __typename?: 'Group', name: string } };

export type PlotFragment = { __typename?: 'Plot', id: string, query: string, name: string, description: string, createdAt: any, updatedAt: any, creator: { __typename?: 'User', username: string } };

export type ListPlotFragment = { __typename?: 'Plot', id: string, name: string, creator: { __typename?: 'User', username: string } };

export type PositionFragment = { __typename?: 'Position', id: string, name: string, x: number, y: number, z: number, stage: { __typename?: 'Stage', id: string, kind?: AcquisitionKind | null, name: string, createdAt: any, pinned?: boolean | null, tags?: Array<string | null> | null, instrument?: { __typename?: 'Instrument', id: string, name: string } | null, creator?: { __typename?: 'User', id: string, sub?: string | null } | null }, omeros?: Array<{ __typename?: 'Omero', acquisitionDate?: any | null, representation: { __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } } | null> | null, roiOrigins: Array<{ __typename?: 'ROI', id: string, type: RoiType, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, label?: string | null, createdWhile?: string | null, creator: { __typename?: 'User', id: string, sub?: string | null }, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null, t?: number | null, c?: number | null } | null> | null }> };

export type ListPositionFragment = { __typename?: 'Position', id: string, x: number, y: number, z: number, name: string, omeros?: Array<{ __typename?: 'Omero', acquisitionDate?: any | null, physicalSize?: { __typename?: 'PhysicalSize', x?: number | null, y?: number | null, z?: number | null } | null, representation: { __typename?: 'Representation', id: string, shape?: Array<number> | null } } | null> | null };

export type DetailRelationFragment = { __typename?: 'Relation', name: string, description?: string | null, id: string };

export type ListRelationFragment = { __typename?: 'Relation', name: string, description?: string | null, id: string };

export type ListRepresentationFragment = { __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null };

export type ListSharedRepresentationFragment = { __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null, creator?: { __typename?: 'User', email: string } | null };

export type CanvasRepresentationFragment = { __typename?: 'Representation', id: string, shape?: Array<number> | null, store?: any | null, name?: string | null, variety: RepresentationVariety, rois?: Array<{ __typename?: 'ROI', id: string, type: RoiType, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, label?: string | null, createdWhile?: string | null, creator: { __typename?: 'User', id: string, sub?: string | null }, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null, t?: number | null, c?: number | null } | null> | null } | null> | null, omero?: { __typename?: 'Omero', id: string, acquisitionDate?: any | null, affineTransformation?: any | null, scale?: Array<number | null> | null, physicalSize?: { __typename?: 'PhysicalSize', x?: number | null, y?: number | null, z?: number | null, t?: number | null } | null, planes?: Array<{ __typename?: 'Plane', z?: number | null, t?: number | null, exposureTime?: number | null, deltaT?: number | null } | null> | null, channels?: Array<{ __typename?: 'OmeroChannel', name?: string | null, emmissionWavelength?: number | null, excitationWavelength?: number | null, color?: string | null } | null> | null, objectiveSettings?: { __typename?: 'ObjectiveSettings', correctionCollar?: number | null, medium?: Medium | null } | null, positions: Array<{ __typename?: 'Position', id: string, x: number, y: number, z: number, stage: { __typename?: 'Stage', id: string, name: string } }>, views?: Array<{ __typename?: 'View', id: string, xMin?: number | null, xMax?: number | null, yMin?: number | null, yMax?: number | null, zMin?: number | null, zMax?: number | null, tMin?: number | null, tMax?: number | null, cMin?: number | null, cMax?: number | null, channel?: { __typename?: 'Channel', id: string, name: string, color?: string | null } | null, position?: { __typename?: 'Position', id: string, name: string, x: number } | null } | null> | null, dimensionMaps?: Array<{ __typename?: 'DimensionMap', id: string, index: number, dimension: string, channel: { __typename?: 'Channel', id: string, name: string, color?: string | null, emissionWavelength?: number | null, excitationWavelength?: number | null } } | null> | null, instrument?: { __typename?: 'Instrument', id: string, name: string, model?: string | null } | null, objective?: { __typename?: 'Objective', id: string, name: string, magnification?: number | null } | null, timepoints?: Array<{ __typename?: 'Timepoint', id: string, deltaT?: number | null, era: { __typename?: 'Era', id: string, name: string } } | null> | null, imagingEnvironment?: { __typename?: 'ImagingEnvironment', airPressure?: number | null, co2Percent?: number | null, humidity?: number | null, temperature?: number | null } | null } | null };

export type DetailRepresentationFragment = { __typename?: 'Representation', id: string, name?: string | null, shape?: Array<number> | null, dims?: Array<string> | null, tags?: Array<string | null> | null, store?: any | null, createdAt: any, variety: RepresentationVariety, createdWhile?: string | null, pinned?: boolean | null, renders?: Array<{ __typename?: 'Thumbnail', id: string, image?: string | null, blurhash?: string | null, representation: { __typename?: 'Representation', id: string, name?: string | null } } | { __typename?: 'Video', id: string, data?: string | null, frontImage?: string | null } | null> | null, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, datasets: Array<{ __typename?: 'Dataset', id: string, name: string }>, sample?: { __typename?: 'Sample', id: string, name: string } | null, metrics?: Array<{ __typename?: 'Metric', id: string, key: string, value?: any | null, comments?: Array<{ __typename?: 'Comment', user: { __typename?: 'User', sub?: string | null } } | null> | null } | null> | null, omero?: { __typename?: 'Omero', id: string, acquisitionDate?: any | null, affineTransformation?: any | null, scale?: Array<number | null> | null, physicalSize?: { __typename?: 'PhysicalSize', x?: number | null, y?: number | null, z?: number | null, t?: number | null } | null, planes?: Array<{ __typename?: 'Plane', z?: number | null, t?: number | null, exposureTime?: number | null, deltaT?: number | null } | null> | null, channels?: Array<{ __typename?: 'OmeroChannel', name?: string | null, emmissionWavelength?: number | null, excitationWavelength?: number | null, color?: string | null } | null> | null, objectiveSettings?: { __typename?: 'ObjectiveSettings', correctionCollar?: number | null, medium?: Medium | null } | null, positions: Array<{ __typename?: 'Position', id: string, x: number, y: number, z: number, stage: { __typename?: 'Stage', id: string, name: string } }>, views?: Array<{ __typename?: 'View', id: string, xMin?: number | null, xMax?: number | null, yMin?: number | null, yMax?: number | null, zMin?: number | null, zMax?: number | null, tMin?: number | null, tMax?: number | null, cMin?: number | null, cMax?: number | null, channel?: { __typename?: 'Channel', id: string, name: string, color?: string | null } | null, position?: { __typename?: 'Position', id: string, name: string, x: number } | null } | null> | null, dimensionMaps?: Array<{ __typename?: 'DimensionMap', id: string, index: number, dimension: string, channel: { __typename?: 'Channel', id: string, name: string, color?: string | null, emissionWavelength?: number | null, excitationWavelength?: number | null } } | null> | null, instrument?: { __typename?: 'Instrument', id: string, name: string, model?: string | null } | null, objective?: { __typename?: 'Objective', id: string, name: string, magnification?: number | null } | null, timepoints?: Array<{ __typename?: 'Timepoint', id: string, deltaT?: number | null, era: { __typename?: 'Era', id: string, name: string } } | null> | null, imagingEnvironment?: { __typename?: 'ImagingEnvironment', airPressure?: number | null, co2Percent?: number | null, humidity?: number | null, temperature?: number | null } | null } | null, origins: Array<{ __typename?: 'Representation', id: string, name?: string | null, tags?: Array<string | null> | null, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, blurhash?: string | null } | null }>, derived?: Array<{ __typename?: 'Representation', id: string, name?: string | null, tags?: Array<string | null> | null, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, blurhash?: string | null } | null } | null> | null, tables?: Array<{ __typename?: 'Table', id: string, name: string } | null> | null, fileOrigins: Array<{ __typename?: 'OmeroFile', id: string, name: string, type: OmeroFileType }>, tableOrigins: Array<{ __typename?: 'Table', id: string, name: string }>, roiOrigins?: Array<{ __typename?: 'ROI', id: string, label?: string | null, type: RoiType } | null> | null, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }>, rois?: Array<{ __typename?: 'ROI', id: string, type: RoiType, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, label?: string | null, createdWhile?: string | null, creator: { __typename?: 'User', id: string, sub?: string | null }, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null, t?: number | null, c?: number | null } | null> | null } | null> | null };

export type RepRoiFragment = { __typename?: 'ROI', id: string, type: RoiType, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, label?: string | null, createdWhile?: string | null, creator: { __typename?: 'User', id: string, sub?: string | null }, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null, t?: number | null, c?: number | null } | null> | null };

export type DetailRoiFragment = { __typename?: 'ROI', id: string, type: RoiType, label?: string | null, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, createdWhile?: string | null, creator: { __typename?: 'User', id: string }, representation?: { __typename?: 'Representation', id: string, shape?: Array<number> | null, store?: any | null, name?: string | null, variety: RepresentationVariety, rois?: Array<{ __typename?: 'ROI', id: string, type: RoiType, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, label?: string | null, createdWhile?: string | null, creator: { __typename?: 'User', id: string, sub?: string | null }, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null, t?: number | null, c?: number | null } | null> | null } | null> | null, omero?: { __typename?: 'Omero', id: string, acquisitionDate?: any | null, affineTransformation?: any | null, scale?: Array<number | null> | null, physicalSize?: { __typename?: 'PhysicalSize', x?: number | null, y?: number | null, z?: number | null, t?: number | null } | null, planes?: Array<{ __typename?: 'Plane', z?: number | null, t?: number | null, exposureTime?: number | null, deltaT?: number | null } | null> | null, channels?: Array<{ __typename?: 'OmeroChannel', name?: string | null, emmissionWavelength?: number | null, excitationWavelength?: number | null, color?: string | null } | null> | null, objectiveSettings?: { __typename?: 'ObjectiveSettings', correctionCollar?: number | null, medium?: Medium | null } | null, positions: Array<{ __typename?: 'Position', id: string, x: number, y: number, z: number, stage: { __typename?: 'Stage', id: string, name: string } }>, views?: Array<{ __typename?: 'View', id: string, xMin?: number | null, xMax?: number | null, yMin?: number | null, yMax?: number | null, zMin?: number | null, zMax?: number | null, tMin?: number | null, tMax?: number | null, cMin?: number | null, cMax?: number | null, channel?: { __typename?: 'Channel', id: string, name: string, color?: string | null } | null, position?: { __typename?: 'Position', id: string, name: string, x: number } | null } | null> | null, dimensionMaps?: Array<{ __typename?: 'DimensionMap', id: string, index: number, dimension: string, channel: { __typename?: 'Channel', id: string, name: string, color?: string | null, emissionWavelength?: number | null, excitationWavelength?: number | null } } | null> | null, instrument?: { __typename?: 'Instrument', id: string, name: string, model?: string | null } | null, objective?: { __typename?: 'Objective', id: string, name: string, magnification?: number | null } | null, timepoints?: Array<{ __typename?: 'Timepoint', id: string, deltaT?: number | null, era: { __typename?: 'Era', id: string, name: string } } | null> | null, imagingEnvironment?: { __typename?: 'ImagingEnvironment', airPressure?: number | null, co2Percent?: number | null, humidity?: number | null, temperature?: number | null } | null } | null } | null, derivedRepresentations: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null }>, derivedPositions: Array<{ __typename?: 'Position', id: string, x: number, y: number, z: number, name: string, omeros?: Array<{ __typename?: 'Omero', acquisitionDate?: any | null, physicalSize?: { __typename?: 'PhysicalSize', x?: number | null, y?: number | null, z?: number | null } | null, representation: { __typename?: 'Representation', id: string, shape?: Array<number> | null } } | null> | null }>, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null } | null> | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> };

export type DetailSampleFragment = { __typename?: 'Sample', name: string, id: string, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, experiments: Array<{ __typename?: 'Experiment', id: string, name: string }>, representations?: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null> | null, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> };

export type ListSampleFragment = { __typename?: 'Sample', name: string, id: string, pinned?: boolean | null, experiments: Array<{ __typename?: 'Experiment', name: string }> };

export type StageFragment = { __typename?: 'Stage', id: string, kind?: AcquisitionKind | null, name: string, createdAt: any, pinned?: boolean | null, tags?: Array<string | null> | null, instrument?: { __typename?: 'Instrument', id: string, name: string } | null, creator?: { __typename?: 'User', id: string, sub?: string | null } | null };

export type ListStageFragment = { __typename?: 'Stage', id: string, tags?: Array<string | null> | null, name: string, createdAt: any, kind?: AcquisitionKind | null, instrument?: { __typename?: 'Instrument', id: string, name: string } | null };

export type ColumnFragment = { __typename?: 'Column', name?: string | null, fieldName: string, pandasType?: PandasDType | null, numpyType?: string | null, metadata?: any | null };

export type DetailTableFragment = { __typename?: 'Table', id: string, name: string, repOrigins?: Array<{ __typename?: 'Representation', id: string, name?: string | null } | null> | null, sample?: { __typename?: 'Sample', id: string } | null, experiment?: { __typename?: 'Experiment', id: string } | null, graphs: Array<{ __typename?: 'Graph', id: string, name: string, image?: string | null, usedColumns?: any | null, tables: Array<{ __typename?: 'Table', id: string, name: string }> }> };

export type ListTableFragment = { __typename?: 'Table', id: string, name: string, columns?: Array<{ __typename?: 'Column', name?: string | null, fieldName: string, pandasType?: PandasDType | null, numpyType?: string | null, metadata?: any | null } | null> | null, repOrigins?: Array<{ __typename?: 'Representation', id: string } | null> | null, sample?: { __typename?: 'Sample', id: string } | null, experiment?: { __typename?: 'Experiment', id: string } | null };

export type ThumbnailFragment = { __typename?: 'Thumbnail', id: string, image?: string | null, blurhash?: string | null, representation: { __typename?: 'Representation', id: string, name?: string | null } };

export type ListThumbnailFragment = { __typename?: 'Thumbnail', id: string, image?: string | null, blurhash?: string | null, representation: { __typename?: 'Representation', id: string, name?: string | null } };

export type TimepointFragment = { __typename?: 'Timepoint', name?: string | null, id: string, deltaT?: number | null, era: { __typename?: 'Era', id: string, name: string }, omeros?: Array<{ __typename?: 'Omero', id: string, representation: { __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } } | null> | null, views: Array<{ __typename?: 'View', id: string, accessors?: Array<string | null> | null, omero: { __typename?: 'Omero', id: string, representation: { __typename?: 'Representation', id: string, name?: string | null, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null } | null } } }> };

export type ListTimepointFragment = { __typename?: 'Timepoint', id: string, name?: string | null, deltaT?: number | null, omeros?: Array<{ __typename?: 'Omero', id: string, representation: { __typename?: 'Representation', id: string, name?: string | null } } | null> | null };

export type VideoFragment = { __typename?: 'Video', id: string, data?: string | null, frontImage?: string | null };

export type ListVideoFragment = { __typename?: 'Video', id: string, data?: string | null, frontImage?: string | null };

export type ListViewFragment = { __typename?: 'View', id: string, accessors?: Array<string | null> | null, omero: { __typename?: 'Omero', id: string, representation: { __typename?: 'Representation', id: string, name?: string | null, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null } | null } } };

export type CreateCommentMutationVariables = Exact<{
  id: Scalars['ID'];
  model: CommentableModels;
  descendents: Array<InputMaybe<DescendendInput>>;
  parent?: InputMaybe<Scalars['ID']>;
}>;


export type CreateCommentMutation = { __typename?: 'Mutation', createComment?: { __typename?: 'Comment', resolved?: any | null, id: string, createdAt: any, user: { __typename?: 'User', id: string, sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, resolvedBy?: { __typename?: 'User', sub?: string | null } | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', id: string, sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null } | null };

export type ReplyToMutationVariables = Exact<{
  descendents: Array<InputMaybe<DescendendInput>>;
  parent: Scalars['ID'];
}>;


export type ReplyToMutation = { __typename?: 'Mutation', replyTo?: { __typename?: 'Comment', resolved?: any | null, id: string, createdAt: any, user: { __typename?: 'User', id: string, sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, resolvedBy?: { __typename?: 'User', sub?: string | null } | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', id: string, sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null } | null };

export type ResolveCommentMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type ResolveCommentMutation = { __typename?: 'Mutation', resolveComment?: { __typename?: 'Comment', resolved?: any | null, id: string, createdAt: any, user: { __typename?: 'User', id: string, sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, resolvedBy?: { __typename?: 'User', sub?: string | null } | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', id: string, sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null } | null };

export type CreateContextMutationVariables = Exact<{
  name: Scalars['String'];
}>;


export type CreateContextMutation = { __typename?: 'Mutation', createContext?: { __typename?: 'Context', id: string, name: string, createdAt: any, links: Array<{ __typename?: 'DataLink', id: string, xId: string, yId: string, leftType?: LinkableModels | null, rightType?: LinkableModels | null, relation: { __typename?: 'Relation', id: string, name: string } }>, models: Array<{ __typename?: 'Model', id: string, name: string }> } | null };

export type DeleteContextMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteContextMutation = { __typename?: 'Mutation', deleteContext?: { __typename?: 'DeleteContextResult', id?: string | null } | null };

export type CreateDatasetMutationVariables = Exact<{
  name: Scalars['String'];
}>;


export type CreateDatasetMutation = { __typename?: 'Mutation', createDataset?: { __typename?: 'Dataset', id: string, name: string, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples: Array<{ __typename?: 'Sample', id: string, name: string }>, createdBy?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }>, omerofiles: Array<{ __typename?: 'OmeroFile', id: string, name: string, file?: any | null }>, representations?: Array<{ __typename?: 'Representation', id: string, name?: string | null } | null> | null, children: Array<{ __typename?: 'Dataset', id: string, name: string }> } | null };

export type DeleteDatasetMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteDatasetMutation = { __typename?: 'Mutation', deleteDataset?: { __typename?: 'DeleteDatasetResult', id?: string | null } | null };

export type UpdateDatasetMutationVariables = Exact<{
  id: Scalars['ID'];
  parent?: InputMaybe<Scalars['ID']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  name: Scalars['String'];
}>;


export type UpdateDatasetMutation = { __typename?: 'Mutation', updateDataset?: { __typename?: 'Dataset', id: string, name: string, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples: Array<{ __typename?: 'Sample', id: string, name: string }>, createdBy?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }>, omerofiles: Array<{ __typename?: 'OmeroFile', id: string, name: string, file?: any | null }>, representations?: Array<{ __typename?: 'Representation', id: string, name?: string | null } | null> | null, children: Array<{ __typename?: 'Dataset', id: string, name: string }> } | null };

export type PinDatasetMutationVariables = Exact<{
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
}>;


export type PinDatasetMutation = { __typename?: 'Mutation', pinDataset?: { __typename?: 'Dataset', id: string, pinned?: boolean | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

export type PutSamplesMutationVariables = Exact<{
  dataset: Scalars['ID'];
  samples: Array<Scalars['ID']>;
}>;


export type PutSamplesMutation = { __typename?: 'Mutation', putSamples?: { __typename?: 'Dataset', id: string, name: string, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples: Array<{ __typename?: 'Sample', id: string, name: string }>, createdBy?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }>, omerofiles: Array<{ __typename?: 'OmeroFile', id: string, name: string, file?: any | null }>, representations?: Array<{ __typename?: 'Representation', id: string, name?: string | null } | null> | null, children: Array<{ __typename?: 'Dataset', id: string, name: string }> } | null };

export type ReleaseFilesMutationVariables = Exact<{
  dataset: Scalars['ID'];
  files: Array<Scalars['ID']>;
}>;


export type ReleaseFilesMutation = { __typename?: 'Mutation', releaseFiles?: { __typename?: 'Dataset', id: string, name: string, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples: Array<{ __typename?: 'Sample', id: string, name: string }>, createdBy?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }>, omerofiles: Array<{ __typename?: 'OmeroFile', id: string, name: string, file?: any | null }>, representations?: Array<{ __typename?: 'Representation', id: string, name?: string | null } | null> | null, children: Array<{ __typename?: 'Dataset', id: string, name: string }> } | null };

export type PutDatasetsMutationVariables = Exact<{
  dataset: Scalars['ID'];
  datasets: Array<Scalars['ID']>;
}>;


export type PutDatasetsMutation = { __typename?: 'Mutation', putDatasets?: { __typename?: 'Dataset', id: string, name: string, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples: Array<{ __typename?: 'Sample', id: string, name: string }>, createdBy?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }>, omerofiles: Array<{ __typename?: 'OmeroFile', id: string, name: string, file?: any | null }>, representations?: Array<{ __typename?: 'Representation', id: string, name?: string | null } | null> | null, children: Array<{ __typename?: 'Dataset', id: string, name: string }> } | null };

export type ReleaseDatasetsMutationVariables = Exact<{
  dataset: Scalars['ID'];
  datasets: Array<Scalars['ID']>;
}>;


export type ReleaseDatasetsMutation = { __typename?: 'Mutation', releaseDatasets?: { __typename?: 'Dataset', id: string, name: string, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples: Array<{ __typename?: 'Sample', id: string, name: string }>, createdBy?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }>, omerofiles: Array<{ __typename?: 'OmeroFile', id: string, name: string, file?: any | null }>, representations?: Array<{ __typename?: 'Representation', id: string, name?: string | null } | null> | null, children: Array<{ __typename?: 'Dataset', id: string, name: string }> } | null };

export type PutRepresentationsMutationVariables = Exact<{
  dataset: Scalars['ID'];
  representations: Array<Scalars['ID']>;
}>;


export type PutRepresentationsMutation = { __typename?: 'Mutation', putRepresentations?: { __typename?: 'Dataset', id: string, name: string, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples: Array<{ __typename?: 'Sample', id: string, name: string }>, createdBy?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }>, omerofiles: Array<{ __typename?: 'OmeroFile', id: string, name: string, file?: any | null }>, representations?: Array<{ __typename?: 'Representation', id: string, name?: string | null } | null> | null, children: Array<{ __typename?: 'Dataset', id: string, name: string }> } | null };

export type ReleaseRepresentationsMutationVariables = Exact<{
  dataset: Scalars['ID'];
  representations: Array<Scalars['ID']>;
}>;


export type ReleaseRepresentationsMutation = { __typename?: 'Mutation', releaseRepresentations?: { __typename?: 'Dataset', id: string, name: string, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples: Array<{ __typename?: 'Sample', id: string, name: string }>, createdBy?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }>, omerofiles: Array<{ __typename?: 'OmeroFile', id: string, name: string, file?: any | null }>, representations?: Array<{ __typename?: 'Representation', id: string, name?: string | null } | null> | null, children: Array<{ __typename?: 'Dataset', id: string, name: string }> } | null };

export type ReleaseSamplesMutationVariables = Exact<{
  dataset: Scalars['ID'];
  samples: Array<Scalars['ID']>;
}>;


export type ReleaseSamplesMutation = { __typename?: 'Mutation', releaseSamples?: { __typename?: 'Dataset', id: string, name: string, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples: Array<{ __typename?: 'Sample', id: string, name: string }>, createdBy?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }>, omerofiles: Array<{ __typename?: 'OmeroFile', id: string, name: string, file?: any | null }>, representations?: Array<{ __typename?: 'Representation', id: string, name?: string | null } | null> | null, children: Array<{ __typename?: 'Dataset', id: string, name: string }> } | null };

export type PutFilesMutationVariables = Exact<{
  dataset: Scalars['ID'];
  files: Array<Scalars['ID']>;
}>;


export type PutFilesMutation = { __typename?: 'Mutation', putFiles?: { __typename?: 'Dataset', id: string, name: string, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples: Array<{ __typename?: 'Sample', id: string, name: string }>, createdBy?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }>, omerofiles: Array<{ __typename?: 'OmeroFile', id: string, name: string, file?: any | null }>, representations?: Array<{ __typename?: 'Representation', id: string, name?: string | null } | null> | null, children: Array<{ __typename?: 'Dataset', id: string, name: string }> } | null };

export type CreateExperimentMutationVariables = Exact<{
  name: Scalars['String'];
  description: Scalars['String'];
}>;


export type CreateExperimentMutation = { __typename?: 'Mutation', createExperiment?: { __typename?: 'Experiment', id: string, name: string, description?: string | null, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples?: Array<{ __typename?: 'Sample', id: string, name: string } | null> | null, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }>, omeroFiles: Array<{ __typename?: 'OmeroFile', id: string, name: string }> } | null };

export type DeleteExperimentMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteExperimentMutation = { __typename?: 'Mutation', deleteExperiment?: { __typename?: 'DeleteExperimentResult', id?: string | null } | null };

export type UpdateExperimentMutationVariables = Exact<{
  id: Scalars['ID'];
  description?: InputMaybe<Scalars['String']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  name: Scalars['String'];
}>;


export type UpdateExperimentMutation = { __typename?: 'Mutation', updateExperiment?: { __typename?: 'Experiment', id: string, name: string, description?: string | null, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples?: Array<{ __typename?: 'Sample', id: string, name: string } | null> | null, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }>, omeroFiles: Array<{ __typename?: 'OmeroFile', id: string, name: string }> } | null };

export type PinExperimentMutationVariables = Exact<{
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
}>;


export type PinExperimentMutation = { __typename?: 'Mutation', pinExperiment?: { __typename?: 'Experiment', id: string, pinned?: boolean | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

export type AssociateSamplesMutationVariables = Exact<{
  experiment: Scalars['ID'];
  samples: Array<Scalars['ID']>;
}>;


export type AssociateSamplesMutation = { __typename?: 'Mutation', associateSamples?: { __typename?: 'Experiment', id: string, name: string, description?: string | null, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples?: Array<{ __typename?: 'Sample', id: string, name: string } | null> | null, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }>, omeroFiles: Array<{ __typename?: 'OmeroFile', id: string, name: string }> } | null };

export type AssociateFilesMutationVariables = Exact<{
  experiment: Scalars['ID'];
  files: Array<Scalars['ID']>;
}>;


export type AssociateFilesMutation = { __typename?: 'Mutation', associateFiles?: { __typename?: 'Experiment', id: string, name: string, description?: string | null, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples?: Array<{ __typename?: 'Sample', id: string, name: string } | null> | null, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }>, omeroFiles: Array<{ __typename?: 'OmeroFile', id: string, name: string }> } | null };

export type UnassociateSamplesMutationVariables = Exact<{
  experiment: Scalars['ID'];
  samples: Array<Scalars['ID']>;
}>;


export type UnassociateSamplesMutation = { __typename?: 'Mutation', unassociateSamples?: { __typename?: 'Experiment', id: string, name: string, description?: string | null, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples?: Array<{ __typename?: 'Sample', id: string, name: string } | null> | null, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }>, omeroFiles: Array<{ __typename?: 'OmeroFile', id: string, name: string }> } | null };

export type UnassociateFilesMutationVariables = Exact<{
  experiment: Scalars['ID'];
  files: Array<Scalars['ID']>;
}>;


export type UnassociateFilesMutation = { __typename?: 'Mutation', unassociateFiles?: { __typename?: 'Experiment', id: string, name: string, description?: string | null, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples?: Array<{ __typename?: 'Sample', id: string, name: string } | null> | null, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }>, omeroFiles: Array<{ __typename?: 'OmeroFile', id: string, name: string }> } | null };

export type DeleteGraphMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteGraphMutation = { __typename?: 'Mutation', deleteGraph?: { __typename?: 'DeleteGraphResult', id?: string | null } | null };

export type LinkMutationVariables = Exact<{
  relation: Scalars['ID'];
  leftType: LinkableModels;
  leftId: Scalars['ID'];
  rightType: LinkableModels;
  rightId: Scalars['ID'];
  context?: InputMaybe<Scalars['ID']>;
}>;


export type LinkMutation = { __typename?: 'Mutation', link?: { __typename?: 'DataLink', id: string, xId: string, yId: string, leftType?: LinkableModels | null, rightType?: LinkableModels | null, relation: { __typename?: 'Relation', id: string, name: string } } | null };

export type DeleteLinkMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteLinkMutation = { __typename?: 'Mutation', deleteLink?: { __typename?: 'DeleteLinkResult', id?: string | null } | null };

export type DeleteModelMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteModelMutation = { __typename?: 'Mutation', deleteModel?: { __typename?: 'DeleteModelResult', id?: string | null } | null };

export type UploadOmeroFileMutationVariables = Exact<{
  file: Scalars['ImageFile'];
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  datasets?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
}>;


export type UploadOmeroFileMutation = { __typename?: 'Mutation', uploadOmeroFile?: { __typename?: 'OmeroFile', id: string, name: string, type: OmeroFileType, createdAt: any, file?: any | null, tags?: Array<string | null> | null, createdWhile?: string | null, derivedRepresentations: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null }>, experiments: Array<{ __typename?: 'Experiment', id: string, name: string, description?: string | null }> } | null };

export type UploadBigFileMutationVariables = Exact<{
  file: Scalars['BigFile'];
  datasets?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
}>;


export type UploadBigFileMutation = { __typename?: 'Mutation', uploadBigFile?: { __typename?: 'OmeroFile', id: string, name: string, type: OmeroFileType, createdAt: any, file?: any | null, tags?: Array<string | null> | null, createdWhile?: string | null, derivedRepresentations: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null }>, experiments: Array<{ __typename?: 'Experiment', id: string, name: string, description?: string | null }> } | null };

export type DeleteOmeroFileMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteOmeroFileMutation = { __typename?: 'Mutation', deleteOmeroFile?: { __typename?: 'DeleteOmeroFileResult', id?: string | null } | null };

export type UpdateOmeroFileMutationVariables = Exact<{
  id: Scalars['ID'];
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
}>;


export type UpdateOmeroFileMutation = { __typename?: 'Mutation', updateOmeroFile?: { __typename?: 'OmeroFile', id: string, name: string, type: OmeroFileType, createdAt: any, file?: any | null, tags?: Array<string | null> | null, createdWhile?: string | null, derivedRepresentations: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null }>, experiments: Array<{ __typename?: 'Experiment', id: string, name: string, description?: string | null }> } | null };

export type ChangePermissionsMutationVariables = Exact<{
  type: SharableModels;
  object: Scalars['ID'];
  userAssignments?: InputMaybe<Array<InputMaybe<UserAssignmentInput>>>;
  groupAssignments?: InputMaybe<Array<InputMaybe<GroupAssignmentInput>>>;
}>;


export type ChangePermissionsMutation = { __typename?: 'Mutation', changePermissions?: { __typename?: 'ChangePermissionsResult', success?: boolean | null } | null };

export type CreatePlotMutationVariables = Exact<{
  name: Scalars['String'];
}>;


export type CreatePlotMutation = { __typename?: 'Mutation', createPlot?: { __typename?: 'Plot', id: string, query: string, name: string, description: string, createdAt: any, updatedAt: any, creator: { __typename?: 'User', username: string } } | null };

export type UpdatePlotMutationVariables = Exact<{
  id: Scalars['ID'];
  name?: InputMaybe<Scalars['String']>;
  query: Scalars['String'];
}>;


export type UpdatePlotMutation = { __typename?: 'Mutation', updatePlot?: { __typename?: 'Plot', id: string, query: string, name: string, description: string, createdAt: any, updatedAt: any, creator: { __typename?: 'User', username: string } } | null };

export type DeletePlotMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeletePlotMutation = { __typename?: 'Mutation', deletePlot?: { __typename?: 'DeletePlotResult', id?: string | null } | null };

export type CreatePositionMutationVariables = Exact<{
  stage: Scalars['ID'];
  x: Scalars['Float'];
  y: Scalars['Float'];
  z: Scalars['Float'];
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
}>;


export type CreatePositionMutation = { __typename?: 'Mutation', createPosition?: { __typename?: 'Position', id: string, name: string, x: number, y: number, z: number, stage: { __typename?: 'Stage', id: string, kind?: AcquisitionKind | null, name: string, createdAt: any, pinned?: boolean | null, tags?: Array<string | null> | null, instrument?: { __typename?: 'Instrument', id: string, name: string } | null, creator?: { __typename?: 'User', id: string, sub?: string | null } | null }, omeros?: Array<{ __typename?: 'Omero', acquisitionDate?: any | null, representation: { __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } } | null> | null, roiOrigins: Array<{ __typename?: 'ROI', id: string, type: RoiType, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, label?: string | null, createdWhile?: string | null, creator: { __typename?: 'User', id: string, sub?: string | null }, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null, t?: number | null, c?: number | null } | null> | null }> } | null };

export type DeletePositionMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeletePositionMutation = { __typename?: 'Mutation', deletePosition?: { __typename?: 'DeletePositionResult', id?: string | null } | null };

export type PinPositionMutationVariables = Exact<{
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
}>;


export type PinPositionMutation = { __typename?: 'Mutation', pinPosition?: { __typename?: 'Position', id: string, pinned?: boolean | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

export type PresignMutationVariables = Exact<{
  file: Scalars['String'];
}>;


export type PresignMutation = { __typename?: 'Mutation', presign?: { __typename?: 'Presigned', bucket: string, fields: { __typename?: 'PresignedFields', xAmzDate: string, xAmzAlgorithm: string, xAmzSignature: string, xAmzCredential: string, key: string, policy: string } } | null };

export type CreateRelationMutationVariables = Exact<{
  name: Scalars['String'];
  description?: InputMaybe<Scalars['String']>;
}>;


export type CreateRelationMutation = { __typename?: 'Mutation', createRelation?: { __typename?: 'Relation', name: string, description?: string | null, id: string } | null };

export type DeleteRepresentationMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteRepresentationMutation = { __typename?: 'Mutation', deleteRepresentation?: { __typename?: 'DeleteRepresentationResult', id?: string | null } | null };

export type UpdateRepresentationMutationVariables = Exact<{
  id: Scalars['ID'];
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  sample?: InputMaybe<Scalars['ID']>;
  variety?: InputMaybe<RepresentationVarietyInput>;
  origins?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
}>;


export type UpdateRepresentationMutation = { __typename?: 'Mutation', updateRepresentation?: { __typename?: 'Representation', id: string, name?: string | null, shape?: Array<number> | null, dims?: Array<string> | null, tags?: Array<string | null> | null, store?: any | null, createdAt: any, variety: RepresentationVariety, createdWhile?: string | null, pinned?: boolean | null, renders?: Array<{ __typename?: 'Thumbnail', id: string, image?: string | null, blurhash?: string | null, representation: { __typename?: 'Representation', id: string, name?: string | null } } | { __typename?: 'Video', id: string, data?: string | null, frontImage?: string | null } | null> | null, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, datasets: Array<{ __typename?: 'Dataset', id: string, name: string }>, sample?: { __typename?: 'Sample', id: string, name: string } | null, metrics?: Array<{ __typename?: 'Metric', id: string, key: string, value?: any | null, comments?: Array<{ __typename?: 'Comment', user: { __typename?: 'User', sub?: string | null } } | null> | null } | null> | null, omero?: { __typename?: 'Omero', id: string, acquisitionDate?: any | null, affineTransformation?: any | null, scale?: Array<number | null> | null, physicalSize?: { __typename?: 'PhysicalSize', x?: number | null, y?: number | null, z?: number | null, t?: number | null } | null, planes?: Array<{ __typename?: 'Plane', z?: number | null, t?: number | null, exposureTime?: number | null, deltaT?: number | null } | null> | null, channels?: Array<{ __typename?: 'OmeroChannel', name?: string | null, emmissionWavelength?: number | null, excitationWavelength?: number | null, color?: string | null } | null> | null, objectiveSettings?: { __typename?: 'ObjectiveSettings', correctionCollar?: number | null, medium?: Medium | null } | null, positions: Array<{ __typename?: 'Position', id: string, x: number, y: number, z: number, stage: { __typename?: 'Stage', id: string, name: string } }>, views?: Array<{ __typename?: 'View', id: string, xMin?: number | null, xMax?: number | null, yMin?: number | null, yMax?: number | null, zMin?: number | null, zMax?: number | null, tMin?: number | null, tMax?: number | null, cMin?: number | null, cMax?: number | null, channel?: { __typename?: 'Channel', id: string, name: string, color?: string | null } | null, position?: { __typename?: 'Position', id: string, name: string, x: number } | null } | null> | null, dimensionMaps?: Array<{ __typename?: 'DimensionMap', id: string, index: number, dimension: string, channel: { __typename?: 'Channel', id: string, name: string, color?: string | null, emissionWavelength?: number | null, excitationWavelength?: number | null } } | null> | null, instrument?: { __typename?: 'Instrument', id: string, name: string, model?: string | null } | null, objective?: { __typename?: 'Objective', id: string, name: string, magnification?: number | null } | null, timepoints?: Array<{ __typename?: 'Timepoint', id: string, deltaT?: number | null, era: { __typename?: 'Era', id: string, name: string } } | null> | null, imagingEnvironment?: { __typename?: 'ImagingEnvironment', airPressure?: number | null, co2Percent?: number | null, humidity?: number | null, temperature?: number | null } | null } | null, origins: Array<{ __typename?: 'Representation', id: string, name?: string | null, tags?: Array<string | null> | null, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, blurhash?: string | null } | null }>, derived?: Array<{ __typename?: 'Representation', id: string, name?: string | null, tags?: Array<string | null> | null, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, blurhash?: string | null } | null } | null> | null, tables?: Array<{ __typename?: 'Table', id: string, name: string } | null> | null, fileOrigins: Array<{ __typename?: 'OmeroFile', id: string, name: string, type: OmeroFileType }>, tableOrigins: Array<{ __typename?: 'Table', id: string, name: string }>, roiOrigins?: Array<{ __typename?: 'ROI', id: string, label?: string | null, type: RoiType } | null> | null, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }>, rois?: Array<{ __typename?: 'ROI', id: string, type: RoiType, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, label?: string | null, createdWhile?: string | null, creator: { __typename?: 'User', id: string, sub?: string | null }, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null, t?: number | null, c?: number | null } | null> | null } | null> | null } | null };

export type PinRepresentationMutationVariables = Exact<{
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
}>;


export type PinRepresentationMutation = { __typename?: 'Mutation', pinRepresentation?: { __typename?: 'Representation', id: string, pinned?: boolean | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

export type PinRoiMutationVariables = Exact<{
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
}>;


export type PinRoiMutation = { __typename?: 'Mutation', pinROI?: { __typename?: 'ROI', id: string, pinned?: boolean | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

export type DeleteRoiMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteRoiMutation = { __typename?: 'Mutation', deleteROI?: { __typename?: 'DeleteROIResult', id?: string | null } | null };

export type Create_RoiMutationVariables = Exact<{
  representation: Scalars['ID'];
  vectors: Array<InputMaybe<InputVector>>;
  creator?: InputMaybe<Scalars['ID']>;
  type: RoiTypeInput;
  label?: InputMaybe<Scalars['String']>;
}>;


export type Create_RoiMutation = { __typename?: 'Mutation', createROI?: { __typename?: 'ROI', id: string, type: RoiType, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, label?: string | null, createdWhile?: string | null, creator: { __typename?: 'User', id: string, sub?: string | null }, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null, t?: number | null, c?: number | null } | null> | null } | null };

export type CreateSampleMutationVariables = Exact<{
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  name: Scalars['String'];
}>;


export type CreateSampleMutation = { __typename?: 'Mutation', createSample?: { __typename?: 'Sample', name: string, id: string, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, experiments: Array<{ __typename?: 'Experiment', id: string, name: string }>, representations?: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null> | null, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

export type DeleteSampleMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteSampleMutation = { __typename?: 'Mutation', deleteSample?: { __typename?: 'DeleteSampleResult', id?: string | null } | null };

export type UpdateSampleMutationVariables = Exact<{
  id: Scalars['ID'];
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  name: Scalars['String'];
}>;


export type UpdateSampleMutation = { __typename?: 'Mutation', updateSample?: { __typename?: 'Sample', name: string, id: string, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, experiments: Array<{ __typename?: 'Experiment', id: string, name: string }>, representations?: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null> | null, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

export type PinSampleMutationVariables = Exact<{
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
}>;


export type PinSampleMutation = { __typename?: 'Mutation', pinSample?: { __typename?: 'Sample', id: string, pinned?: boolean | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

export type DeleteStageMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteStageMutation = { __typename?: 'Mutation', deleteStage?: { __typename?: 'DeleteStageResult', id?: string | null } | null };

export type UpdateStageMutationVariables = Exact<{
  id: Scalars['ID'];
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  name: Scalars['String'];
}>;


export type UpdateStageMutation = { __typename?: 'Mutation', updateStage?: { __typename?: 'Stage', id: string, kind?: AcquisitionKind | null, name: string, createdAt: any, pinned?: boolean | null, tags?: Array<string | null> | null, instrument?: { __typename?: 'Instrument', id: string, name: string } | null, creator?: { __typename?: 'User', id: string, sub?: string | null } | null } | null };

export type CreateStageMutationVariables = Exact<{
  name: Scalars['String'];
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
}>;


export type CreateStageMutation = { __typename?: 'Mutation', createStage?: { __typename?: 'Stage', id: string, kind?: AcquisitionKind | null, name: string, createdAt: any, pinned?: boolean | null, tags?: Array<string | null> | null, instrument?: { __typename?: 'Instrument', id: string, name: string } | null, creator?: { __typename?: 'User', id: string, sub?: string | null } | null } | null };

export type PinStageMutationVariables = Exact<{
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
}>;


export type PinStageMutation = { __typename?: 'Mutation', pinStage?: { __typename?: 'Stage', id: string, pinned?: boolean | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

export type DeleteTableMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteTableMutation = { __typename?: 'Mutation', deleteTable?: { __typename?: 'DeleteTableResult', id?: string | null } | null };

export type Create_ThumbnailMutationVariables = Exact<{
  rep: Scalars['ID'];
  file: Scalars['ImageFile'];
}>;


export type Create_ThumbnailMutation = { __typename?: 'Mutation', uploadThumbnail?: { __typename?: 'Thumbnail', id: string, image?: string | null, blurhash?: string | null, representation: { __typename?: 'Representation', id: string, name?: string | null } } | null };

export type GetChannelQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetChannelQuery = { __typename?: 'Query', channel?: { __typename?: 'Channel', name: string, id: string, emissionWavelength?: number | null, excitationWavelength?: number | null, dimensionMaps?: Array<{ __typename?: 'DimensionMap', id: string, omero: { __typename?: 'Omero', id: string } } | null> | null } | null };

export type SearchChannelsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
  values?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
}>;


export type SearchChannelsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Channel', value: string, label: string } | null> | null };

export type CommentsForQueryVariables = Exact<{
  id: Scalars['ID'];
  model: CommentableModels;
}>;


export type CommentsForQuery = { __typename?: 'Query', commentsfor?: Array<{ __typename?: 'Comment', resolved?: any | null, id: string, createdAt: any, user: { __typename?: 'User', id: string, sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, resolvedBy?: { __typename?: 'User', sub?: string | null } | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', id: string, sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null } | null> | null };

export type MyMentionsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyMentionsQuery = { __typename?: 'Query', mymentions?: Array<{ __typename?: 'Comment', id: string, createdAt: any, resolved?: any | null, objectId: number, contentType?: CommentableModels | null, user: { __typename?: 'User', id: string, sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', id: string, sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null, mentions: Array<{ __typename?: 'User', id: string, sub?: string | null }>, resolvedBy?: { __typename?: 'User', sub?: string | null } | null } | null> | null };

export type DetailCommentQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailCommentQuery = { __typename?: 'Query', comment?: { __typename?: 'Comment', id: string, resolved?: any | null, createdAt: any, objectId: number, contentType?: CommentableModels | null, user: { __typename?: 'User', id: string, sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, resolvedBy?: { __typename?: 'User', sub?: string | null } | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', id: string, sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null, mentions: Array<{ __typename?: 'User', id: string, sub?: string | null }> } | null };

export type MyContextsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
}>;


export type MyContextsQuery = { __typename?: 'Query', mycontexts?: Array<{ __typename?: 'Context', name: string, id: string } | null> | null };

export type DetailContextQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailContextQuery = { __typename?: 'Query', context?: { __typename?: 'Context', id: string, name: string, createdAt: any, links: Array<{ __typename?: 'DataLink', id: string, xId: string, yId: string, leftType?: LinkableModels | null, rightType?: LinkableModels | null, relation: { __typename?: 'Relation', id: string, name: string } }>, models: Array<{ __typename?: 'Model', id: string, name: string }> } | null };

export type SearchContextsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
  values?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
}>;


export type SearchContextsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Context', label: string, value: string } | null> | null };

export type DashboardQueryQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  id: Scalars['ID'];
  order?: InputMaybe<Scalars['String']>;
}>;


export type DashboardQueryQuery = { __typename?: 'Query', stage?: { __typename?: 'Stage', name: string, id: string, positions?: Array<{ __typename?: 'Position', id: string, x: number, y: number, z: number, omeros?: Array<{ __typename?: 'Omero', id: string, acquisitionDate?: any | null, representation: { __typename?: 'Representation', name?: string | null, id: string, store?: any | null, shape?: Array<number> | null, latestThumbnail?: { __typename?: 'Thumbnail', id: string, image?: string | null, blurhash?: string | null } | null, metrics?: Array<{ __typename?: 'Metric', id: string, key: string, value?: any | null } | null> | null } } | null> | null } | null> | null } | null };

export type MyDatasetsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
}>;


export type MyDatasetsQuery = { __typename?: 'Query', mydatasets?: Array<{ __typename?: 'Dataset', id: string, name: string } | null> | null };

export type DetailDatasetQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailDatasetQuery = { __typename?: 'Query', dataset?: { __typename?: 'Dataset', id: string, name: string, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples: Array<{ __typename?: 'Sample', id: string, name: string }>, createdBy?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }>, omerofiles: Array<{ __typename?: 'OmeroFile', id: string, name: string, file?: any | null }>, representations?: Array<{ __typename?: 'Representation', id: string, name?: string | null } | null> | null, children: Array<{ __typename?: 'Dataset', id: string, name: string }> } | null };

export type SearchDatasetsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type SearchDatasetsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Dataset', label: string, value: string } | null> | null };

export type DownloadFilesQueryVariables = Exact<{
  dataset: Scalars['ID'];
}>;


export type DownloadFilesQuery = { __typename?: 'Query', dataset?: { __typename?: 'Dataset', omerofiles: Array<{ __typename?: 'OmeroFile', file?: any | null, name: string }> } | null };

export type DetailEraQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailEraQuery = { __typename?: 'Query', era?: { __typename?: 'Era', name: string, id: string, start?: any | null, end?: any | null, tags?: Array<string | null> | null, pinned?: boolean | null, timepoints?: Array<{ __typename?: 'Timepoint', id: string, name?: string | null, deltaT?: number | null, omeros?: Array<{ __typename?: 'Omero', id: string, representation: { __typename?: 'Representation', id: string, name?: string | null } } | null> | null } | null> | null } | null };

export type MyErasQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
}>;


export type MyErasQuery = { __typename?: 'Query', myeras?: Array<{ __typename?: 'Era', id: string, name: string, start?: any | null, end?: any | null } | null> | null };

export type EraSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type EraSearchQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Era', value: string, label: string } | null> | null };

export type MyExperimentsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
}>;


export type MyExperimentsQuery = { __typename?: 'Query', myexperiments?: Array<{ __typename?: 'Experiment', id: string, name: string, description?: string | null } | null> | null };

export type DetailExperimentQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailExperimentQuery = { __typename?: 'Query', experiment?: { __typename?: 'Experiment', id: string, name: string, description?: string | null, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples?: Array<{ __typename?: 'Sample', id: string, name: string } | null> | null, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }>, omeroFiles: Array<{ __typename?: 'OmeroFile', id: string, name: string }> } | null };

export type SearchExperimentsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
  values?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
}>;


export type SearchExperimentsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Experiment', label: string, value: string } | null> | null };

export type GlobalSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['ID']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  stages?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
}>;


export type GlobalSearchQuery = { __typename?: 'Query', experiments?: Array<{ __typename?: 'Experiment', id: string, name: string, description?: string | null } | null> | null, samples?: Array<{ __typename?: 'Sample', id: string, name: string } | null> | null, datasets?: Array<{ __typename?: 'Dataset', id: string, name: string } | null> | null, tables?: Array<{ __typename?: 'Table', id: string, name: string } | null> | null, representations?: Array<{ __typename?: 'Representation', id: string, name?: string | null, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null } | null } | null> | null, files?: Array<{ __typename?: 'OmeroFile', id: string, name: string } | null> | null };

export type MyGraphsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
}>;


export type MyGraphsQuery = { __typename?: 'Query', mygraphs?: Array<{ __typename?: 'Graph', id: string, name: string, image?: string | null, usedColumns?: any | null, tables: Array<{ __typename?: 'Table', id: string, name: string }> } | null> | null };

export type DetailGraphQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailGraphQuery = { __typename?: 'Query', graph?: { __typename?: 'Graph', id: string, name: string, image?: string | null, usedColumns?: any | null, tables: Array<{ __typename?: 'Table', id: string, name: string }> } | null };

export type SearchGraphsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
  values?: InputMaybe<Array<Scalars['ID']>>;
}>;


export type SearchGraphsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Model', label: string, value: string } | null> | null };

export type DetailInstrumentQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailInstrumentQuery = { __typename?: 'Query', instrument?: { __typename?: 'Instrument', id: string, name: string, omeros?: Array<{ __typename?: 'Omero', acquisitionDate?: any | null, representation: { __typename?: 'Representation', id: string, shape?: Array<number> | null, name?: string | null } } | null> | null } | null };

export type InstrumentsQueryVariables = Exact<{ [key: string]: never; }>;


export type InstrumentsQuery = { __typename?: 'Query', instruments?: Array<{ __typename?: 'Instrument', id: string, name: string } | null> | null };

export type InstrumentSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type InstrumentSearchQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Instrument', value: string, label: string } | null> | null };

export type LinksQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
}>;


export type LinksQuery = { __typename?: 'Query', links?: Array<{ __typename?: 'DataLink', id: string, xId: string, yId: string, leftType?: LinkableModels | null, rightType?: LinkableModels | null, relation: { __typename?: 'Relation', id: string, name: string } } | null> | null };

export type DetailLinkQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailLinkQuery = { __typename?: 'Query', link?: { __typename?: 'DataLink', id: string, xId: string, yId: string, leftType?: LinkableModels | null, rightType?: LinkableModels | null, context?: { __typename?: 'Context', name: string, id: string } | null, relation: { __typename?: 'Relation', id: string, name: string } } | null };

export type SearchLinksQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type SearchLinksQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'DataLink', label: string, value: string } | null> | null };

export type DetailMetaQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailMetaQuery = { __typename?: 'Query', meta?: { __typename?: 'Omero', id: string, acquisitionDate?: any | null, affineTransformation?: any | null, scale?: Array<number | null> | null, representation: { __typename?: 'Representation', id: string, name?: string | null }, physicalSize?: { __typename?: 'PhysicalSize', x?: number | null, y?: number | null, z?: number | null, t?: number | null } | null, planes?: Array<{ __typename?: 'Plane', z?: number | null, t?: number | null, exposureTime?: number | null, deltaT?: number | null } | null> | null, channels?: Array<{ __typename?: 'OmeroChannel', name?: string | null, emmissionWavelength?: number | null, excitationWavelength?: number | null, color?: string | null } | null> | null, objectiveSettings?: { __typename?: 'ObjectiveSettings', correctionCollar?: number | null, medium?: Medium | null } | null, positions: Array<{ __typename?: 'Position', id: string, x: number, y: number, z: number, stage: { __typename?: 'Stage', id: string, name: string } }>, timepoints?: Array<{ __typename?: 'Timepoint', id: string, name?: string | null, deltaT?: number | null } | null> | null, views?: Array<{ __typename?: 'View', id: string, xMin?: number | null, xMax?: number | null, yMin?: number | null, yMax?: number | null, zMin?: number | null, zMax?: number | null, tMin?: number | null, tMax?: number | null, cMin?: number | null, cMax?: number | null, channel?: { __typename?: 'Channel', id: string, name: string, color?: string | null } | null, position?: { __typename?: 'Position', id: string, name: string, x: number, y: number, z: number } | null, timepoint?: { __typename?: 'Timepoint', id: string, name?: string | null, deltaT?: number | null } | null } | null> | null, dimensionMaps?: Array<{ __typename?: 'DimensionMap', id: string, index: number, dimension: string, channel: { __typename?: 'Channel', id: string, name: string, color?: string | null, emissionWavelength?: number | null, excitationWavelength?: number | null } } | null> | null, instrument?: { __typename?: 'Instrument', id: string, name: string, model?: string | null } | null, objective?: { __typename?: 'Objective', id: string, name: string, magnification?: number | null } | null, imagingEnvironment?: { __typename?: 'ImagingEnvironment', airPressure?: number | null, co2Percent?: number | null, humidity?: number | null, temperature?: number | null } | null } | null };

export type DetailMetricQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailMetricQuery = { __typename?: 'Query', metric?: { __typename?: 'Metric', key: string, value?: any | null } | null };

export type MyModelsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
}>;


export type MyModelsQuery = { __typename?: 'Query', mymodels?: Array<{ __typename?: 'Model', id: string, name: string, data?: any | null, kind?: ModelKind | null, contexts: Array<{ __typename?: 'Context', id: string, name: string }> } | null> | null };

export type DetailModelQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailModelQuery = { __typename?: 'Query', model?: { __typename?: 'Model', id: string, name: string, data?: any | null, kind?: ModelKind | null, contexts: Array<{ __typename?: 'Context', id: string, name: string }> } | null };

export type SearchModelsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type SearchModelsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Model', label: string, value: string } | null> | null };

export type DetailObjectiveQueryVariables = Exact<{
  id?: InputMaybe<Scalars['ID']>;
}>;


export type DetailObjectiveQuery = { __typename?: 'Query', objective?: { __typename?: 'Objective', id: string, name: string, magnification?: number | null, omeros?: Array<{ __typename?: 'Omero', acquisitionDate?: any | null, representation: { __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } } | null> | null } | null };

export type ObjectivesQueryVariables = Exact<{ [key: string]: never; }>;


export type ObjectivesQuery = { __typename?: 'Query', objectives?: Array<{ __typename?: 'Objective', id: string, name: string, magnification?: number | null } | null> | null };

export type SearchObjectivesQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type SearchObjectivesQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Objective', value: string, label: string } | null> | null };

export type MyOmeroFilesQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
}>;


export type MyOmeroFilesQuery = { __typename?: 'Query', myomerofiles?: Array<{ __typename?: 'OmeroFile', id: string, name: string, type: OmeroFileType, createdAt: any, file?: any | null } | null> | null };

export type DetailOmeroFileQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailOmeroFileQuery = { __typename?: 'Query', omerofile?: { __typename?: 'OmeroFile', id: string, name: string, type: OmeroFileType, createdAt: any, file?: any | null, tags?: Array<string | null> | null, createdWhile?: string | null, derivedRepresentations: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null }>, experiments: Array<{ __typename?: 'Experiment', id: string, name: string, description?: string | null }> } | null };

export type PermissionOptionsQueryVariables = Exact<{
  model: SharableModels;
  search?: InputMaybe<Scalars['String']>;
}>;


export type PermissionOptionsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Permission', label: string, value: string } | null> | null };

export type PermissionsOfQueryVariables = Exact<{
  model: SharableModels;
  id: Scalars['ID'];
}>;


export type PermissionsOfQuery = { __typename?: 'Query', permissionsOf?: { __typename?: 'PermissionsOfReturn', available?: Array<{ __typename?: 'Permission', name: string } | null> | null, options?: Array<{ __typename?: 'Permission', label: string, value: string } | null> | null, groupAssignments?: Array<{ __typename?: 'GroupAssignment', permissions: Array<string | null>, group: { __typename?: 'Group', name: string } } | null> | null, userAssignments?: Array<{ __typename?: 'UserAssignment', permissions: Array<string | null>, user: { __typename?: 'User', sub?: string | null, username: string, email: string } } | null> | null } | null };

export type DetailPlotQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailPlotQuery = { __typename?: 'Query', plot?: { __typename?: 'Plot', id: string, query: string, name: string, description: string, createdAt: any, updatedAt: any, creator: { __typename?: 'User', username: string } } | null };

export type MyPlotsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
}>;


export type MyPlotsQuery = { __typename?: 'Query', myplots?: Array<{ __typename?: 'Plot', id: string, name: string, creator: { __typename?: 'User', username: string } } | null> | null };

export type DetailPositionQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailPositionQuery = { __typename?: 'Query', position?: { __typename?: 'Position', id: string, name: string, x: number, y: number, z: number, stage: { __typename?: 'Stage', id: string, kind?: AcquisitionKind | null, name: string, createdAt: any, pinned?: boolean | null, tags?: Array<string | null> | null, instrument?: { __typename?: 'Instrument', id: string, name: string } | null, creator?: { __typename?: 'User', id: string, sub?: string | null } | null }, omeros?: Array<{ __typename?: 'Omero', acquisitionDate?: any | null, representation: { __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } } | null> | null, roiOrigins: Array<{ __typename?: 'ROI', id: string, type: RoiType, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, label?: string | null, createdWhile?: string | null, creator: { __typename?: 'User', id: string, sub?: string | null }, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null, t?: number | null, c?: number | null } | null> | null }> } | null };

export type PositionSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
  stage?: InputMaybe<Scalars['ID']>;
}>;


export type PositionSearchQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Position', value: string, label: string } | null> | null };

export type ProvenanceQueryVariables = Exact<{
  ids: Array<InputMaybe<Scalars['ID']>>;
}>;


export type ProvenanceQuery = { __typename?: 'Query', provenance?: Array<{ __typename: 'Context', id: string, createdAt: any } | { __typename: 'Experiment' } | { __typename: 'ROI', id: string, label?: string | null, createdAt: any } | { __typename: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | { __typename: 'Sample', id: string, createdAt: any } | { __typename: 'Stage' } | { __typename: 'Table' } | null> | null };

export type MyRelationsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
}>;


export type MyRelationsQuery = { __typename?: 'Query', relations?: Array<{ __typename?: 'Relation', name: string, description?: string | null, id: string } | null> | null };

export type DetailRelationQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailRelationQuery = { __typename?: 'Query', relation?: { __typename?: 'Relation', name: string, description?: string | null, id: string } | null };

export type SearchRelationsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
  values?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
}>;


export type SearchRelationsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Relation', label: string, value: string } | null> | null };

export type DetailRepresentationQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailRepresentationQuery = { __typename?: 'Query', representation?: { __typename?: 'Representation', id: string, name?: string | null, shape?: Array<number> | null, dims?: Array<string> | null, tags?: Array<string | null> | null, store?: any | null, createdAt: any, variety: RepresentationVariety, createdWhile?: string | null, pinned?: boolean | null, renders?: Array<{ __typename?: 'Thumbnail', id: string, image?: string | null, blurhash?: string | null, representation: { __typename?: 'Representation', id: string, name?: string | null } } | { __typename?: 'Video', id: string, data?: string | null, frontImage?: string | null } | null> | null, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, datasets: Array<{ __typename?: 'Dataset', id: string, name: string }>, sample?: { __typename?: 'Sample', id: string, name: string } | null, metrics?: Array<{ __typename?: 'Metric', id: string, key: string, value?: any | null, comments?: Array<{ __typename?: 'Comment', user: { __typename?: 'User', sub?: string | null } } | null> | null } | null> | null, omero?: { __typename?: 'Omero', id: string, acquisitionDate?: any | null, affineTransformation?: any | null, scale?: Array<number | null> | null, physicalSize?: { __typename?: 'PhysicalSize', x?: number | null, y?: number | null, z?: number | null, t?: number | null } | null, planes?: Array<{ __typename?: 'Plane', z?: number | null, t?: number | null, exposureTime?: number | null, deltaT?: number | null } | null> | null, channels?: Array<{ __typename?: 'OmeroChannel', name?: string | null, emmissionWavelength?: number | null, excitationWavelength?: number | null, color?: string | null } | null> | null, objectiveSettings?: { __typename?: 'ObjectiveSettings', correctionCollar?: number | null, medium?: Medium | null } | null, positions: Array<{ __typename?: 'Position', id: string, x: number, y: number, z: number, stage: { __typename?: 'Stage', id: string, name: string } }>, views?: Array<{ __typename?: 'View', id: string, xMin?: number | null, xMax?: number | null, yMin?: number | null, yMax?: number | null, zMin?: number | null, zMax?: number | null, tMin?: number | null, tMax?: number | null, cMin?: number | null, cMax?: number | null, channel?: { __typename?: 'Channel', id: string, name: string, color?: string | null } | null, position?: { __typename?: 'Position', id: string, name: string, x: number } | null } | null> | null, dimensionMaps?: Array<{ __typename?: 'DimensionMap', id: string, index: number, dimension: string, channel: { __typename?: 'Channel', id: string, name: string, color?: string | null, emissionWavelength?: number | null, excitationWavelength?: number | null } } | null> | null, instrument?: { __typename?: 'Instrument', id: string, name: string, model?: string | null } | null, objective?: { __typename?: 'Objective', id: string, name: string, magnification?: number | null } | null, timepoints?: Array<{ __typename?: 'Timepoint', id: string, deltaT?: number | null, era: { __typename?: 'Era', id: string, name: string } } | null> | null, imagingEnvironment?: { __typename?: 'ImagingEnvironment', airPressure?: number | null, co2Percent?: number | null, humidity?: number | null, temperature?: number | null } | null } | null, origins: Array<{ __typename?: 'Representation', id: string, name?: string | null, tags?: Array<string | null> | null, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, blurhash?: string | null } | null }>, derived?: Array<{ __typename?: 'Representation', id: string, name?: string | null, tags?: Array<string | null> | null, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, blurhash?: string | null } | null } | null> | null, tables?: Array<{ __typename?: 'Table', id: string, name: string } | null> | null, fileOrigins: Array<{ __typename?: 'OmeroFile', id: string, name: string, type: OmeroFileType }>, tableOrigins: Array<{ __typename?: 'Table', id: string, name: string }>, roiOrigins?: Array<{ __typename?: 'ROI', id: string, label?: string | null, type: RoiType } | null> | null, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }>, rois?: Array<{ __typename?: 'ROI', id: string, type: RoiType, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, label?: string | null, createdWhile?: string | null, creator: { __typename?: 'User', id: string, sub?: string | null }, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null, t?: number | null, c?: number | null } | null> | null } | null> | null } | null };

export type MyRepresentationsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  noChildren?: InputMaybe<Scalars['Boolean']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
}>;


export type MyRepresentationsQuery = { __typename?: 'Query', myrepresentations?: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null> | null };

export type SharedRepresentationsQueryVariables = Exact<{ [key: string]: never; }>;


export type SharedRepresentationsQuery = { __typename?: 'Query', sharedrepresentations?: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null, creator?: { __typename?: 'User', email: string } | null } | null> | null };

export type RepresentationsForQueryVariables = Exact<{
  group: Scalars['String'];
}>;


export type RepresentationsForQuery = { __typename?: 'Query', representationsForGroup?: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null, creator?: { __typename?: 'User', email: string } | null } | null> | null };

export type RepresentationsForUserQueryVariables = Exact<{
  email: Scalars['String'];
}>;


export type RepresentationsForUserQuery = { __typename?: 'Query', representationsForUser?: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null, creator?: { __typename?: 'User', email: string } | null } | null> | null };

export type SearchableRepresentationsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  samples?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  name?: InputMaybe<Scalars['String']>;
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  derivedTags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
}>;


export type SearchableRepresentationsQuery = { __typename?: 'Query', myrepresentations?: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null> | null };

export type RepresentationFilterSearchQueryVariables = Exact<{
  value: Scalars['String'];
}>;


export type RepresentationFilterSearchQuery = { __typename?: 'Query', Samples?: Array<{ __typename?: 'Sample', label: string, value: string } | null> | null, Experiments?: Array<{ __typename?: 'Experiment', label: string, value: string } | null> | null, Tags?: Array<{ __typename?: 'Tag', label: string, value: string } | null> | null, DerivedTags?: Array<{ __typename?: 'Tag', label: string, value: string } | null> | null };

export type PinnedRepresentationsQueryVariables = Exact<{ [key: string]: never; }>;


export type PinnedRepresentationsQuery = { __typename?: 'Query', representations?: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null> | null };

export type RequestQueryVariables = Exact<{ [key: string]: never; }>;


export type RequestQuery = { __typename?: 'Query', request?: { __typename?: 'Credentials', accessKey: string, secretKey: string, status: string, sessionToken: string } | null };

export type RoisForRepresentationQueryVariables = Exact<{
  representation: Scalars['ID'];
  type?: InputMaybe<Array<InputMaybe<RoiTypeInput>>>;
}>;


export type RoisForRepresentationQuery = { __typename?: 'Query', rois?: Array<{ __typename?: 'ROI', id: string, type: RoiType, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, label?: string | null, createdWhile?: string | null, creator: { __typename?: 'User', id: string, sub?: string | null }, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null, t?: number | null, c?: number | null } | null> | null } | null> | null };

export type DetailRoiQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailRoiQuery = { __typename?: 'Query', roi?: { __typename?: 'ROI', id: string, type: RoiType, label?: string | null, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, createdWhile?: string | null, creator: { __typename?: 'User', id: string }, representation?: { __typename?: 'Representation', id: string, shape?: Array<number> | null, store?: any | null, name?: string | null, variety: RepresentationVariety, rois?: Array<{ __typename?: 'ROI', id: string, type: RoiType, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, label?: string | null, createdWhile?: string | null, creator: { __typename?: 'User', id: string, sub?: string | null }, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null, t?: number | null, c?: number | null } | null> | null } | null> | null, omero?: { __typename?: 'Omero', id: string, acquisitionDate?: any | null, affineTransformation?: any | null, scale?: Array<number | null> | null, physicalSize?: { __typename?: 'PhysicalSize', x?: number | null, y?: number | null, z?: number | null, t?: number | null } | null, planes?: Array<{ __typename?: 'Plane', z?: number | null, t?: number | null, exposureTime?: number | null, deltaT?: number | null } | null> | null, channels?: Array<{ __typename?: 'OmeroChannel', name?: string | null, emmissionWavelength?: number | null, excitationWavelength?: number | null, color?: string | null } | null> | null, objectiveSettings?: { __typename?: 'ObjectiveSettings', correctionCollar?: number | null, medium?: Medium | null } | null, positions: Array<{ __typename?: 'Position', id: string, x: number, y: number, z: number, stage: { __typename?: 'Stage', id: string, name: string } }>, views?: Array<{ __typename?: 'View', id: string, xMin?: number | null, xMax?: number | null, yMin?: number | null, yMax?: number | null, zMin?: number | null, zMax?: number | null, tMin?: number | null, tMax?: number | null, cMin?: number | null, cMax?: number | null, channel?: { __typename?: 'Channel', id: string, name: string, color?: string | null } | null, position?: { __typename?: 'Position', id: string, name: string, x: number } | null } | null> | null, dimensionMaps?: Array<{ __typename?: 'DimensionMap', id: string, index: number, dimension: string, channel: { __typename?: 'Channel', id: string, name: string, color?: string | null, emissionWavelength?: number | null, excitationWavelength?: number | null } } | null> | null, instrument?: { __typename?: 'Instrument', id: string, name: string, model?: string | null } | null, objective?: { __typename?: 'Objective', id: string, name: string, magnification?: number | null } | null, timepoints?: Array<{ __typename?: 'Timepoint', id: string, deltaT?: number | null, era: { __typename?: 'Era', id: string, name: string } } | null> | null, imagingEnvironment?: { __typename?: 'ImagingEnvironment', airPressure?: number | null, co2Percent?: number | null, humidity?: number | null, temperature?: number | null } | null } | null } | null, derivedRepresentations: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null }>, derivedPositions: Array<{ __typename?: 'Position', id: string, x: number, y: number, z: number, name: string, omeros?: Array<{ __typename?: 'Omero', acquisitionDate?: any | null, physicalSize?: { __typename?: 'PhysicalSize', x?: number | null, y?: number | null, z?: number | null } | null, representation: { __typename?: 'Representation', id: string, shape?: Array<number> | null } } | null> | null }>, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null } | null> | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

export type DetailSampleQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailSampleQuery = { __typename?: 'Query', sample?: { __typename?: 'Sample', name: string, id: string, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, experiments: Array<{ __typename?: 'Experiment', id: string, name: string }>, representations?: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null> | null, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

export type MySamplesQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
}>;


export type MySamplesQuery = { __typename?: 'Query', mysamples?: Array<{ __typename?: 'Sample', name: string, id: string, pinned?: boolean | null, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null> | null };

export type SearchSampleQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type SearchSampleQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Sample', value: string, label: string } | null> | null };

export type TestBoardQueryVariables = Exact<{
  exp: Scalars['ID'];
}>;


export type TestBoardQuery = { __typename?: 'Query', experiment?: { __typename?: 'Experiment', name: string, id: string, samples?: Array<{ __typename?: 'Sample', meta?: any | null, name: string, id: string, representations?: Array<{ __typename?: 'Representation', id: string, meta?: any | null, name?: string | null, createdAt: any, metrics?: Array<{ __typename?: 'Metric', id: string, key: string, value?: any | null, createdAt: any } | null> | null, thumbnails: Array<{ __typename?: 'Thumbnail', id: string }> } | null> | null } | null> | null } | null };

export type TestBoardFilterQueryVariables = Exact<{
  value?: InputMaybe<Scalars['String']>;
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
}>;


export type TestBoardFilterQuery = { __typename?: 'Query', tags?: Array<{ __typename?: 'Tag', label: string, value: string } | null> | null, samples?: Array<{ __typename?: 'Sample', label: string, value: string } | null> | null };

export type TestBoardChangedQueryVariables = Exact<{
  exp: Scalars['ID'];
  order?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  keys?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  samples?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
}>;


export type TestBoardChangedQuery = { __typename?: 'Query', experiment?: { __typename?: 'Experiment', name: string, id: string, samples?: Array<{ __typename?: 'Sample', meta?: any | null, name: string, id: string, display_rep?: Array<{ __typename?: 'Representation', id: string, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null } | null } | null> | null, data_reps?: Array<{ __typename?: 'Representation', id: string, meta?: any | null, variety: RepresentationVariety, metrics?: Array<{ __typename?: 'Metric', value?: any | null } | null> | null } | null> | null } | null> | null } | null };

export type TestBoardTableKeysQueryVariables = Exact<{
  value?: InputMaybe<Scalars['String']>;
}>;


export type TestBoardTableKeysQuery = { __typename?: 'Query', keys?: Array<{ __typename?: 'Tag', label: string, value: string } | null> | null };

export type TestBoardTableQueryVariables = Exact<{
  samples: Array<InputMaybe<Scalars['ID']>>;
}>;


export type TestBoardTableQuery = { __typename?: 'Query', samples?: Array<{ __typename?: 'Sample', meta?: any | null, name: string, id: string, representations?: Array<{ __typename?: 'Representation', meta?: any | null, name?: string | null, derived?: Array<{ __typename?: 'Representation', name?: string | null, derived?: Array<{ __typename?: 'Representation', name?: string | null, metrics?: Array<{ __typename?: 'Metric', key: string, value?: any | null } | null> | null } | null> | null } | null> | null } | null> | null } | null> | null };

export type HcsLandingQueryVariables = Exact<{ [key: string]: never; }>;


export type HcsLandingQuery = { __typename?: 'Query', experiments?: Array<{ __typename?: 'Experiment', id: string, name: string, description?: string | null, createdAt: any, creator?: { __typename?: 'User', email: string } | null } | null> | null };

export type HcsSampleQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type HcsSampleQuery = { __typename?: 'Query', sample?: { __typename?: 'Sample', name: string, meta?: any | null, representations?: Array<{ __typename?: 'Representation', meta?: any | null, id: string, name?: string | null, latestThumbnail?: { __typename?: 'Thumbnail', id: string, image?: string | null } | null } | null> | null } | null };

export type HcsSampleMetricsQueryVariables = Exact<{
  sampleid: Scalars['ID'];
  keys?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  order?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
}>;


export type HcsSampleMetricsQuery = { __typename?: 'Query', metrics?: Array<{ __typename?: 'Metric', key: string, value?: any | null, representation?: { __typename?: 'Representation', id: string, meta?: any | null } | null } | null> | null };

export type DetailStageQueryVariables = Exact<{
  id: Scalars['ID'];
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
}>;


export type DetailStageQuery = { __typename?: 'Query', stage?: { __typename?: 'Stage', id: string, kind?: AcquisitionKind | null, name: string, createdAt: any, pinned?: boolean | null, tags?: Array<string | null> | null, positions?: Array<{ __typename?: 'Position', id: string, x: number, y: number, z: number, name: string, omeros?: Array<{ __typename?: 'Omero', acquisitionDate?: any | null, physicalSize?: { __typename?: 'PhysicalSize', x?: number | null, y?: number | null, z?: number | null } | null, representation: { __typename?: 'Representation', id: string, shape?: Array<number> | null } } | null> | null } | null> | null, instrument?: { __typename?: 'Instrument', id: string, name: string } | null, creator?: { __typename?: 'User', id: string, sub?: string | null } | null } | null };

export type MyStagesQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
}>;


export type MyStagesQuery = { __typename?: 'Query', mystages?: Array<{ __typename?: 'Stage', id: string, tags?: Array<string | null> | null, name: string, createdAt: any, kind?: AcquisitionKind | null, instrument?: { __typename?: 'Instrument', id: string, name: string } | null } | null> | null };

export type SearchableStagesQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
}>;


export type SearchableStagesQuery = { __typename?: 'Query', mystages?: Array<{ __typename?: 'Stage', id: string, tags?: Array<string | null> | null, name: string, createdAt: any, kind?: AcquisitionKind | null, instrument?: { __typename?: 'Instrument', id: string, name: string } | null } | null> | null };

export type StageSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
  values?: InputMaybe<Array<Scalars['ID']>>;
}>;


export type StageSearchQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Stage', value: string, label: string } | null> | null };

export type DetailTableQueryVariables = Exact<{
  id: Scalars['ID'];
  only?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  query?: InputMaybe<Scalars['String']>;
}>;


export type DetailTableQuery = { __typename?: 'Query', table?: { __typename?: 'Table', query?: Array<any | null> | null, id: string, name: string, columns?: Array<{ __typename?: 'Column', name?: string | null, fieldName: string, pandasType?: PandasDType | null, numpyType?: string | null, metadata?: any | null } | null> | null, repOrigins?: Array<{ __typename?: 'Representation', id: string, name?: string | null } | null> | null, sample?: { __typename?: 'Sample', id: string } | null, experiment?: { __typename?: 'Experiment', id: string } | null, graphs: Array<{ __typename?: 'Graph', id: string, name: string, image?: string | null, usedColumns?: any | null, tables: Array<{ __typename?: 'Table', id: string, name: string }> }> } | null };

export type MyTablesQueryVariables = Exact<{
  createdDay?: InputMaybe<Scalars['DateTime']>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
}>;


export type MyTablesQuery = { __typename?: 'Query', mytables?: Array<{ __typename?: 'Table', id: string, name: string, columns?: Array<{ __typename?: 'Column', name?: string | null, fieldName: string, pandasType?: PandasDType | null, numpyType?: string | null, metadata?: any | null } | null> | null, repOrigins?: Array<{ __typename?: 'Representation', id: string } | null> | null, sample?: { __typename?: 'Sample', id: string } | null, experiment?: { __typename?: 'Experiment', id: string } | null } | null> | null };

export type TagSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
  values?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
}>;


export type TagSearchQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Tag', value: string, label: string } | null> | null };

export type DetailThumbnailQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailThumbnailQuery = { __typename?: 'Query', thumbnail?: { __typename?: 'Thumbnail', id: string, image?: string | null, blurhash?: string | null, representation: { __typename?: 'Representation', id: string, name?: string | null } } | null };

export type ThumbnailsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
}>;


export type ThumbnailsQuery = { __typename?: 'Query', thumbnails?: Array<{ __typename?: 'Thumbnail', id: string, image?: string | null, blurhash?: string | null, representation: { __typename?: 'Representation', id: string, name?: string | null } } | null> | null };

export type DetailTimepointQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailTimepointQuery = { __typename?: 'Query', timepoint?: { __typename?: 'Timepoint', name?: string | null, id: string, deltaT?: number | null, era: { __typename?: 'Era', id: string, name: string }, omeros?: Array<{ __typename?: 'Omero', id: string, representation: { __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } } | null> | null, views: Array<{ __typename?: 'View', id: string, accessors?: Array<string | null> | null, omero: { __typename?: 'Omero', id: string, representation: { __typename?: 'Representation', id: string, name?: string | null, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null } | null } } }> } | null };

export type MyTimepointsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
}>;


export type MyTimepointsQuery = { __typename?: 'Query', mytimepoints?: Array<{ __typename?: 'Timepoint', id: string, name?: string | null, deltaT?: number | null, omeros?: Array<{ __typename?: 'Omero', id: string, representation: { __typename?: 'Representation', id: string, name?: string | null } } | null> | null } | null> | null };

export type TimepointSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type TimepointSearchQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Timepoint', value: string, label?: string | null } | null> | null };

export type UserOptionsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type UserOptionsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'User', value: string, label: string } | null> | null };

export type MikroUserQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type MikroUserQuery = { __typename?: 'Query', user?: { __typename?: 'User', sub?: string | null, id: string, firstName: string } | null };

export type DetailVideoQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailVideoQuery = { __typename?: 'Query', video?: { __typename?: 'Video', id: string, data?: string | null, frontImage?: string | null } | null };

export type VideosQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
}>;


export type VideosQuery = { __typename?: 'Query', videos?: Array<{ __typename?: 'Video', id: string, data?: string | null, frontImage?: string | null } | null> | null };

export type ActivesViewForRepresentationQueryVariables = Exact<{
  representation: Scalars['ID'];
  z?: InputMaybe<Scalars['Float']>;
  t?: InputMaybe<Scalars['Float']>;
  c?: InputMaybe<Scalars['Float']>;
  x?: InputMaybe<Scalars['Float']>;
  y?: InputMaybe<Scalars['Float']>;
}>;


export type ActivesViewForRepresentationQuery = { __typename?: 'Query', views?: Array<{ __typename?: 'View', id: string, timepoint?: { __typename?: 'Timepoint', id: string, name?: string | null } | null, position?: { __typename?: 'Position', id: string, name: string } | null, channel?: { __typename?: 'Channel', id: string, name: string } | null } | null> | null };

export type MyExperimentsEventSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type MyExperimentsEventSubscription = { __typename?: 'Subscription', myExperiments?: { __typename?: 'ExperimentsEvent', deleted?: string | null, create?: { __typename?: 'Experiment', id: string, name: string, description?: string | null } | null, update?: { __typename?: 'Experiment', id: string, name: string, description?: string | null } | null } | null };

export type WatchMentionsSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type WatchMentionsSubscription = { __typename?: 'Subscription', mymentions?: { __typename?: 'MentionEvent', create?: { __typename?: 'Comment', id: string, createdAt: any, resolved?: any | null, objectId: number, contentType?: CommentableModels | null, user: { __typename?: 'User', id: string, sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', id: string, sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null, mentions: Array<{ __typename?: 'User', id: string, sub?: string | null }>, resolvedBy?: { __typename?: 'User', sub?: string | null } | null } | null, update?: { __typename?: 'Comment', id: string, createdAt: any, resolved?: any | null, objectId: number, contentType?: CommentableModels | null, user: { __typename?: 'User', id: string, sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', id: string, sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', id: string, sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null, mentions: Array<{ __typename?: 'User', id: string, sub?: string | null }>, resolvedBy?: { __typename?: 'User', sub?: string | null } | null } | null } | null };

export type MyRepresentationsEventSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type MyRepresentationsEventSubscription = { __typename?: 'Subscription', myRepresentations?: { __typename?: 'RepresentationEvent', deleted?: string | null, create?: { __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null, update?: { __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null } | null };

export type MyRepresentationsOriginSubscriptionVariables = Exact<{
  origin: Scalars['ID'];
}>;


export type MyRepresentationsOriginSubscription = { __typename?: 'Subscription', myRepresentations?: { __typename?: 'RepresentationEvent', deleted?: string | null, create?: { __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null, update?: { __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, createdWhile?: string | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null, blurhash?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null } | null };

export type WatchRoisSubscriptionVariables = Exact<{
  representation: Scalars['ID'];
}>;


export type WatchRoisSubscription = { __typename?: 'Subscription', rois?: { __typename?: 'RoiEvent', delete?: string | null, update?: { __typename?: 'ROI', id: string, type: RoiType, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, label?: string | null, createdWhile?: string | null, creator: { __typename?: 'User', id: string, sub?: string | null }, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null, t?: number | null, c?: number | null } | null> | null } | null, create?: { __typename?: 'ROI', id: string, type: RoiType, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, label?: string | null, createdWhile?: string | null, creator: { __typename?: 'User', id: string, sub?: string | null }, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null, t?: number | null, c?: number | null } | null> | null } | null } | null };

export type MySamplesEventSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type MySamplesEventSubscription = { __typename?: 'Subscription', mySamples?: { __typename?: 'SamplesEvent', deleted?: string | null, create?: { __typename?: 'Sample', name: string, id: string, pinned?: boolean | null, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null, update?: { __typename?: 'Sample', name: string, id: string, pinned?: boolean | null, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null };

export type MyTablesEventSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type MyTablesEventSubscription = { __typename?: 'Subscription', myTables?: { __typename?: 'TablesEvent', deleted?: string | null, create?: { __typename?: 'Table', id: string, name: string, columns?: Array<{ __typename?: 'Column', name?: string | null, fieldName: string, pandasType?: PandasDType | null, numpyType?: string | null, metadata?: any | null } | null> | null, repOrigins?: Array<{ __typename?: 'Representation', id: string } | null> | null, sample?: { __typename?: 'Sample', id: string } | null, experiment?: { __typename?: 'Experiment', id: string } | null } | null, update?: { __typename?: 'Table', id: string, name: string, columns?: Array<{ __typename?: 'Column', name?: string | null, fieldName: string, pandasType?: PandasDType | null, numpyType?: string | null, metadata?: any | null } | null> | null, repOrigins?: Array<{ __typename?: 'Representation', id: string } | null> | null, sample?: { __typename?: 'Sample', id: string } | null, experiment?: { __typename?: 'Experiment', id: string } | null } | null } | null };

export const ChannelFragmentDoc = gql`
    fragment Channel on Channel {
  name
  id
  dimensionMaps {
    id
    omero {
      id
    }
  }
  emissionWavelength
  excitationWavelength
}
    `;
export const LeafFragmentDoc = gql`
    fragment Leaf on Leaf {
  typename: __typename
  bold
  italic
  code
  text
}
    `;
export const LevelDownDescendentFragmentDoc = gql`
    fragment LevelDownDescendent on Descendent {
  typename: __typename
  ...Leaf
}
    ${LeafFragmentDoc}`;
export const LevelDownParagraphFragmentDoc = gql`
    fragment LevelDownParagraph on ParagraphDescendent {
  size
  untypedChildren
}
    `;
export const LevelDownMentionFragmentDoc = gql`
    fragment LevelDownMention on MentionDescendent {
  user {
    id
    sub
  }
}
    `;
export const NodeFragmentDoc = gql`
    fragment Node on Node {
  typename: __typename
  children {
    typename: __typename
    ...Leaf
    ...LevelDownParagraph
    ...LevelDownMention
  }
}
    ${LeafFragmentDoc}
${LevelDownParagraphFragmentDoc}
${LevelDownMentionFragmentDoc}`;
export const MentionFragmentDoc = gql`
    fragment Mention on MentionDescendent {
  user {
    id
    sub
  }
  ...Node
}
    ${NodeFragmentDoc}`;
export const ParagraphFragmentDoc = gql`
    fragment Paragraph on ParagraphDescendent {
  size
  ...Node
}
    ${NodeFragmentDoc}`;
export const DescendentFragmentDoc = gql`
    fragment Descendent on Descendent {
  typename: __typename
  ...Mention
  ...Paragraph
  ...Leaf
}
    ${MentionFragmentDoc}
${ParagraphFragmentDoc}
${LeafFragmentDoc}`;
export const SubthreadCommentFragmentDoc = gql`
    fragment SubthreadComment on Comment {
  user {
    id
    sub
  }
  parent {
    id
  }
  createdAt
  descendents {
    ...Descendent
  }
}
    ${DescendentFragmentDoc}`;
export const ListCommentFragmentDoc = gql`
    fragment ListComment on Comment {
  user {
    id
    sub
  }
  parent {
    id
  }
  descendents {
    ...Descendent
  }
  resolved
  resolvedBy {
    sub
  }
  id
  createdAt
  children {
    ...SubthreadComment
  }
}
    ${DescendentFragmentDoc}
${SubthreadCommentFragmentDoc}`;
export const MentionCommentFragmentDoc = gql`
    fragment MentionComment on Comment {
  user {
    id
    sub
  }
  parent {
    id
  }
  descendents {
    ...Descendent
  }
  id
  createdAt
  children {
    ...SubthreadComment
  }
  mentions {
    id
    sub
  }
  resolved
  resolvedBy {
    sub
  }
  objectId
  contentType
}
    ${DescendentFragmentDoc}
${SubthreadCommentFragmentDoc}`;
export const DetailCommentFragmentDoc = gql`
    fragment DetailComment on Comment {
  user {
    id
    sub
  }
  parent {
    id
  }
  descendents {
    ...Descendent
  }
  id
  resolved
  resolvedBy {
    sub
  }
  createdAt
  children {
    ...SubthreadComment
  }
  mentions {
    id
    sub
  }
  objectId
  contentType
}
    ${DescendentFragmentDoc}
${SubthreadCommentFragmentDoc}`;
export const ListLinkFragmentDoc = gql`
    fragment ListLink on DataLink {
  id
  relation {
    id
    name
  }
  xId
  yId
  leftType
  rightType
}
    `;
export const DetailContextFragmentDoc = gql`
    fragment DetailContext on Context {
  id
  name
  createdAt
  links {
    ...ListLink
  }
  models {
    id
    name
  }
}
    ${ListLinkFragmentDoc}`;
export const ListDatasetFragmentDoc = gql`
    fragment ListDataset on Dataset {
  id
  name
}
    `;
export const DetailDatasetFragmentDoc = gql`
    fragment DetailDataset on Dataset {
  id
  name
  samples {
    id
    name
  }
  createdBy {
    id
    email
  }
  tags
  createdAt
  pinned
  pinnedBy {
    id
    email
  }
  omerofiles {
    id
    name
    file
  }
  representations {
    id
    name
  }
  children {
    ...ListDataset
  }
}
    ${ListDatasetFragmentDoc}`;
export const ListTimepointFragmentDoc = gql`
    fragment ListTimepoint on Timepoint {
  id
  name
  deltaT
  omeros {
    id
    representation {
      id
      name
    }
  }
}
    `;
export const EraFragmentDoc = gql`
    fragment Era on Era {
  name
  id
  timepoints(order: "delta_t") {
    ...ListTimepoint
  }
  start
  end
  tags
  pinned
}
    ${ListTimepointFragmentDoc}`;
export const ListEraFragmentDoc = gql`
    fragment ListEra on Era {
  id
  name
  start
  end
}
    `;
export const DetailExperimentFragmentDoc = gql`
    fragment DetailExperiment on Experiment {
  id
  name
  description
  samples {
    id
    name
  }
  tags
  createdAt
  creator {
    id
    email
  }
  pinned
  pinnedBy {
    id
    email
  }
  omeroFiles {
    id
    name
  }
}
    `;
export const DetailGraphFragmentDoc = gql`
    fragment DetailGraph on Graph {
  id
  name
  image
  usedColumns
  tables {
    id
    name
  }
}
    `;
export const InstrumentFragmentDoc = gql`
    fragment Instrument on Instrument {
  id
  name
  omeros(order: "-acquired", limit: 10) {
    acquisitionDate
    representation {
      id
      shape
      name
    }
  }
}
    `;
export const ListContextFragmentDoc = gql`
    fragment ListContext on Context {
  name
  id
}
    `;
export const DetailLinkFragmentDoc = gql`
    fragment DetailLink on DataLink {
  id
  context {
    ...ListContext
  }
  relation {
    id
    name
  }
  xId
  yId
  leftType
  rightType
}
    ${ListContextFragmentDoc}`;
export const DetailModelFragmentDoc = gql`
    fragment DetailModel on Model {
  id
  name
  contexts {
    id
    name
  }
  data
  kind
}
    `;
export const ListModelFragmentDoc = gql`
    fragment ListModel on Model {
  id
  name
  contexts {
    id
    name
  }
  data
  kind
}
    `;
export const ListRepresentationFragmentDoc = gql`
    fragment ListRepresentation on Representation {
  name
  id
  origins {
    name
  }
  latestThumbnail {
    image
    majorColor
    blurhash
  }
  sample {
    name
    experiments {
      name
    }
  }
  variety
  pinned
  createdWhile
}
    `;
export const ObjectiveFragmentDoc = gql`
    fragment Objective on Objective {
  id
  name
  magnification
  omeros(order: "-acquired", limit: 10) {
    acquisitionDate
    representation {
      ...ListRepresentation
    }
  }
}
    ${ListRepresentationFragmentDoc}`;
export const ListObjectiveFragmentDoc = gql`
    fragment ListObjective on Objective {
  id
  name
  magnification
}
    `;
export const DetailOmeroFragmentDoc = gql`
    fragment DetailOmero on Omero {
  representation {
    id
    name
  }
  id
  physicalSize {
    x
    y
    z
    t
  }
  planes {
    z
    z
    t
    exposureTime
    deltaT
  }
  channels {
    name
    emmissionWavelength
    excitationWavelength
    color
  }
  acquisitionDate
  objectiveSettings {
    correctionCollar
    medium
  }
  positions {
    id
    x
    y
    z
    stage {
      id
      name
    }
  }
  timepoints {
    id
    name
    deltaT
  }
  views {
    id
    xMin
    xMax
    yMin
    yMax
    zMin
    zMax
    tMin
    tMax
    cMin
    cMax
    channel {
      id
      name
      color
    }
    position {
      id
      name
      x
      y
      z
    }
    timepoint {
      id
      name
      deltaT
    }
  }
  dimensionMaps {
    id
    index
    dimension
    channel {
      id
      name
      color
      emissionWavelength
      excitationWavelength
    }
  }
  instrument {
    id
    name
    model
  }
  objective {
    id
    name
    magnification
  }
  affineTransformation
  imagingEnvironment {
    airPressure
    co2Percent
    humidity
    temperature
  }
  scale
}
    `;
export const ListExperimentFragmentDoc = gql`
    fragment ListExperiment on Experiment {
  id
  name
  description
}
    `;
export const DetailOmeroFileFragmentDoc = gql`
    fragment DetailOmeroFile on OmeroFile {
  id
  name
  type
  createdAt
  file
  tags
  derivedRepresentations {
    ...ListRepresentation
  }
  experiments {
    ...ListExperiment
  }
  createdWhile
}
    ${ListRepresentationFragmentDoc}
${ListExperimentFragmentDoc}`;
export const ListOmeroFileFragmentDoc = gql`
    fragment ListOmeroFile on OmeroFile {
  id
  name
  type
  createdAt
  file
}
    `;
export const UserAssignmentFragmentDoc = gql`
    fragment UserAssignment on UserAssignment {
  user {
    sub
    username
    email
  }
  permissions
}
    `;
export const GroupAssignmentFragmentDoc = gql`
    fragment GroupAssignment on GroupAssignment {
  group {
    name
  }
  permissions
}
    `;
export const PlotFragmentDoc = gql`
    fragment Plot on Plot {
  id
  query
  name
  description
  createdAt
  updatedAt
  creator {
    username
  }
}
    `;
export const ListPlotFragmentDoc = gql`
    fragment ListPlot on Plot {
  id
  name
  creator {
    username
  }
}
    `;
export const ListInstrumentFragmentDoc = gql`
    fragment ListInstrument on Instrument {
  id
  name
}
    `;
export const StageFragmentDoc = gql`
    fragment Stage on Stage {
  id
  kind
  name
  createdAt
  instrument {
    ...ListInstrument
  }
  creator {
    id
    sub
  }
  pinned
  tags
}
    ${ListInstrumentFragmentDoc}`;
export const RepRoiFragmentDoc = gql`
    fragment RepRoi on ROI {
  id
  type
  createdAt
  creator {
    id
    sub
  }
  vectors {
    x
    y
    z
    t
    c
  }
  tags
  pinned
  label
  createdWhile
}
    `;
export const PositionFragmentDoc = gql`
    fragment Position on Position {
  id
  name
  stage {
    ...Stage
  }
  x
  y
  z
  omeros {
    acquisitionDate
    representation {
      ...ListRepresentation
    }
  }
  roiOrigins {
    ...RepRoi
  }
}
    ${StageFragmentDoc}
${ListRepresentationFragmentDoc}
${RepRoiFragmentDoc}`;
export const DetailRelationFragmentDoc = gql`
    fragment DetailRelation on Relation {
  name
  description
  id
}
    `;
export const ListRelationFragmentDoc = gql`
    fragment ListRelation on Relation {
  name
  description
  id
}
    `;
export const ListSharedRepresentationFragmentDoc = gql`
    fragment ListSharedRepresentation on Representation {
  name
  id
  origins {
    name
  }
  latestThumbnail {
    image
    blurhash
  }
  sample {
    name
    experiments {
      name
    }
  }
  variety
  creator {
    email
  }
  createdWhile
}
    `;
export const OmeroFragmentDoc = gql`
    fragment Omero on Omero {
  id
  physicalSize {
    x
    y
    z
    t
  }
  planes {
    z
    z
    t
    exposureTime
    deltaT
  }
  channels {
    name
    emmissionWavelength
    excitationWavelength
    color
  }
  acquisitionDate
  objectiveSettings {
    correctionCollar
    medium
  }
  positions {
    id
    x
    y
    z
    stage {
      id
      name
    }
  }
  views {
    id
    xMin
    xMax
    yMin
    yMax
    zMin
    zMax
    tMin
    tMax
    cMin
    cMax
    channel {
      id
      name
      color
    }
    position {
      id
      name
      x
    }
  }
  dimensionMaps {
    id
    index
    dimension
    channel {
      id
      name
      color
      emissionWavelength
      excitationWavelength
    }
  }
  instrument {
    id
    name
    model
  }
  objective {
    id
    name
    magnification
  }
  timepoints {
    id
    deltaT
    era {
      id
      name
    }
  }
  affineTransformation
  imagingEnvironment {
    airPressure
    co2Percent
    humidity
    temperature
  }
  scale
}
    `;
export const CanvasRepresentationFragmentDoc = gql`
    fragment CanvasRepresentation on Representation {
  id
  shape
  store
  name
  variety
  rois {
    ...RepRoi
  }
  omero {
    ...Omero
  }
}
    ${RepRoiFragmentDoc}
${OmeroFragmentDoc}`;
export const ThumbnailFragmentDoc = gql`
    fragment Thumbnail on Thumbnail {
  id
  representation {
    id
    name
  }
  image
  blurhash
}
    `;
export const VideoFragmentDoc = gql`
    fragment Video on Video {
  id
  data
  frontImage
}
    `;
export const DetailRepresentationFragmentDoc = gql`
    fragment DetailRepresentation on Representation {
  ...CanvasRepresentation
  id
  name
  shape
  dims
  tags
  store
  createdAt
  variety
  renders {
    ... on Thumbnail {
      ...Thumbnail
    }
    ... on Video {
      ...Video
    }
  }
  latestThumbnail {
    image
    majorColor
    blurhash
  }
  datasets {
    id
    name
  }
  sample {
    id
    name
  }
  metrics {
    id
    key
    value
    comments {
      user {
        sub
      }
    }
  }
  omero {
    ...Omero
  }
  origins {
    id
    name
    tags
    latestThumbnail {
      image
      blurhash
    }
  }
  derived {
    id
    name
    tags
    latestThumbnail {
      image
      blurhash
    }
  }
  createdWhile
  tables {
    id
    name
  }
  fileOrigins {
    id
    name
    type
  }
  tableOrigins {
    id
    name
  }
  roiOrigins {
    id
    label
    type
  }
  creator {
    id
    email
  }
  pinnedBy {
    id
    email
  }
  pinned
}
    ${CanvasRepresentationFragmentDoc}
${ThumbnailFragmentDoc}
${VideoFragmentDoc}
${OmeroFragmentDoc}`;
export const ListPositionFragmentDoc = gql`
    fragment ListPosition on Position {
  id
  x
  y
  z
  name
  omeros(limit: 1) {
    acquisitionDate
    physicalSize {
      x
      y
      z
    }
    representation {
      id
      shape
    }
  }
}
    `;
export const DetailRoiFragmentDoc = gql`
    fragment DetailRoi on ROI {
  id
  type
  label
  creator {
    id
  }
  tags
  representation {
    ...CanvasRepresentation
  }
  derivedRepresentations {
    ...ListRepresentation
  }
  derivedPositions {
    ...ListPosition
  }
  createdAt
  vectors {
    x
    y
    z
  }
  pinned
  pinnedBy {
    id
    email
  }
  createdWhile
}
    ${CanvasRepresentationFragmentDoc}
${ListRepresentationFragmentDoc}
${ListPositionFragmentDoc}`;
export const DetailSampleFragmentDoc = gql`
    fragment DetailSample on Sample {
  name
  id
  createdAt
  experiments {
    id
    name
  }
  representations {
    ...ListRepresentation
  }
  tags
  creator {
    id
    email
  }
  pinned
  pinnedBy {
    id
    email
  }
}
    ${ListRepresentationFragmentDoc}`;
export const ListSampleFragmentDoc = gql`
    fragment ListSample on Sample {
  name
  id
  experiments {
    name
  }
  pinned
}
    `;
export const ListStageFragmentDoc = gql`
    fragment ListStage on Stage {
  id
  instrument {
    ...ListInstrument
  }
  tags
  name
  createdAt
  kind
}
    ${ListInstrumentFragmentDoc}`;
export const ListGraphFragmentDoc = gql`
    fragment ListGraph on Graph {
  id
  name
  image
  usedColumns
  tables {
    id
    name
  }
}
    `;
export const DetailTableFragmentDoc = gql`
    fragment DetailTable on Table {
  id
  name
  repOrigins {
    id
    name
  }
  sample {
    id
  }
  experiment {
    id
  }
  graphs {
    ...ListGraph
  }
}
    ${ListGraphFragmentDoc}`;
export const ColumnFragmentDoc = gql`
    fragment Column on Column {
  name
  fieldName
  pandasType
  numpyType
  metadata
}
    `;
export const ListTableFragmentDoc = gql`
    fragment ListTable on Table {
  id
  name
  columns {
    ...Column
  }
  repOrigins {
    id
  }
  sample {
    id
  }
  experiment {
    id
  }
}
    ${ColumnFragmentDoc}`;
export const ListThumbnailFragmentDoc = gql`
    fragment ListThumbnail on Thumbnail {
  id
  representation {
    id
    name
  }
  image
  blurhash
}
    `;
export const ListViewFragmentDoc = gql`
    fragment ListView on View {
  id
  accessors
  omero {
    id
    representation {
      id
      name
      latestThumbnail {
        image
      }
    }
  }
}
    `;
export const TimepointFragmentDoc = gql`
    fragment Timepoint on Timepoint {
  name
  id
  deltaT
  era {
    id
    name
  }
  omeros {
    id
    representation {
      ...ListRepresentation
    }
  }
  views {
    ...ListView
  }
}
    ${ListRepresentationFragmentDoc}
${ListViewFragmentDoc}`;
export const ListVideoFragmentDoc = gql`
    fragment ListVideo on Video {
  id
  data
  frontImage
}
    `;
export const CreateCommentDocument = gql`
    mutation CreateComment($id: ID!, $model: CommentableModels!, $descendents: [DescendendInput]!, $parent: ID) {
  createComment(
    object: $id
    type: $model
    descendents: $descendents
    parent: $parent
  ) {
    ...ListComment
  }
}
    ${ListCommentFragmentDoc}`;
export type CreateCommentMutationFn = Apollo.MutationFunction<CreateCommentMutation, CreateCommentMutationVariables>;

/**
 * __useCreateCommentMutation__
 *
 * To run a mutation, you first call `useCreateCommentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateCommentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createCommentMutation, { data, loading, error }] = useCreateCommentMutation({
 *   variables: {
 *      id: // value for 'id'
 *      model: // value for 'model'
 *      descendents: // value for 'descendents'
 *      parent: // value for 'parent'
 *   },
 * });
 */
export function useCreateCommentMutation(baseOptions?: Apollo.MutationHookOptions<CreateCommentMutation, CreateCommentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateCommentMutation, CreateCommentMutationVariables>(CreateCommentDocument, options);
      }
export type CreateCommentMutationHookResult = ReturnType<typeof useCreateCommentMutation>;
export type CreateCommentMutationResult = Apollo.MutationResult<CreateCommentMutation>;
export type CreateCommentMutationOptions = Apollo.BaseMutationOptions<CreateCommentMutation, CreateCommentMutationVariables>;
export const ReplyToDocument = gql`
    mutation ReplyTo($descendents: [DescendendInput]!, $parent: ID!) {
  replyTo(descendents: $descendents, parent: $parent) {
    ...ListComment
  }
}
    ${ListCommentFragmentDoc}`;
export type ReplyToMutationFn = Apollo.MutationFunction<ReplyToMutation, ReplyToMutationVariables>;

/**
 * __useReplyToMutation__
 *
 * To run a mutation, you first call `useReplyToMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReplyToMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [replyToMutation, { data, loading, error }] = useReplyToMutation({
 *   variables: {
 *      descendents: // value for 'descendents'
 *      parent: // value for 'parent'
 *   },
 * });
 */
export function useReplyToMutation(baseOptions?: Apollo.MutationHookOptions<ReplyToMutation, ReplyToMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReplyToMutation, ReplyToMutationVariables>(ReplyToDocument, options);
      }
export type ReplyToMutationHookResult = ReturnType<typeof useReplyToMutation>;
export type ReplyToMutationResult = Apollo.MutationResult<ReplyToMutation>;
export type ReplyToMutationOptions = Apollo.BaseMutationOptions<ReplyToMutation, ReplyToMutationVariables>;
export const ResolveCommentDocument = gql`
    mutation ResolveComment($id: ID!) {
  resolveComment(id: $id) {
    ...ListComment
  }
}
    ${ListCommentFragmentDoc}`;
export type ResolveCommentMutationFn = Apollo.MutationFunction<ResolveCommentMutation, ResolveCommentMutationVariables>;

/**
 * __useResolveCommentMutation__
 *
 * To run a mutation, you first call `useResolveCommentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResolveCommentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resolveCommentMutation, { data, loading, error }] = useResolveCommentMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useResolveCommentMutation(baseOptions?: Apollo.MutationHookOptions<ResolveCommentMutation, ResolveCommentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ResolveCommentMutation, ResolveCommentMutationVariables>(ResolveCommentDocument, options);
      }
export type ResolveCommentMutationHookResult = ReturnType<typeof useResolveCommentMutation>;
export type ResolveCommentMutationResult = Apollo.MutationResult<ResolveCommentMutation>;
export type ResolveCommentMutationOptions = Apollo.BaseMutationOptions<ResolveCommentMutation, ResolveCommentMutationVariables>;
export const CreateContextDocument = gql`
    mutation CreateContext($name: String!) {
  createContext(name: $name) {
    ...DetailContext
  }
}
    ${DetailContextFragmentDoc}`;
export type CreateContextMutationFn = Apollo.MutationFunction<CreateContextMutation, CreateContextMutationVariables>;

/**
 * __useCreateContextMutation__
 *
 * To run a mutation, you first call `useCreateContextMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateContextMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createContextMutation, { data, loading, error }] = useCreateContextMutation({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useCreateContextMutation(baseOptions?: Apollo.MutationHookOptions<CreateContextMutation, CreateContextMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateContextMutation, CreateContextMutationVariables>(CreateContextDocument, options);
      }
export type CreateContextMutationHookResult = ReturnType<typeof useCreateContextMutation>;
export type CreateContextMutationResult = Apollo.MutationResult<CreateContextMutation>;
export type CreateContextMutationOptions = Apollo.BaseMutationOptions<CreateContextMutation, CreateContextMutationVariables>;
export const DeleteContextDocument = gql`
    mutation DeleteContext($id: ID!) {
  deleteContext(id: $id) {
    id
  }
}
    `;
export type DeleteContextMutationFn = Apollo.MutationFunction<DeleteContextMutation, DeleteContextMutationVariables>;

/**
 * __useDeleteContextMutation__
 *
 * To run a mutation, you first call `useDeleteContextMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteContextMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteContextMutation, { data, loading, error }] = useDeleteContextMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteContextMutation(baseOptions?: Apollo.MutationHookOptions<DeleteContextMutation, DeleteContextMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteContextMutation, DeleteContextMutationVariables>(DeleteContextDocument, options);
      }
export type DeleteContextMutationHookResult = ReturnType<typeof useDeleteContextMutation>;
export type DeleteContextMutationResult = Apollo.MutationResult<DeleteContextMutation>;
export type DeleteContextMutationOptions = Apollo.BaseMutationOptions<DeleteContextMutation, DeleteContextMutationVariables>;
export const CreateDatasetDocument = gql`
    mutation CreateDataset($name: String!) {
  createDataset(name: $name) {
    ...DetailDataset
  }
}
    ${DetailDatasetFragmentDoc}`;
export type CreateDatasetMutationFn = Apollo.MutationFunction<CreateDatasetMutation, CreateDatasetMutationVariables>;

/**
 * __useCreateDatasetMutation__
 *
 * To run a mutation, you first call `useCreateDatasetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateDatasetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createDatasetMutation, { data, loading, error }] = useCreateDatasetMutation({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useCreateDatasetMutation(baseOptions?: Apollo.MutationHookOptions<CreateDatasetMutation, CreateDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateDatasetMutation, CreateDatasetMutationVariables>(CreateDatasetDocument, options);
      }
export type CreateDatasetMutationHookResult = ReturnType<typeof useCreateDatasetMutation>;
export type CreateDatasetMutationResult = Apollo.MutationResult<CreateDatasetMutation>;
export type CreateDatasetMutationOptions = Apollo.BaseMutationOptions<CreateDatasetMutation, CreateDatasetMutationVariables>;
export const DeleteDatasetDocument = gql`
    mutation DeleteDataset($id: ID!) {
  deleteDataset(id: $id) {
    id
  }
}
    `;
export type DeleteDatasetMutationFn = Apollo.MutationFunction<DeleteDatasetMutation, DeleteDatasetMutationVariables>;

/**
 * __useDeleteDatasetMutation__
 *
 * To run a mutation, you first call `useDeleteDatasetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteDatasetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteDatasetMutation, { data, loading, error }] = useDeleteDatasetMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteDatasetMutation(baseOptions?: Apollo.MutationHookOptions<DeleteDatasetMutation, DeleteDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteDatasetMutation, DeleteDatasetMutationVariables>(DeleteDatasetDocument, options);
      }
export type DeleteDatasetMutationHookResult = ReturnType<typeof useDeleteDatasetMutation>;
export type DeleteDatasetMutationResult = Apollo.MutationResult<DeleteDatasetMutation>;
export type DeleteDatasetMutationOptions = Apollo.BaseMutationOptions<DeleteDatasetMutation, DeleteDatasetMutationVariables>;
export const UpdateDatasetDocument = gql`
    mutation UpdateDataset($id: ID!, $parent: ID, $tags: [String], $name: String!) {
  updateDataset(id: $id, parent: $parent, tags: $tags, name: $name) {
    ...DetailDataset
  }
}
    ${DetailDatasetFragmentDoc}`;
export type UpdateDatasetMutationFn = Apollo.MutationFunction<UpdateDatasetMutation, UpdateDatasetMutationVariables>;

/**
 * __useUpdateDatasetMutation__
 *
 * To run a mutation, you first call `useUpdateDatasetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateDatasetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateDatasetMutation, { data, loading, error }] = useUpdateDatasetMutation({
 *   variables: {
 *      id: // value for 'id'
 *      parent: // value for 'parent'
 *      tags: // value for 'tags'
 *      name: // value for 'name'
 *   },
 * });
 */
export function useUpdateDatasetMutation(baseOptions?: Apollo.MutationHookOptions<UpdateDatasetMutation, UpdateDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateDatasetMutation, UpdateDatasetMutationVariables>(UpdateDatasetDocument, options);
      }
export type UpdateDatasetMutationHookResult = ReturnType<typeof useUpdateDatasetMutation>;
export type UpdateDatasetMutationResult = Apollo.MutationResult<UpdateDatasetMutation>;
export type UpdateDatasetMutationOptions = Apollo.BaseMutationOptions<UpdateDatasetMutation, UpdateDatasetMutationVariables>;
export const PinDatasetDocument = gql`
    mutation PinDataset($id: ID!, $pin: Boolean!) {
  pinDataset(id: $id, pin: $pin) {
    id
    pinnedBy {
      id
      email
    }
    pinned
  }
}
    `;
export type PinDatasetMutationFn = Apollo.MutationFunction<PinDatasetMutation, PinDatasetMutationVariables>;

/**
 * __usePinDatasetMutation__
 *
 * To run a mutation, you first call `usePinDatasetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePinDatasetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pinDatasetMutation, { data, loading, error }] = usePinDatasetMutation({
 *   variables: {
 *      id: // value for 'id'
 *      pin: // value for 'pin'
 *   },
 * });
 */
export function usePinDatasetMutation(baseOptions?: Apollo.MutationHookOptions<PinDatasetMutation, PinDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PinDatasetMutation, PinDatasetMutationVariables>(PinDatasetDocument, options);
      }
export type PinDatasetMutationHookResult = ReturnType<typeof usePinDatasetMutation>;
export type PinDatasetMutationResult = Apollo.MutationResult<PinDatasetMutation>;
export type PinDatasetMutationOptions = Apollo.BaseMutationOptions<PinDatasetMutation, PinDatasetMutationVariables>;
export const PutSamplesDocument = gql`
    mutation PutSamples($dataset: ID!, $samples: [ID!]!) {
  putSamples(dataset: $dataset, samples: $samples) {
    ...DetailDataset
  }
}
    ${DetailDatasetFragmentDoc}`;
export type PutSamplesMutationFn = Apollo.MutationFunction<PutSamplesMutation, PutSamplesMutationVariables>;

/**
 * __usePutSamplesMutation__
 *
 * To run a mutation, you first call `usePutSamplesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePutSamplesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [putSamplesMutation, { data, loading, error }] = usePutSamplesMutation({
 *   variables: {
 *      dataset: // value for 'dataset'
 *      samples: // value for 'samples'
 *   },
 * });
 */
export function usePutSamplesMutation(baseOptions?: Apollo.MutationHookOptions<PutSamplesMutation, PutSamplesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PutSamplesMutation, PutSamplesMutationVariables>(PutSamplesDocument, options);
      }
export type PutSamplesMutationHookResult = ReturnType<typeof usePutSamplesMutation>;
export type PutSamplesMutationResult = Apollo.MutationResult<PutSamplesMutation>;
export type PutSamplesMutationOptions = Apollo.BaseMutationOptions<PutSamplesMutation, PutSamplesMutationVariables>;
export const ReleaseFilesDocument = gql`
    mutation ReleaseFiles($dataset: ID!, $files: [ID!]!) {
  releaseFiles(dataset: $dataset, files: $files) {
    ...DetailDataset
  }
}
    ${DetailDatasetFragmentDoc}`;
export type ReleaseFilesMutationFn = Apollo.MutationFunction<ReleaseFilesMutation, ReleaseFilesMutationVariables>;

/**
 * __useReleaseFilesMutation__
 *
 * To run a mutation, you first call `useReleaseFilesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReleaseFilesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [releaseFilesMutation, { data, loading, error }] = useReleaseFilesMutation({
 *   variables: {
 *      dataset: // value for 'dataset'
 *      files: // value for 'files'
 *   },
 * });
 */
export function useReleaseFilesMutation(baseOptions?: Apollo.MutationHookOptions<ReleaseFilesMutation, ReleaseFilesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReleaseFilesMutation, ReleaseFilesMutationVariables>(ReleaseFilesDocument, options);
      }
export type ReleaseFilesMutationHookResult = ReturnType<typeof useReleaseFilesMutation>;
export type ReleaseFilesMutationResult = Apollo.MutationResult<ReleaseFilesMutation>;
export type ReleaseFilesMutationOptions = Apollo.BaseMutationOptions<ReleaseFilesMutation, ReleaseFilesMutationVariables>;
export const PutDatasetsDocument = gql`
    mutation PutDatasets($dataset: ID!, $datasets: [ID!]!) {
  putDatasets(dataset: $dataset, datasets: $datasets) {
    ...DetailDataset
  }
}
    ${DetailDatasetFragmentDoc}`;
export type PutDatasetsMutationFn = Apollo.MutationFunction<PutDatasetsMutation, PutDatasetsMutationVariables>;

/**
 * __usePutDatasetsMutation__
 *
 * To run a mutation, you first call `usePutDatasetsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePutDatasetsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [putDatasetsMutation, { data, loading, error }] = usePutDatasetsMutation({
 *   variables: {
 *      dataset: // value for 'dataset'
 *      datasets: // value for 'datasets'
 *   },
 * });
 */
export function usePutDatasetsMutation(baseOptions?: Apollo.MutationHookOptions<PutDatasetsMutation, PutDatasetsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PutDatasetsMutation, PutDatasetsMutationVariables>(PutDatasetsDocument, options);
      }
export type PutDatasetsMutationHookResult = ReturnType<typeof usePutDatasetsMutation>;
export type PutDatasetsMutationResult = Apollo.MutationResult<PutDatasetsMutation>;
export type PutDatasetsMutationOptions = Apollo.BaseMutationOptions<PutDatasetsMutation, PutDatasetsMutationVariables>;
export const ReleaseDatasetsDocument = gql`
    mutation ReleaseDatasets($dataset: ID!, $datasets: [ID!]!) {
  releaseDatasets(dataset: $dataset, datasets: $datasets) {
    ...DetailDataset
  }
}
    ${DetailDatasetFragmentDoc}`;
export type ReleaseDatasetsMutationFn = Apollo.MutationFunction<ReleaseDatasetsMutation, ReleaseDatasetsMutationVariables>;

/**
 * __useReleaseDatasetsMutation__
 *
 * To run a mutation, you first call `useReleaseDatasetsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReleaseDatasetsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [releaseDatasetsMutation, { data, loading, error }] = useReleaseDatasetsMutation({
 *   variables: {
 *      dataset: // value for 'dataset'
 *      datasets: // value for 'datasets'
 *   },
 * });
 */
export function useReleaseDatasetsMutation(baseOptions?: Apollo.MutationHookOptions<ReleaseDatasetsMutation, ReleaseDatasetsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReleaseDatasetsMutation, ReleaseDatasetsMutationVariables>(ReleaseDatasetsDocument, options);
      }
export type ReleaseDatasetsMutationHookResult = ReturnType<typeof useReleaseDatasetsMutation>;
export type ReleaseDatasetsMutationResult = Apollo.MutationResult<ReleaseDatasetsMutation>;
export type ReleaseDatasetsMutationOptions = Apollo.BaseMutationOptions<ReleaseDatasetsMutation, ReleaseDatasetsMutationVariables>;
export const PutRepresentationsDocument = gql`
    mutation PutRepresentations($dataset: ID!, $representations: [ID!]!) {
  putRepresentations(dataset: $dataset, representations: $representations) {
    ...DetailDataset
  }
}
    ${DetailDatasetFragmentDoc}`;
export type PutRepresentationsMutationFn = Apollo.MutationFunction<PutRepresentationsMutation, PutRepresentationsMutationVariables>;

/**
 * __usePutRepresentationsMutation__
 *
 * To run a mutation, you first call `usePutRepresentationsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePutRepresentationsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [putRepresentationsMutation, { data, loading, error }] = usePutRepresentationsMutation({
 *   variables: {
 *      dataset: // value for 'dataset'
 *      representations: // value for 'representations'
 *   },
 * });
 */
export function usePutRepresentationsMutation(baseOptions?: Apollo.MutationHookOptions<PutRepresentationsMutation, PutRepresentationsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PutRepresentationsMutation, PutRepresentationsMutationVariables>(PutRepresentationsDocument, options);
      }
export type PutRepresentationsMutationHookResult = ReturnType<typeof usePutRepresentationsMutation>;
export type PutRepresentationsMutationResult = Apollo.MutationResult<PutRepresentationsMutation>;
export type PutRepresentationsMutationOptions = Apollo.BaseMutationOptions<PutRepresentationsMutation, PutRepresentationsMutationVariables>;
export const ReleaseRepresentationsDocument = gql`
    mutation ReleaseRepresentations($dataset: ID!, $representations: [ID!]!) {
  releaseRepresentations(dataset: $dataset, representations: $representations) {
    ...DetailDataset
  }
}
    ${DetailDatasetFragmentDoc}`;
export type ReleaseRepresentationsMutationFn = Apollo.MutationFunction<ReleaseRepresentationsMutation, ReleaseRepresentationsMutationVariables>;

/**
 * __useReleaseRepresentationsMutation__
 *
 * To run a mutation, you first call `useReleaseRepresentationsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReleaseRepresentationsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [releaseRepresentationsMutation, { data, loading, error }] = useReleaseRepresentationsMutation({
 *   variables: {
 *      dataset: // value for 'dataset'
 *      representations: // value for 'representations'
 *   },
 * });
 */
export function useReleaseRepresentationsMutation(baseOptions?: Apollo.MutationHookOptions<ReleaseRepresentationsMutation, ReleaseRepresentationsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReleaseRepresentationsMutation, ReleaseRepresentationsMutationVariables>(ReleaseRepresentationsDocument, options);
      }
export type ReleaseRepresentationsMutationHookResult = ReturnType<typeof useReleaseRepresentationsMutation>;
export type ReleaseRepresentationsMutationResult = Apollo.MutationResult<ReleaseRepresentationsMutation>;
export type ReleaseRepresentationsMutationOptions = Apollo.BaseMutationOptions<ReleaseRepresentationsMutation, ReleaseRepresentationsMutationVariables>;
export const ReleaseSamplesDocument = gql`
    mutation ReleaseSamples($dataset: ID!, $samples: [ID!]!) {
  releaseSamples(dataset: $dataset, samples: $samples) {
    ...DetailDataset
  }
}
    ${DetailDatasetFragmentDoc}`;
export type ReleaseSamplesMutationFn = Apollo.MutationFunction<ReleaseSamplesMutation, ReleaseSamplesMutationVariables>;

/**
 * __useReleaseSamplesMutation__
 *
 * To run a mutation, you first call `useReleaseSamplesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReleaseSamplesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [releaseSamplesMutation, { data, loading, error }] = useReleaseSamplesMutation({
 *   variables: {
 *      dataset: // value for 'dataset'
 *      samples: // value for 'samples'
 *   },
 * });
 */
export function useReleaseSamplesMutation(baseOptions?: Apollo.MutationHookOptions<ReleaseSamplesMutation, ReleaseSamplesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReleaseSamplesMutation, ReleaseSamplesMutationVariables>(ReleaseSamplesDocument, options);
      }
export type ReleaseSamplesMutationHookResult = ReturnType<typeof useReleaseSamplesMutation>;
export type ReleaseSamplesMutationResult = Apollo.MutationResult<ReleaseSamplesMutation>;
export type ReleaseSamplesMutationOptions = Apollo.BaseMutationOptions<ReleaseSamplesMutation, ReleaseSamplesMutationVariables>;
export const PutFilesDocument = gql`
    mutation PutFiles($dataset: ID!, $files: [ID!]!) {
  putFiles(dataset: $dataset, files: $files) {
    ...DetailDataset
  }
}
    ${DetailDatasetFragmentDoc}`;
export type PutFilesMutationFn = Apollo.MutationFunction<PutFilesMutation, PutFilesMutationVariables>;

/**
 * __usePutFilesMutation__
 *
 * To run a mutation, you first call `usePutFilesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePutFilesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [putFilesMutation, { data, loading, error }] = usePutFilesMutation({
 *   variables: {
 *      dataset: // value for 'dataset'
 *      files: // value for 'files'
 *   },
 * });
 */
export function usePutFilesMutation(baseOptions?: Apollo.MutationHookOptions<PutFilesMutation, PutFilesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PutFilesMutation, PutFilesMutationVariables>(PutFilesDocument, options);
      }
export type PutFilesMutationHookResult = ReturnType<typeof usePutFilesMutation>;
export type PutFilesMutationResult = Apollo.MutationResult<PutFilesMutation>;
export type PutFilesMutationOptions = Apollo.BaseMutationOptions<PutFilesMutation, PutFilesMutationVariables>;
export const CreateExperimentDocument = gql`
    mutation CreateExperiment($name: String!, $description: String!) {
  createExperiment(name: $name, description: $description) {
    ...DetailExperiment
  }
}
    ${DetailExperimentFragmentDoc}`;
export type CreateExperimentMutationFn = Apollo.MutationFunction<CreateExperimentMutation, CreateExperimentMutationVariables>;

/**
 * __useCreateExperimentMutation__
 *
 * To run a mutation, you first call `useCreateExperimentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateExperimentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createExperimentMutation, { data, loading, error }] = useCreateExperimentMutation({
 *   variables: {
 *      name: // value for 'name'
 *      description: // value for 'description'
 *   },
 * });
 */
export function useCreateExperimentMutation(baseOptions?: Apollo.MutationHookOptions<CreateExperimentMutation, CreateExperimentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateExperimentMutation, CreateExperimentMutationVariables>(CreateExperimentDocument, options);
      }
export type CreateExperimentMutationHookResult = ReturnType<typeof useCreateExperimentMutation>;
export type CreateExperimentMutationResult = Apollo.MutationResult<CreateExperimentMutation>;
export type CreateExperimentMutationOptions = Apollo.BaseMutationOptions<CreateExperimentMutation, CreateExperimentMutationVariables>;
export const DeleteExperimentDocument = gql`
    mutation DeleteExperiment($id: ID!) {
  deleteExperiment(id: $id) {
    id
  }
}
    `;
export type DeleteExperimentMutationFn = Apollo.MutationFunction<DeleteExperimentMutation, DeleteExperimentMutationVariables>;

/**
 * __useDeleteExperimentMutation__
 *
 * To run a mutation, you first call `useDeleteExperimentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteExperimentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteExperimentMutation, { data, loading, error }] = useDeleteExperimentMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteExperimentMutation(baseOptions?: Apollo.MutationHookOptions<DeleteExperimentMutation, DeleteExperimentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteExperimentMutation, DeleteExperimentMutationVariables>(DeleteExperimentDocument, options);
      }
export type DeleteExperimentMutationHookResult = ReturnType<typeof useDeleteExperimentMutation>;
export type DeleteExperimentMutationResult = Apollo.MutationResult<DeleteExperimentMutation>;
export type DeleteExperimentMutationOptions = Apollo.BaseMutationOptions<DeleteExperimentMutation, DeleteExperimentMutationVariables>;
export const UpdateExperimentDocument = gql`
    mutation UpdateExperiment($id: ID!, $description: String, $tags: [String], $name: String!) {
  updateExperiment(id: $id, description: $description, tags: $tags, name: $name) {
    ...DetailExperiment
  }
}
    ${DetailExperimentFragmentDoc}`;
export type UpdateExperimentMutationFn = Apollo.MutationFunction<UpdateExperimentMutation, UpdateExperimentMutationVariables>;

/**
 * __useUpdateExperimentMutation__
 *
 * To run a mutation, you first call `useUpdateExperimentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateExperimentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateExperimentMutation, { data, loading, error }] = useUpdateExperimentMutation({
 *   variables: {
 *      id: // value for 'id'
 *      description: // value for 'description'
 *      tags: // value for 'tags'
 *      name: // value for 'name'
 *   },
 * });
 */
export function useUpdateExperimentMutation(baseOptions?: Apollo.MutationHookOptions<UpdateExperimentMutation, UpdateExperimentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateExperimentMutation, UpdateExperimentMutationVariables>(UpdateExperimentDocument, options);
      }
export type UpdateExperimentMutationHookResult = ReturnType<typeof useUpdateExperimentMutation>;
export type UpdateExperimentMutationResult = Apollo.MutationResult<UpdateExperimentMutation>;
export type UpdateExperimentMutationOptions = Apollo.BaseMutationOptions<UpdateExperimentMutation, UpdateExperimentMutationVariables>;
export const PinExperimentDocument = gql`
    mutation PinExperiment($id: ID!, $pin: Boolean!) {
  pinExperiment(id: $id, pin: $pin) {
    id
    pinnedBy {
      id
      email
    }
    pinned
  }
}
    `;
export type PinExperimentMutationFn = Apollo.MutationFunction<PinExperimentMutation, PinExperimentMutationVariables>;

/**
 * __usePinExperimentMutation__
 *
 * To run a mutation, you first call `usePinExperimentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePinExperimentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pinExperimentMutation, { data, loading, error }] = usePinExperimentMutation({
 *   variables: {
 *      id: // value for 'id'
 *      pin: // value for 'pin'
 *   },
 * });
 */
export function usePinExperimentMutation(baseOptions?: Apollo.MutationHookOptions<PinExperimentMutation, PinExperimentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PinExperimentMutation, PinExperimentMutationVariables>(PinExperimentDocument, options);
      }
export type PinExperimentMutationHookResult = ReturnType<typeof usePinExperimentMutation>;
export type PinExperimentMutationResult = Apollo.MutationResult<PinExperimentMutation>;
export type PinExperimentMutationOptions = Apollo.BaseMutationOptions<PinExperimentMutation, PinExperimentMutationVariables>;
export const AssociateSamplesDocument = gql`
    mutation AssociateSamples($experiment: ID!, $samples: [ID!]!) {
  associateSamples(experiment: $experiment, samples: $samples) {
    ...DetailExperiment
  }
}
    ${DetailExperimentFragmentDoc}`;
export type AssociateSamplesMutationFn = Apollo.MutationFunction<AssociateSamplesMutation, AssociateSamplesMutationVariables>;

/**
 * __useAssociateSamplesMutation__
 *
 * To run a mutation, you first call `useAssociateSamplesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAssociateSamplesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [associateSamplesMutation, { data, loading, error }] = useAssociateSamplesMutation({
 *   variables: {
 *      experiment: // value for 'experiment'
 *      samples: // value for 'samples'
 *   },
 * });
 */
export function useAssociateSamplesMutation(baseOptions?: Apollo.MutationHookOptions<AssociateSamplesMutation, AssociateSamplesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AssociateSamplesMutation, AssociateSamplesMutationVariables>(AssociateSamplesDocument, options);
      }
export type AssociateSamplesMutationHookResult = ReturnType<typeof useAssociateSamplesMutation>;
export type AssociateSamplesMutationResult = Apollo.MutationResult<AssociateSamplesMutation>;
export type AssociateSamplesMutationOptions = Apollo.BaseMutationOptions<AssociateSamplesMutation, AssociateSamplesMutationVariables>;
export const AssociateFilesDocument = gql`
    mutation AssociateFiles($experiment: ID!, $files: [ID!]!) {
  associateFiles(experiment: $experiment, files: $files) {
    ...DetailExperiment
  }
}
    ${DetailExperimentFragmentDoc}`;
export type AssociateFilesMutationFn = Apollo.MutationFunction<AssociateFilesMutation, AssociateFilesMutationVariables>;

/**
 * __useAssociateFilesMutation__
 *
 * To run a mutation, you first call `useAssociateFilesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAssociateFilesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [associateFilesMutation, { data, loading, error }] = useAssociateFilesMutation({
 *   variables: {
 *      experiment: // value for 'experiment'
 *      files: // value for 'files'
 *   },
 * });
 */
export function useAssociateFilesMutation(baseOptions?: Apollo.MutationHookOptions<AssociateFilesMutation, AssociateFilesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AssociateFilesMutation, AssociateFilesMutationVariables>(AssociateFilesDocument, options);
      }
export type AssociateFilesMutationHookResult = ReturnType<typeof useAssociateFilesMutation>;
export type AssociateFilesMutationResult = Apollo.MutationResult<AssociateFilesMutation>;
export type AssociateFilesMutationOptions = Apollo.BaseMutationOptions<AssociateFilesMutation, AssociateFilesMutationVariables>;
export const UnassociateSamplesDocument = gql`
    mutation UnassociateSamples($experiment: ID!, $samples: [ID!]!) {
  unassociateSamples(experiment: $experiment, samples: $samples) {
    ...DetailExperiment
  }
}
    ${DetailExperimentFragmentDoc}`;
export type UnassociateSamplesMutationFn = Apollo.MutationFunction<UnassociateSamplesMutation, UnassociateSamplesMutationVariables>;

/**
 * __useUnassociateSamplesMutation__
 *
 * To run a mutation, you first call `useUnassociateSamplesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnassociateSamplesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unassociateSamplesMutation, { data, loading, error }] = useUnassociateSamplesMutation({
 *   variables: {
 *      experiment: // value for 'experiment'
 *      samples: // value for 'samples'
 *   },
 * });
 */
export function useUnassociateSamplesMutation(baseOptions?: Apollo.MutationHookOptions<UnassociateSamplesMutation, UnassociateSamplesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UnassociateSamplesMutation, UnassociateSamplesMutationVariables>(UnassociateSamplesDocument, options);
      }
export type UnassociateSamplesMutationHookResult = ReturnType<typeof useUnassociateSamplesMutation>;
export type UnassociateSamplesMutationResult = Apollo.MutationResult<UnassociateSamplesMutation>;
export type UnassociateSamplesMutationOptions = Apollo.BaseMutationOptions<UnassociateSamplesMutation, UnassociateSamplesMutationVariables>;
export const UnassociateFilesDocument = gql`
    mutation UnassociateFiles($experiment: ID!, $files: [ID!]!) {
  unassociateFiles(experiment: $experiment, files: $files) {
    ...DetailExperiment
  }
}
    ${DetailExperimentFragmentDoc}`;
export type UnassociateFilesMutationFn = Apollo.MutationFunction<UnassociateFilesMutation, UnassociateFilesMutationVariables>;

/**
 * __useUnassociateFilesMutation__
 *
 * To run a mutation, you first call `useUnassociateFilesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnassociateFilesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unassociateFilesMutation, { data, loading, error }] = useUnassociateFilesMutation({
 *   variables: {
 *      experiment: // value for 'experiment'
 *      files: // value for 'files'
 *   },
 * });
 */
export function useUnassociateFilesMutation(baseOptions?: Apollo.MutationHookOptions<UnassociateFilesMutation, UnassociateFilesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UnassociateFilesMutation, UnassociateFilesMutationVariables>(UnassociateFilesDocument, options);
      }
export type UnassociateFilesMutationHookResult = ReturnType<typeof useUnassociateFilesMutation>;
export type UnassociateFilesMutationResult = Apollo.MutationResult<UnassociateFilesMutation>;
export type UnassociateFilesMutationOptions = Apollo.BaseMutationOptions<UnassociateFilesMutation, UnassociateFilesMutationVariables>;
export const DeleteGraphDocument = gql`
    mutation DeleteGraph($id: ID!) {
  deleteGraph(id: $id) {
    id
  }
}
    `;
export type DeleteGraphMutationFn = Apollo.MutationFunction<DeleteGraphMutation, DeleteGraphMutationVariables>;

/**
 * __useDeleteGraphMutation__
 *
 * To run a mutation, you first call `useDeleteGraphMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteGraphMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteGraphMutation, { data, loading, error }] = useDeleteGraphMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteGraphMutation(baseOptions?: Apollo.MutationHookOptions<DeleteGraphMutation, DeleteGraphMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteGraphMutation, DeleteGraphMutationVariables>(DeleteGraphDocument, options);
      }
export type DeleteGraphMutationHookResult = ReturnType<typeof useDeleteGraphMutation>;
export type DeleteGraphMutationResult = Apollo.MutationResult<DeleteGraphMutation>;
export type DeleteGraphMutationOptions = Apollo.BaseMutationOptions<DeleteGraphMutation, DeleteGraphMutationVariables>;
export const LinkDocument = gql`
    mutation Link($relation: ID!, $leftType: LinkableModels!, $leftId: ID!, $rightType: LinkableModels!, $rightId: ID!, $context: ID) {
  link(
    relation: $relation
    leftType: $leftType
    leftId: $leftId
    rightType: $rightType
    rightId: $rightId
    context: $context
  ) {
    ...ListLink
  }
}
    ${ListLinkFragmentDoc}`;
export type LinkMutationFn = Apollo.MutationFunction<LinkMutation, LinkMutationVariables>;

/**
 * __useLinkMutation__
 *
 * To run a mutation, you first call `useLinkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLinkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [linkMutation, { data, loading, error }] = useLinkMutation({
 *   variables: {
 *      relation: // value for 'relation'
 *      leftType: // value for 'leftType'
 *      leftId: // value for 'leftId'
 *      rightType: // value for 'rightType'
 *      rightId: // value for 'rightId'
 *      context: // value for 'context'
 *   },
 * });
 */
export function useLinkMutation(baseOptions?: Apollo.MutationHookOptions<LinkMutation, LinkMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LinkMutation, LinkMutationVariables>(LinkDocument, options);
      }
export type LinkMutationHookResult = ReturnType<typeof useLinkMutation>;
export type LinkMutationResult = Apollo.MutationResult<LinkMutation>;
export type LinkMutationOptions = Apollo.BaseMutationOptions<LinkMutation, LinkMutationVariables>;
export const DeleteLinkDocument = gql`
    mutation DeleteLink($id: ID!) {
  deleteLink(id: $id) {
    id
  }
}
    `;
export type DeleteLinkMutationFn = Apollo.MutationFunction<DeleteLinkMutation, DeleteLinkMutationVariables>;

/**
 * __useDeleteLinkMutation__
 *
 * To run a mutation, you first call `useDeleteLinkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteLinkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteLinkMutation, { data, loading, error }] = useDeleteLinkMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteLinkMutation(baseOptions?: Apollo.MutationHookOptions<DeleteLinkMutation, DeleteLinkMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteLinkMutation, DeleteLinkMutationVariables>(DeleteLinkDocument, options);
      }
export type DeleteLinkMutationHookResult = ReturnType<typeof useDeleteLinkMutation>;
export type DeleteLinkMutationResult = Apollo.MutationResult<DeleteLinkMutation>;
export type DeleteLinkMutationOptions = Apollo.BaseMutationOptions<DeleteLinkMutation, DeleteLinkMutationVariables>;
export const DeleteModelDocument = gql`
    mutation DeleteModel($id: ID!) {
  deleteModel(id: $id) {
    id
  }
}
    `;
export type DeleteModelMutationFn = Apollo.MutationFunction<DeleteModelMutation, DeleteModelMutationVariables>;

/**
 * __useDeleteModelMutation__
 *
 * To run a mutation, you first call `useDeleteModelMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteModelMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteModelMutation, { data, loading, error }] = useDeleteModelMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteModelMutation(baseOptions?: Apollo.MutationHookOptions<DeleteModelMutation, DeleteModelMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteModelMutation, DeleteModelMutationVariables>(DeleteModelDocument, options);
      }
export type DeleteModelMutationHookResult = ReturnType<typeof useDeleteModelMutation>;
export type DeleteModelMutationResult = Apollo.MutationResult<DeleteModelMutation>;
export type DeleteModelMutationOptions = Apollo.BaseMutationOptions<DeleteModelMutation, DeleteModelMutationVariables>;
export const UploadOmeroFileDocument = gql`
    mutation UploadOmeroFile($file: ImageFile!, $experiments: [ID], $datasets: [ID]) {
  uploadOmeroFile(file: $file, experiments: $experiments, datasets: $datasets) {
    ...DetailOmeroFile
  }
}
    ${DetailOmeroFileFragmentDoc}`;
export type UploadOmeroFileMutationFn = Apollo.MutationFunction<UploadOmeroFileMutation, UploadOmeroFileMutationVariables>;

/**
 * __useUploadOmeroFileMutation__
 *
 * To run a mutation, you first call `useUploadOmeroFileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUploadOmeroFileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [uploadOmeroFileMutation, { data, loading, error }] = useUploadOmeroFileMutation({
 *   variables: {
 *      file: // value for 'file'
 *      experiments: // value for 'experiments'
 *      datasets: // value for 'datasets'
 *   },
 * });
 */
export function useUploadOmeroFileMutation(baseOptions?: Apollo.MutationHookOptions<UploadOmeroFileMutation, UploadOmeroFileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UploadOmeroFileMutation, UploadOmeroFileMutationVariables>(UploadOmeroFileDocument, options);
      }
export type UploadOmeroFileMutationHookResult = ReturnType<typeof useUploadOmeroFileMutation>;
export type UploadOmeroFileMutationResult = Apollo.MutationResult<UploadOmeroFileMutation>;
export type UploadOmeroFileMutationOptions = Apollo.BaseMutationOptions<UploadOmeroFileMutation, UploadOmeroFileMutationVariables>;
export const UploadBigFileDocument = gql`
    mutation UploadBigFile($file: BigFile!, $datasets: [ID]) {
  uploadBigFile(file: $file, datasets: $datasets) {
    ...DetailOmeroFile
  }
}
    ${DetailOmeroFileFragmentDoc}`;
export type UploadBigFileMutationFn = Apollo.MutationFunction<UploadBigFileMutation, UploadBigFileMutationVariables>;

/**
 * __useUploadBigFileMutation__
 *
 * To run a mutation, you first call `useUploadBigFileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUploadBigFileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [uploadBigFileMutation, { data, loading, error }] = useUploadBigFileMutation({
 *   variables: {
 *      file: // value for 'file'
 *      datasets: // value for 'datasets'
 *   },
 * });
 */
export function useUploadBigFileMutation(baseOptions?: Apollo.MutationHookOptions<UploadBigFileMutation, UploadBigFileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UploadBigFileMutation, UploadBigFileMutationVariables>(UploadBigFileDocument, options);
      }
export type UploadBigFileMutationHookResult = ReturnType<typeof useUploadBigFileMutation>;
export type UploadBigFileMutationResult = Apollo.MutationResult<UploadBigFileMutation>;
export type UploadBigFileMutationOptions = Apollo.BaseMutationOptions<UploadBigFileMutation, UploadBigFileMutationVariables>;
export const DeleteOmeroFileDocument = gql`
    mutation DeleteOmeroFile($id: ID!) {
  deleteOmeroFile(id: $id) {
    id
  }
}
    `;
export type DeleteOmeroFileMutationFn = Apollo.MutationFunction<DeleteOmeroFileMutation, DeleteOmeroFileMutationVariables>;

/**
 * __useDeleteOmeroFileMutation__
 *
 * To run a mutation, you first call `useDeleteOmeroFileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteOmeroFileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteOmeroFileMutation, { data, loading, error }] = useDeleteOmeroFileMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteOmeroFileMutation(baseOptions?: Apollo.MutationHookOptions<DeleteOmeroFileMutation, DeleteOmeroFileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteOmeroFileMutation, DeleteOmeroFileMutationVariables>(DeleteOmeroFileDocument, options);
      }
export type DeleteOmeroFileMutationHookResult = ReturnType<typeof useDeleteOmeroFileMutation>;
export type DeleteOmeroFileMutationResult = Apollo.MutationResult<DeleteOmeroFileMutation>;
export type DeleteOmeroFileMutationOptions = Apollo.BaseMutationOptions<DeleteOmeroFileMutation, DeleteOmeroFileMutationVariables>;
export const UpdateOmeroFileDocument = gql`
    mutation UpdateOmeroFile($id: ID!, $tags: [String]) {
  updateOmeroFile(id: $id, tags: $tags) {
    ...DetailOmeroFile
  }
}
    ${DetailOmeroFileFragmentDoc}`;
export type UpdateOmeroFileMutationFn = Apollo.MutationFunction<UpdateOmeroFileMutation, UpdateOmeroFileMutationVariables>;

/**
 * __useUpdateOmeroFileMutation__
 *
 * To run a mutation, you first call `useUpdateOmeroFileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateOmeroFileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateOmeroFileMutation, { data, loading, error }] = useUpdateOmeroFileMutation({
 *   variables: {
 *      id: // value for 'id'
 *      tags: // value for 'tags'
 *   },
 * });
 */
export function useUpdateOmeroFileMutation(baseOptions?: Apollo.MutationHookOptions<UpdateOmeroFileMutation, UpdateOmeroFileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateOmeroFileMutation, UpdateOmeroFileMutationVariables>(UpdateOmeroFileDocument, options);
      }
export type UpdateOmeroFileMutationHookResult = ReturnType<typeof useUpdateOmeroFileMutation>;
export type UpdateOmeroFileMutationResult = Apollo.MutationResult<UpdateOmeroFileMutation>;
export type UpdateOmeroFileMutationOptions = Apollo.BaseMutationOptions<UpdateOmeroFileMutation, UpdateOmeroFileMutationVariables>;
export const ChangePermissionsDocument = gql`
    mutation ChangePermissions($type: SharableModels!, $object: ID!, $userAssignments: [UserAssignmentInput], $groupAssignments: [GroupAssignmentInput]) {
  changePermissions(
    type: $type
    object: $object
    userAssignments: $userAssignments
    groupAssignments: $groupAssignments
  ) {
    success
  }
}
    `;
export type ChangePermissionsMutationFn = Apollo.MutationFunction<ChangePermissionsMutation, ChangePermissionsMutationVariables>;

/**
 * __useChangePermissionsMutation__
 *
 * To run a mutation, you first call `useChangePermissionsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useChangePermissionsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [changePermissionsMutation, { data, loading, error }] = useChangePermissionsMutation({
 *   variables: {
 *      type: // value for 'type'
 *      object: // value for 'object'
 *      userAssignments: // value for 'userAssignments'
 *      groupAssignments: // value for 'groupAssignments'
 *   },
 * });
 */
export function useChangePermissionsMutation(baseOptions?: Apollo.MutationHookOptions<ChangePermissionsMutation, ChangePermissionsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ChangePermissionsMutation, ChangePermissionsMutationVariables>(ChangePermissionsDocument, options);
      }
export type ChangePermissionsMutationHookResult = ReturnType<typeof useChangePermissionsMutation>;
export type ChangePermissionsMutationResult = Apollo.MutationResult<ChangePermissionsMutation>;
export type ChangePermissionsMutationOptions = Apollo.BaseMutationOptions<ChangePermissionsMutation, ChangePermissionsMutationVariables>;
export const CreatePlotDocument = gql`
    mutation CreatePlot($name: String!) {
  createPlot(name: $name) {
    ...Plot
  }
}
    ${PlotFragmentDoc}`;
export type CreatePlotMutationFn = Apollo.MutationFunction<CreatePlotMutation, CreatePlotMutationVariables>;

/**
 * __useCreatePlotMutation__
 *
 * To run a mutation, you first call `useCreatePlotMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreatePlotMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createPlotMutation, { data, loading, error }] = useCreatePlotMutation({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useCreatePlotMutation(baseOptions?: Apollo.MutationHookOptions<CreatePlotMutation, CreatePlotMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreatePlotMutation, CreatePlotMutationVariables>(CreatePlotDocument, options);
      }
export type CreatePlotMutationHookResult = ReturnType<typeof useCreatePlotMutation>;
export type CreatePlotMutationResult = Apollo.MutationResult<CreatePlotMutation>;
export type CreatePlotMutationOptions = Apollo.BaseMutationOptions<CreatePlotMutation, CreatePlotMutationVariables>;
export const UpdatePlotDocument = gql`
    mutation UpdatePlot($id: ID!, $name: String, $query: String!) {
  updatePlot(id: $id, name: $name, query: $query) {
    ...Plot
  }
}
    ${PlotFragmentDoc}`;
export type UpdatePlotMutationFn = Apollo.MutationFunction<UpdatePlotMutation, UpdatePlotMutationVariables>;

/**
 * __useUpdatePlotMutation__
 *
 * To run a mutation, you first call `useUpdatePlotMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdatePlotMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updatePlotMutation, { data, loading, error }] = useUpdatePlotMutation({
 *   variables: {
 *      id: // value for 'id'
 *      name: // value for 'name'
 *      query: // value for 'query'
 *   },
 * });
 */
export function useUpdatePlotMutation(baseOptions?: Apollo.MutationHookOptions<UpdatePlotMutation, UpdatePlotMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdatePlotMutation, UpdatePlotMutationVariables>(UpdatePlotDocument, options);
      }
export type UpdatePlotMutationHookResult = ReturnType<typeof useUpdatePlotMutation>;
export type UpdatePlotMutationResult = Apollo.MutationResult<UpdatePlotMutation>;
export type UpdatePlotMutationOptions = Apollo.BaseMutationOptions<UpdatePlotMutation, UpdatePlotMutationVariables>;
export const DeletePlotDocument = gql`
    mutation DeletePlot($id: ID!) {
  deletePlot(id: $id) {
    id
  }
}
    `;
export type DeletePlotMutationFn = Apollo.MutationFunction<DeletePlotMutation, DeletePlotMutationVariables>;

/**
 * __useDeletePlotMutation__
 *
 * To run a mutation, you first call `useDeletePlotMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeletePlotMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deletePlotMutation, { data, loading, error }] = useDeletePlotMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeletePlotMutation(baseOptions?: Apollo.MutationHookOptions<DeletePlotMutation, DeletePlotMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeletePlotMutation, DeletePlotMutationVariables>(DeletePlotDocument, options);
      }
export type DeletePlotMutationHookResult = ReturnType<typeof useDeletePlotMutation>;
export type DeletePlotMutationResult = Apollo.MutationResult<DeletePlotMutation>;
export type DeletePlotMutationOptions = Apollo.BaseMutationOptions<DeletePlotMutation, DeletePlotMutationVariables>;
export const CreatePositionDocument = gql`
    mutation createPosition($stage: ID!, $x: Float!, $y: Float!, $z: Float!, $tags: [String]) {
  createPosition(stage: $stage, x: $x, y: $y, z: $z, tags: $tags) {
    ...Position
  }
}
    ${PositionFragmentDoc}`;
export type CreatePositionMutationFn = Apollo.MutationFunction<CreatePositionMutation, CreatePositionMutationVariables>;

/**
 * __useCreatePositionMutation__
 *
 * To run a mutation, you first call `useCreatePositionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreatePositionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createPositionMutation, { data, loading, error }] = useCreatePositionMutation({
 *   variables: {
 *      stage: // value for 'stage'
 *      x: // value for 'x'
 *      y: // value for 'y'
 *      z: // value for 'z'
 *      tags: // value for 'tags'
 *   },
 * });
 */
export function useCreatePositionMutation(baseOptions?: Apollo.MutationHookOptions<CreatePositionMutation, CreatePositionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreatePositionMutation, CreatePositionMutationVariables>(CreatePositionDocument, options);
      }
export type CreatePositionMutationHookResult = ReturnType<typeof useCreatePositionMutation>;
export type CreatePositionMutationResult = Apollo.MutationResult<CreatePositionMutation>;
export type CreatePositionMutationOptions = Apollo.BaseMutationOptions<CreatePositionMutation, CreatePositionMutationVariables>;
export const DeletePositionDocument = gql`
    mutation DeletePosition($id: ID!) {
  deletePosition(id: $id) {
    id
  }
}
    `;
export type DeletePositionMutationFn = Apollo.MutationFunction<DeletePositionMutation, DeletePositionMutationVariables>;

/**
 * __useDeletePositionMutation__
 *
 * To run a mutation, you first call `useDeletePositionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeletePositionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deletePositionMutation, { data, loading, error }] = useDeletePositionMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeletePositionMutation(baseOptions?: Apollo.MutationHookOptions<DeletePositionMutation, DeletePositionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeletePositionMutation, DeletePositionMutationVariables>(DeletePositionDocument, options);
      }
export type DeletePositionMutationHookResult = ReturnType<typeof useDeletePositionMutation>;
export type DeletePositionMutationResult = Apollo.MutationResult<DeletePositionMutation>;
export type DeletePositionMutationOptions = Apollo.BaseMutationOptions<DeletePositionMutation, DeletePositionMutationVariables>;
export const PinPositionDocument = gql`
    mutation PinPosition($id: ID!, $pin: Boolean!) {
  pinPosition(id: $id, pin: $pin) {
    id
    pinnedBy {
      id
      email
    }
    pinned
  }
}
    `;
export type PinPositionMutationFn = Apollo.MutationFunction<PinPositionMutation, PinPositionMutationVariables>;

/**
 * __usePinPositionMutation__
 *
 * To run a mutation, you first call `usePinPositionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePinPositionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pinPositionMutation, { data, loading, error }] = usePinPositionMutation({
 *   variables: {
 *      id: // value for 'id'
 *      pin: // value for 'pin'
 *   },
 * });
 */
export function usePinPositionMutation(baseOptions?: Apollo.MutationHookOptions<PinPositionMutation, PinPositionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PinPositionMutation, PinPositionMutationVariables>(PinPositionDocument, options);
      }
export type PinPositionMutationHookResult = ReturnType<typeof usePinPositionMutation>;
export type PinPositionMutationResult = Apollo.MutationResult<PinPositionMutation>;
export type PinPositionMutationOptions = Apollo.BaseMutationOptions<PinPositionMutation, PinPositionMutationVariables>;
export const PresignDocument = gql`
    mutation Presign($file: String!) {
  presign(file: $file) {
    bucket
    fields {
      xAmzDate
      xAmzAlgorithm
      xAmzSignature
      xAmzCredential
      key
      policy
    }
  }
}
    `;
export type PresignMutationFn = Apollo.MutationFunction<PresignMutation, PresignMutationVariables>;

/**
 * __usePresignMutation__
 *
 * To run a mutation, you first call `usePresignMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePresignMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [presignMutation, { data, loading, error }] = usePresignMutation({
 *   variables: {
 *      file: // value for 'file'
 *   },
 * });
 */
export function usePresignMutation(baseOptions?: Apollo.MutationHookOptions<PresignMutation, PresignMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PresignMutation, PresignMutationVariables>(PresignDocument, options);
      }
export type PresignMutationHookResult = ReturnType<typeof usePresignMutation>;
export type PresignMutationResult = Apollo.MutationResult<PresignMutation>;
export type PresignMutationOptions = Apollo.BaseMutationOptions<PresignMutation, PresignMutationVariables>;
export const CreateRelationDocument = gql`
    mutation CreateRelation($name: String!, $description: String) {
  createRelation(name: $name, description: $description) {
    ...DetailRelation
  }
}
    ${DetailRelationFragmentDoc}`;
export type CreateRelationMutationFn = Apollo.MutationFunction<CreateRelationMutation, CreateRelationMutationVariables>;

/**
 * __useCreateRelationMutation__
 *
 * To run a mutation, you first call `useCreateRelationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateRelationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createRelationMutation, { data, loading, error }] = useCreateRelationMutation({
 *   variables: {
 *      name: // value for 'name'
 *      description: // value for 'description'
 *   },
 * });
 */
export function useCreateRelationMutation(baseOptions?: Apollo.MutationHookOptions<CreateRelationMutation, CreateRelationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateRelationMutation, CreateRelationMutationVariables>(CreateRelationDocument, options);
      }
export type CreateRelationMutationHookResult = ReturnType<typeof useCreateRelationMutation>;
export type CreateRelationMutationResult = Apollo.MutationResult<CreateRelationMutation>;
export type CreateRelationMutationOptions = Apollo.BaseMutationOptions<CreateRelationMutation, CreateRelationMutationVariables>;
export const DeleteRepresentationDocument = gql`
    mutation DeleteRepresentation($id: ID!) {
  deleteRepresentation(id: $id) {
    id
  }
}
    `;
export type DeleteRepresentationMutationFn = Apollo.MutationFunction<DeleteRepresentationMutation, DeleteRepresentationMutationVariables>;

/**
 * __useDeleteRepresentationMutation__
 *
 * To run a mutation, you first call `useDeleteRepresentationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteRepresentationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteRepresentationMutation, { data, loading, error }] = useDeleteRepresentationMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteRepresentationMutation(baseOptions?: Apollo.MutationHookOptions<DeleteRepresentationMutation, DeleteRepresentationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteRepresentationMutation, DeleteRepresentationMutationVariables>(DeleteRepresentationDocument, options);
      }
export type DeleteRepresentationMutationHookResult = ReturnType<typeof useDeleteRepresentationMutation>;
export type DeleteRepresentationMutationResult = Apollo.MutationResult<DeleteRepresentationMutation>;
export type DeleteRepresentationMutationOptions = Apollo.BaseMutationOptions<DeleteRepresentationMutation, DeleteRepresentationMutationVariables>;
export const UpdateRepresentationDocument = gql`
    mutation UpdateRepresentation($id: ID!, $tags: [String], $sample: ID, $variety: RepresentationVarietyInput, $origins: [ID]) {
  updateRepresentation(
    rep: $id
    tags: $tags
    sample: $sample
    variety: $variety
    origins: $origins
  ) {
    ...DetailRepresentation
  }
}
    ${DetailRepresentationFragmentDoc}`;
export type UpdateRepresentationMutationFn = Apollo.MutationFunction<UpdateRepresentationMutation, UpdateRepresentationMutationVariables>;

/**
 * __useUpdateRepresentationMutation__
 *
 * To run a mutation, you first call `useUpdateRepresentationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateRepresentationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateRepresentationMutation, { data, loading, error }] = useUpdateRepresentationMutation({
 *   variables: {
 *      id: // value for 'id'
 *      tags: // value for 'tags'
 *      sample: // value for 'sample'
 *      variety: // value for 'variety'
 *      origins: // value for 'origins'
 *   },
 * });
 */
export function useUpdateRepresentationMutation(baseOptions?: Apollo.MutationHookOptions<UpdateRepresentationMutation, UpdateRepresentationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateRepresentationMutation, UpdateRepresentationMutationVariables>(UpdateRepresentationDocument, options);
      }
export type UpdateRepresentationMutationHookResult = ReturnType<typeof useUpdateRepresentationMutation>;
export type UpdateRepresentationMutationResult = Apollo.MutationResult<UpdateRepresentationMutation>;
export type UpdateRepresentationMutationOptions = Apollo.BaseMutationOptions<UpdateRepresentationMutation, UpdateRepresentationMutationVariables>;
export const PinRepresentationDocument = gql`
    mutation PinRepresentation($id: ID!, $pin: Boolean!) {
  pinRepresentation(id: $id, pin: $pin) {
    id
    pinnedBy {
      id
      email
    }
    pinned
  }
}
    `;
export type PinRepresentationMutationFn = Apollo.MutationFunction<PinRepresentationMutation, PinRepresentationMutationVariables>;

/**
 * __usePinRepresentationMutation__
 *
 * To run a mutation, you first call `usePinRepresentationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePinRepresentationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pinRepresentationMutation, { data, loading, error }] = usePinRepresentationMutation({
 *   variables: {
 *      id: // value for 'id'
 *      pin: // value for 'pin'
 *   },
 * });
 */
export function usePinRepresentationMutation(baseOptions?: Apollo.MutationHookOptions<PinRepresentationMutation, PinRepresentationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PinRepresentationMutation, PinRepresentationMutationVariables>(PinRepresentationDocument, options);
      }
export type PinRepresentationMutationHookResult = ReturnType<typeof usePinRepresentationMutation>;
export type PinRepresentationMutationResult = Apollo.MutationResult<PinRepresentationMutation>;
export type PinRepresentationMutationOptions = Apollo.BaseMutationOptions<PinRepresentationMutation, PinRepresentationMutationVariables>;
export const PinRoiDocument = gql`
    mutation PinRoi($id: ID!, $pin: Boolean!) {
  pinROI(id: $id, pin: $pin) {
    id
    pinnedBy {
      id
      email
    }
    pinned
  }
}
    `;
export type PinRoiMutationFn = Apollo.MutationFunction<PinRoiMutation, PinRoiMutationVariables>;

/**
 * __usePinRoiMutation__
 *
 * To run a mutation, you first call `usePinRoiMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePinRoiMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pinRoiMutation, { data, loading, error }] = usePinRoiMutation({
 *   variables: {
 *      id: // value for 'id'
 *      pin: // value for 'pin'
 *   },
 * });
 */
export function usePinRoiMutation(baseOptions?: Apollo.MutationHookOptions<PinRoiMutation, PinRoiMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PinRoiMutation, PinRoiMutationVariables>(PinRoiDocument, options);
      }
export type PinRoiMutationHookResult = ReturnType<typeof usePinRoiMutation>;
export type PinRoiMutationResult = Apollo.MutationResult<PinRoiMutation>;
export type PinRoiMutationOptions = Apollo.BaseMutationOptions<PinRoiMutation, PinRoiMutationVariables>;
export const DeleteRoiDocument = gql`
    mutation DeleteRoi($id: ID!) {
  deleteROI(id: $id) {
    id
  }
}
    `;
export type DeleteRoiMutationFn = Apollo.MutationFunction<DeleteRoiMutation, DeleteRoiMutationVariables>;

/**
 * __useDeleteRoiMutation__
 *
 * To run a mutation, you first call `useDeleteRoiMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteRoiMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteRoiMutation, { data, loading, error }] = useDeleteRoiMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteRoiMutation(baseOptions?: Apollo.MutationHookOptions<DeleteRoiMutation, DeleteRoiMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteRoiMutation, DeleteRoiMutationVariables>(DeleteRoiDocument, options);
      }
export type DeleteRoiMutationHookResult = ReturnType<typeof useDeleteRoiMutation>;
export type DeleteRoiMutationResult = Apollo.MutationResult<DeleteRoiMutation>;
export type DeleteRoiMutationOptions = Apollo.BaseMutationOptions<DeleteRoiMutation, DeleteRoiMutationVariables>;
export const Create_RoiDocument = gql`
    mutation create_roi($representation: ID!, $vectors: [InputVector]!, $creator: ID, $type: RoiTypeInput!, $label: String) {
  createROI(
    representation: $representation
    vectors: $vectors
    type: $type
    creator: $creator
    label: $label
  ) {
    ...RepRoi
  }
}
    ${RepRoiFragmentDoc}`;
export type Create_RoiMutationFn = Apollo.MutationFunction<Create_RoiMutation, Create_RoiMutationVariables>;

/**
 * __useCreate_RoiMutation__
 *
 * To run a mutation, you first call `useCreate_RoiMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreate_RoiMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createRoiMutation, { data, loading, error }] = useCreate_RoiMutation({
 *   variables: {
 *      representation: // value for 'representation'
 *      vectors: // value for 'vectors'
 *      creator: // value for 'creator'
 *      type: // value for 'type'
 *      label: // value for 'label'
 *   },
 * });
 */
export function useCreate_RoiMutation(baseOptions?: Apollo.MutationHookOptions<Create_RoiMutation, Create_RoiMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Create_RoiMutation, Create_RoiMutationVariables>(Create_RoiDocument, options);
      }
export type Create_RoiMutationHookResult = ReturnType<typeof useCreate_RoiMutation>;
export type Create_RoiMutationResult = Apollo.MutationResult<Create_RoiMutation>;
export type Create_RoiMutationOptions = Apollo.BaseMutationOptions<Create_RoiMutation, Create_RoiMutationVariables>;
export const CreateSampleDocument = gql`
    mutation CreateSample($experiments: [ID], $name: String!) {
  createSample(experiments: $experiments, name: $name) {
    ...DetailSample
  }
}
    ${DetailSampleFragmentDoc}`;
export type CreateSampleMutationFn = Apollo.MutationFunction<CreateSampleMutation, CreateSampleMutationVariables>;

/**
 * __useCreateSampleMutation__
 *
 * To run a mutation, you first call `useCreateSampleMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateSampleMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createSampleMutation, { data, loading, error }] = useCreateSampleMutation({
 *   variables: {
 *      experiments: // value for 'experiments'
 *      name: // value for 'name'
 *   },
 * });
 */
export function useCreateSampleMutation(baseOptions?: Apollo.MutationHookOptions<CreateSampleMutation, CreateSampleMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateSampleMutation, CreateSampleMutationVariables>(CreateSampleDocument, options);
      }
export type CreateSampleMutationHookResult = ReturnType<typeof useCreateSampleMutation>;
export type CreateSampleMutationResult = Apollo.MutationResult<CreateSampleMutation>;
export type CreateSampleMutationOptions = Apollo.BaseMutationOptions<CreateSampleMutation, CreateSampleMutationVariables>;
export const DeleteSampleDocument = gql`
    mutation DeleteSample($id: ID!) {
  deleteSample(id: $id) {
    id
  }
}
    `;
export type DeleteSampleMutationFn = Apollo.MutationFunction<DeleteSampleMutation, DeleteSampleMutationVariables>;

/**
 * __useDeleteSampleMutation__
 *
 * To run a mutation, you first call `useDeleteSampleMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteSampleMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteSampleMutation, { data, loading, error }] = useDeleteSampleMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteSampleMutation(baseOptions?: Apollo.MutationHookOptions<DeleteSampleMutation, DeleteSampleMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteSampleMutation, DeleteSampleMutationVariables>(DeleteSampleDocument, options);
      }
export type DeleteSampleMutationHookResult = ReturnType<typeof useDeleteSampleMutation>;
export type DeleteSampleMutationResult = Apollo.MutationResult<DeleteSampleMutation>;
export type DeleteSampleMutationOptions = Apollo.BaseMutationOptions<DeleteSampleMutation, DeleteSampleMutationVariables>;
export const UpdateSampleDocument = gql`
    mutation UpdateSample($id: ID!, $experiments: [ID], $tags: [String], $name: String!) {
  updateSample(id: $id, experiments: $experiments, tags: $tags, name: $name) {
    ...DetailSample
  }
}
    ${DetailSampleFragmentDoc}`;
export type UpdateSampleMutationFn = Apollo.MutationFunction<UpdateSampleMutation, UpdateSampleMutationVariables>;

/**
 * __useUpdateSampleMutation__
 *
 * To run a mutation, you first call `useUpdateSampleMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateSampleMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateSampleMutation, { data, loading, error }] = useUpdateSampleMutation({
 *   variables: {
 *      id: // value for 'id'
 *      experiments: // value for 'experiments'
 *      tags: // value for 'tags'
 *      name: // value for 'name'
 *   },
 * });
 */
export function useUpdateSampleMutation(baseOptions?: Apollo.MutationHookOptions<UpdateSampleMutation, UpdateSampleMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateSampleMutation, UpdateSampleMutationVariables>(UpdateSampleDocument, options);
      }
export type UpdateSampleMutationHookResult = ReturnType<typeof useUpdateSampleMutation>;
export type UpdateSampleMutationResult = Apollo.MutationResult<UpdateSampleMutation>;
export type UpdateSampleMutationOptions = Apollo.BaseMutationOptions<UpdateSampleMutation, UpdateSampleMutationVariables>;
export const PinSampleDocument = gql`
    mutation PinSample($id: ID!, $pin: Boolean!) {
  pinSample(id: $id, pin: $pin) {
    id
    pinnedBy {
      id
      email
    }
    pinned
  }
}
    `;
export type PinSampleMutationFn = Apollo.MutationFunction<PinSampleMutation, PinSampleMutationVariables>;

/**
 * __usePinSampleMutation__
 *
 * To run a mutation, you first call `usePinSampleMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePinSampleMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pinSampleMutation, { data, loading, error }] = usePinSampleMutation({
 *   variables: {
 *      id: // value for 'id'
 *      pin: // value for 'pin'
 *   },
 * });
 */
export function usePinSampleMutation(baseOptions?: Apollo.MutationHookOptions<PinSampleMutation, PinSampleMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PinSampleMutation, PinSampleMutationVariables>(PinSampleDocument, options);
      }
export type PinSampleMutationHookResult = ReturnType<typeof usePinSampleMutation>;
export type PinSampleMutationResult = Apollo.MutationResult<PinSampleMutation>;
export type PinSampleMutationOptions = Apollo.BaseMutationOptions<PinSampleMutation, PinSampleMutationVariables>;
export const DeleteStageDocument = gql`
    mutation DeleteStage($id: ID!) {
  deleteStage(id: $id) {
    id
  }
}
    `;
export type DeleteStageMutationFn = Apollo.MutationFunction<DeleteStageMutation, DeleteStageMutationVariables>;

/**
 * __useDeleteStageMutation__
 *
 * To run a mutation, you first call `useDeleteStageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteStageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteStageMutation, { data, loading, error }] = useDeleteStageMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteStageMutation(baseOptions?: Apollo.MutationHookOptions<DeleteStageMutation, DeleteStageMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteStageMutation, DeleteStageMutationVariables>(DeleteStageDocument, options);
      }
export type DeleteStageMutationHookResult = ReturnType<typeof useDeleteStageMutation>;
export type DeleteStageMutationResult = Apollo.MutationResult<DeleteStageMutation>;
export type DeleteStageMutationOptions = Apollo.BaseMutationOptions<DeleteStageMutation, DeleteStageMutationVariables>;
export const UpdateStageDocument = gql`
    mutation UpdateStage($id: ID!, $tags: [String], $name: String!) {
  updateStage(id: $id, tags: $tags, name: $name) {
    ...Stage
  }
}
    ${StageFragmentDoc}`;
export type UpdateStageMutationFn = Apollo.MutationFunction<UpdateStageMutation, UpdateStageMutationVariables>;

/**
 * __useUpdateStageMutation__
 *
 * To run a mutation, you first call `useUpdateStageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateStageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateStageMutation, { data, loading, error }] = useUpdateStageMutation({
 *   variables: {
 *      id: // value for 'id'
 *      tags: // value for 'tags'
 *      name: // value for 'name'
 *   },
 * });
 */
export function useUpdateStageMutation(baseOptions?: Apollo.MutationHookOptions<UpdateStageMutation, UpdateStageMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateStageMutation, UpdateStageMutationVariables>(UpdateStageDocument, options);
      }
export type UpdateStageMutationHookResult = ReturnType<typeof useUpdateStageMutation>;
export type UpdateStageMutationResult = Apollo.MutationResult<UpdateStageMutation>;
export type UpdateStageMutationOptions = Apollo.BaseMutationOptions<UpdateStageMutation, UpdateStageMutationVariables>;
export const CreateStageDocument = gql`
    mutation CreateStage($name: String!, $tags: [String]) {
  createStage(name: $name, tags: $tags) {
    ...Stage
  }
}
    ${StageFragmentDoc}`;
export type CreateStageMutationFn = Apollo.MutationFunction<CreateStageMutation, CreateStageMutationVariables>;

/**
 * __useCreateStageMutation__
 *
 * To run a mutation, you first call `useCreateStageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateStageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createStageMutation, { data, loading, error }] = useCreateStageMutation({
 *   variables: {
 *      name: // value for 'name'
 *      tags: // value for 'tags'
 *   },
 * });
 */
export function useCreateStageMutation(baseOptions?: Apollo.MutationHookOptions<CreateStageMutation, CreateStageMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateStageMutation, CreateStageMutationVariables>(CreateStageDocument, options);
      }
export type CreateStageMutationHookResult = ReturnType<typeof useCreateStageMutation>;
export type CreateStageMutationResult = Apollo.MutationResult<CreateStageMutation>;
export type CreateStageMutationOptions = Apollo.BaseMutationOptions<CreateStageMutation, CreateStageMutationVariables>;
export const PinStageDocument = gql`
    mutation PinStage($id: ID!, $pin: Boolean!) {
  pinStage(id: $id, pin: $pin) {
    id
    pinnedBy {
      id
      email
    }
    pinned
  }
}
    `;
export type PinStageMutationFn = Apollo.MutationFunction<PinStageMutation, PinStageMutationVariables>;

/**
 * __usePinStageMutation__
 *
 * To run a mutation, you first call `usePinStageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePinStageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pinStageMutation, { data, loading, error }] = usePinStageMutation({
 *   variables: {
 *      id: // value for 'id'
 *      pin: // value for 'pin'
 *   },
 * });
 */
export function usePinStageMutation(baseOptions?: Apollo.MutationHookOptions<PinStageMutation, PinStageMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PinStageMutation, PinStageMutationVariables>(PinStageDocument, options);
      }
export type PinStageMutationHookResult = ReturnType<typeof usePinStageMutation>;
export type PinStageMutationResult = Apollo.MutationResult<PinStageMutation>;
export type PinStageMutationOptions = Apollo.BaseMutationOptions<PinStageMutation, PinStageMutationVariables>;
export const DeleteTableDocument = gql`
    mutation DeleteTable($id: ID!) {
  deleteTable(id: $id) {
    id
  }
}
    `;
export type DeleteTableMutationFn = Apollo.MutationFunction<DeleteTableMutation, DeleteTableMutationVariables>;

/**
 * __useDeleteTableMutation__
 *
 * To run a mutation, you first call `useDeleteTableMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteTableMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteTableMutation, { data, loading, error }] = useDeleteTableMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteTableMutation(baseOptions?: Apollo.MutationHookOptions<DeleteTableMutation, DeleteTableMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteTableMutation, DeleteTableMutationVariables>(DeleteTableDocument, options);
      }
export type DeleteTableMutationHookResult = ReturnType<typeof useDeleteTableMutation>;
export type DeleteTableMutationResult = Apollo.MutationResult<DeleteTableMutation>;
export type DeleteTableMutationOptions = Apollo.BaseMutationOptions<DeleteTableMutation, DeleteTableMutationVariables>;
export const Create_ThumbnailDocument = gql`
    mutation create_thumbnail($rep: ID!, $file: ImageFile!) {
  uploadThumbnail(rep: $rep, file: $file) {
    ...Thumbnail
  }
}
    ${ThumbnailFragmentDoc}`;
export type Create_ThumbnailMutationFn = Apollo.MutationFunction<Create_ThumbnailMutation, Create_ThumbnailMutationVariables>;

/**
 * __useCreate_ThumbnailMutation__
 *
 * To run a mutation, you first call `useCreate_ThumbnailMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreate_ThumbnailMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createThumbnailMutation, { data, loading, error }] = useCreate_ThumbnailMutation({
 *   variables: {
 *      rep: // value for 'rep'
 *      file: // value for 'file'
 *   },
 * });
 */
export function useCreate_ThumbnailMutation(baseOptions?: Apollo.MutationHookOptions<Create_ThumbnailMutation, Create_ThumbnailMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Create_ThumbnailMutation, Create_ThumbnailMutationVariables>(Create_ThumbnailDocument, options);
      }
export type Create_ThumbnailMutationHookResult = ReturnType<typeof useCreate_ThumbnailMutation>;
export type Create_ThumbnailMutationResult = Apollo.MutationResult<Create_ThumbnailMutation>;
export type Create_ThumbnailMutationOptions = Apollo.BaseMutationOptions<Create_ThumbnailMutation, Create_ThumbnailMutationVariables>;
export const GetChannelDocument = gql`
    query GetChannel($id: ID!) {
  channel(id: $id) {
    ...Channel
  }
}
    ${ChannelFragmentDoc}`;

/**
 * __useGetChannelQuery__
 *
 * To run a query within a React component, call `useGetChannelQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetChannelQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetChannelQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetChannelQuery(baseOptions: Apollo.QueryHookOptions<GetChannelQuery, GetChannelQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetChannelQuery, GetChannelQueryVariables>(GetChannelDocument, options);
      }
export function useGetChannelLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetChannelQuery, GetChannelQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetChannelQuery, GetChannelQueryVariables>(GetChannelDocument, options);
        }
export type GetChannelQueryHookResult = ReturnType<typeof useGetChannelQuery>;
export type GetChannelLazyQueryHookResult = ReturnType<typeof useGetChannelLazyQuery>;
export type GetChannelQueryResult = Apollo.QueryResult<GetChannelQuery, GetChannelQueryVariables>;
export const SearchChannelsDocument = gql`
    query SearchChannels($search: String, $values: [ID]) {
  options: channels(name: $search, limit: 30, ids: $values) {
    value: id
    label: name
  }
}
    `;

/**
 * __useSearchChannelsQuery__
 *
 * To run a query within a React component, call `useSearchChannelsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchChannelsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchChannelsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSearchChannelsQuery(baseOptions?: Apollo.QueryHookOptions<SearchChannelsQuery, SearchChannelsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchChannelsQuery, SearchChannelsQueryVariables>(SearchChannelsDocument, options);
      }
export function useSearchChannelsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchChannelsQuery, SearchChannelsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchChannelsQuery, SearchChannelsQueryVariables>(SearchChannelsDocument, options);
        }
export type SearchChannelsQueryHookResult = ReturnType<typeof useSearchChannelsQuery>;
export type SearchChannelsLazyQueryHookResult = ReturnType<typeof useSearchChannelsLazyQuery>;
export type SearchChannelsQueryResult = Apollo.QueryResult<SearchChannelsQuery, SearchChannelsQueryVariables>;
export const CommentsForDocument = gql`
    query CommentsFor($id: ID!, $model: CommentableModels!) {
  commentsfor(model: $model, id: $id) {
    ...ListComment
  }
}
    ${ListCommentFragmentDoc}`;

/**
 * __useCommentsForQuery__
 *
 * To run a query within a React component, call `useCommentsForQuery` and pass it any options that fit your needs.
 * When your component renders, `useCommentsForQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCommentsForQuery({
 *   variables: {
 *      id: // value for 'id'
 *      model: // value for 'model'
 *   },
 * });
 */
export function useCommentsForQuery(baseOptions: Apollo.QueryHookOptions<CommentsForQuery, CommentsForQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CommentsForQuery, CommentsForQueryVariables>(CommentsForDocument, options);
      }
export function useCommentsForLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CommentsForQuery, CommentsForQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CommentsForQuery, CommentsForQueryVariables>(CommentsForDocument, options);
        }
export type CommentsForQueryHookResult = ReturnType<typeof useCommentsForQuery>;
export type CommentsForLazyQueryHookResult = ReturnType<typeof useCommentsForLazyQuery>;
export type CommentsForQueryResult = Apollo.QueryResult<CommentsForQuery, CommentsForQueryVariables>;
export const MyMentionsDocument = gql`
    query MyMentions {
  mymentions {
    ...MentionComment
  }
}
    ${MentionCommentFragmentDoc}`;

/**
 * __useMyMentionsQuery__
 *
 * To run a query within a React component, call `useMyMentionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyMentionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyMentionsQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyMentionsQuery(baseOptions?: Apollo.QueryHookOptions<MyMentionsQuery, MyMentionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyMentionsQuery, MyMentionsQueryVariables>(MyMentionsDocument, options);
      }
export function useMyMentionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyMentionsQuery, MyMentionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyMentionsQuery, MyMentionsQueryVariables>(MyMentionsDocument, options);
        }
export type MyMentionsQueryHookResult = ReturnType<typeof useMyMentionsQuery>;
export type MyMentionsLazyQueryHookResult = ReturnType<typeof useMyMentionsLazyQuery>;
export type MyMentionsQueryResult = Apollo.QueryResult<MyMentionsQuery, MyMentionsQueryVariables>;
export const DetailCommentDocument = gql`
    query DetailComment($id: ID!) {
  comment(id: $id) {
    ...DetailComment
  }
}
    ${DetailCommentFragmentDoc}`;

/**
 * __useDetailCommentQuery__
 *
 * To run a query within a React component, call `useDetailCommentQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailCommentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailCommentQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailCommentQuery(baseOptions: Apollo.QueryHookOptions<DetailCommentQuery, DetailCommentQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailCommentQuery, DetailCommentQueryVariables>(DetailCommentDocument, options);
      }
export function useDetailCommentLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailCommentQuery, DetailCommentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailCommentQuery, DetailCommentQueryVariables>(DetailCommentDocument, options);
        }
export type DetailCommentQueryHookResult = ReturnType<typeof useDetailCommentQuery>;
export type DetailCommentLazyQueryHookResult = ReturnType<typeof useDetailCommentLazyQuery>;
export type DetailCommentQueryResult = Apollo.QueryResult<DetailCommentQuery, DetailCommentQueryVariables>;
export const MyContextsDocument = gql`
    query MyContexts($limit: Int, $offset: Int, $createdDay: DateTime) {
  mycontexts(limit: $limit, offset: $offset, createdDay: $createdDay) {
    ...ListContext
  }
}
    ${ListContextFragmentDoc}`;

/**
 * __useMyContextsQuery__
 *
 * To run a query within a React component, call `useMyContextsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyContextsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyContextsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      createdDay: // value for 'createdDay'
 *   },
 * });
 */
export function useMyContextsQuery(baseOptions?: Apollo.QueryHookOptions<MyContextsQuery, MyContextsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyContextsQuery, MyContextsQueryVariables>(MyContextsDocument, options);
      }
export function useMyContextsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyContextsQuery, MyContextsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyContextsQuery, MyContextsQueryVariables>(MyContextsDocument, options);
        }
export type MyContextsQueryHookResult = ReturnType<typeof useMyContextsQuery>;
export type MyContextsLazyQueryHookResult = ReturnType<typeof useMyContextsLazyQuery>;
export type MyContextsQueryResult = Apollo.QueryResult<MyContextsQuery, MyContextsQueryVariables>;
export const DetailContextDocument = gql`
    query DetailContext($id: ID!) {
  context(id: $id) {
    ...DetailContext
  }
}
    ${DetailContextFragmentDoc}`;

/**
 * __useDetailContextQuery__
 *
 * To run a query within a React component, call `useDetailContextQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailContextQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailContextQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailContextQuery(baseOptions: Apollo.QueryHookOptions<DetailContextQuery, DetailContextQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailContextQuery, DetailContextQueryVariables>(DetailContextDocument, options);
      }
export function useDetailContextLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailContextQuery, DetailContextQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailContextQuery, DetailContextQueryVariables>(DetailContextDocument, options);
        }
export type DetailContextQueryHookResult = ReturnType<typeof useDetailContextQuery>;
export type DetailContextLazyQueryHookResult = ReturnType<typeof useDetailContextLazyQuery>;
export type DetailContextQueryResult = Apollo.QueryResult<DetailContextQuery, DetailContextQueryVariables>;
export const SearchContextsDocument = gql`
    query SearchContexts($search: String, $values: [ID]) {
  options: contexts(name: $search, limit: 10, ids: $values) {
    label: name
    value: id
  }
}
    `;

/**
 * __useSearchContextsQuery__
 *
 * To run a query within a React component, call `useSearchContextsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchContextsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchContextsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSearchContextsQuery(baseOptions?: Apollo.QueryHookOptions<SearchContextsQuery, SearchContextsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchContextsQuery, SearchContextsQueryVariables>(SearchContextsDocument, options);
      }
export function useSearchContextsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchContextsQuery, SearchContextsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchContextsQuery, SearchContextsQueryVariables>(SearchContextsDocument, options);
        }
export type SearchContextsQueryHookResult = ReturnType<typeof useSearchContextsQuery>;
export type SearchContextsLazyQueryHookResult = ReturnType<typeof useSearchContextsLazyQuery>;
export type SearchContextsQueryResult = Apollo.QueryResult<SearchContextsQuery, SearchContextsQueryVariables>;
export const DashboardQueryDocument = gql`
    query DashboardQuery($limit: Int, $id: ID!, $order: String) {
  stage(id: $id) {
    name
    id
    positions {
      id
      x
      y
      z
      omeros(limit: $limit, order: $order) {
        id
        acquisitionDate
        representation {
          name
          id
          store
          shape
          latestThumbnail {
            id
            image
            blurhash
          }
          metrics(flatten: 3) {
            id
            key
            value
          }
        }
      }
    }
  }
}
    `;

/**
 * __useDashboardQueryQuery__
 *
 * To run a query within a React component, call `useDashboardQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useDashboardQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDashboardQueryQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      id: // value for 'id'
 *      order: // value for 'order'
 *   },
 * });
 */
export function useDashboardQueryQuery(baseOptions: Apollo.QueryHookOptions<DashboardQueryQuery, DashboardQueryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DashboardQueryQuery, DashboardQueryQueryVariables>(DashboardQueryDocument, options);
      }
export function useDashboardQueryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DashboardQueryQuery, DashboardQueryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DashboardQueryQuery, DashboardQueryQueryVariables>(DashboardQueryDocument, options);
        }
export type DashboardQueryQueryHookResult = ReturnType<typeof useDashboardQueryQuery>;
export type DashboardQueryLazyQueryHookResult = ReturnType<typeof useDashboardQueryLazyQuery>;
export type DashboardQueryQueryResult = Apollo.QueryResult<DashboardQueryQuery, DashboardQueryQueryVariables>;
export const MyDatasetsDocument = gql`
    query MyDatasets($limit: Int, $offset: Int, $createdDay: DateTime) {
  mydatasets(limit: $limit, offset: $offset, createdDay: $createdDay) {
    ...ListDataset
  }
}
    ${ListDatasetFragmentDoc}`;

/**
 * __useMyDatasetsQuery__
 *
 * To run a query within a React component, call `useMyDatasetsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyDatasetsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyDatasetsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      createdDay: // value for 'createdDay'
 *   },
 * });
 */
export function useMyDatasetsQuery(baseOptions?: Apollo.QueryHookOptions<MyDatasetsQuery, MyDatasetsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyDatasetsQuery, MyDatasetsQueryVariables>(MyDatasetsDocument, options);
      }
export function useMyDatasetsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyDatasetsQuery, MyDatasetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyDatasetsQuery, MyDatasetsQueryVariables>(MyDatasetsDocument, options);
        }
export type MyDatasetsQueryHookResult = ReturnType<typeof useMyDatasetsQuery>;
export type MyDatasetsLazyQueryHookResult = ReturnType<typeof useMyDatasetsLazyQuery>;
export type MyDatasetsQueryResult = Apollo.QueryResult<MyDatasetsQuery, MyDatasetsQueryVariables>;
export const DetailDatasetDocument = gql`
    query DetailDataset($id: ID!) {
  dataset(id: $id) {
    ...DetailDataset
  }
}
    ${DetailDatasetFragmentDoc}`;

/**
 * __useDetailDatasetQuery__
 *
 * To run a query within a React component, call `useDetailDatasetQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailDatasetQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailDatasetQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailDatasetQuery(baseOptions: Apollo.QueryHookOptions<DetailDatasetQuery, DetailDatasetQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailDatasetQuery, DetailDatasetQueryVariables>(DetailDatasetDocument, options);
      }
export function useDetailDatasetLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailDatasetQuery, DetailDatasetQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailDatasetQuery, DetailDatasetQueryVariables>(DetailDatasetDocument, options);
        }
export type DetailDatasetQueryHookResult = ReturnType<typeof useDetailDatasetQuery>;
export type DetailDatasetLazyQueryHookResult = ReturnType<typeof useDetailDatasetLazyQuery>;
export type DetailDatasetQueryResult = Apollo.QueryResult<DetailDatasetQuery, DetailDatasetQueryVariables>;
export const SearchDatasetsDocument = gql`
    query SearchDatasets($search: String) {
  options: datasets(name: $search, limit: 10) {
    label: name
    value: id
  }
}
    `;

/**
 * __useSearchDatasetsQuery__
 *
 * To run a query within a React component, call `useSearchDatasetsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchDatasetsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchDatasetsQuery({
 *   variables: {
 *      search: // value for 'search'
 *   },
 * });
 */
export function useSearchDatasetsQuery(baseOptions?: Apollo.QueryHookOptions<SearchDatasetsQuery, SearchDatasetsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchDatasetsQuery, SearchDatasetsQueryVariables>(SearchDatasetsDocument, options);
      }
export function useSearchDatasetsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchDatasetsQuery, SearchDatasetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchDatasetsQuery, SearchDatasetsQueryVariables>(SearchDatasetsDocument, options);
        }
export type SearchDatasetsQueryHookResult = ReturnType<typeof useSearchDatasetsQuery>;
export type SearchDatasetsLazyQueryHookResult = ReturnType<typeof useSearchDatasetsLazyQuery>;
export type SearchDatasetsQueryResult = Apollo.QueryResult<SearchDatasetsQuery, SearchDatasetsQueryVariables>;
export const DownloadFilesDocument = gql`
    query DownloadFiles($dataset: ID!) {
  dataset(id: $dataset) {
    omerofiles {
      file
      name
    }
  }
}
    `;

/**
 * __useDownloadFilesQuery__
 *
 * To run a query within a React component, call `useDownloadFilesQuery` and pass it any options that fit your needs.
 * When your component renders, `useDownloadFilesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDownloadFilesQuery({
 *   variables: {
 *      dataset: // value for 'dataset'
 *   },
 * });
 */
export function useDownloadFilesQuery(baseOptions: Apollo.QueryHookOptions<DownloadFilesQuery, DownloadFilesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DownloadFilesQuery, DownloadFilesQueryVariables>(DownloadFilesDocument, options);
      }
export function useDownloadFilesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DownloadFilesQuery, DownloadFilesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DownloadFilesQuery, DownloadFilesQueryVariables>(DownloadFilesDocument, options);
        }
export type DownloadFilesQueryHookResult = ReturnType<typeof useDownloadFilesQuery>;
export type DownloadFilesLazyQueryHookResult = ReturnType<typeof useDownloadFilesLazyQuery>;
export type DownloadFilesQueryResult = Apollo.QueryResult<DownloadFilesQuery, DownloadFilesQueryVariables>;
export const DetailEraDocument = gql`
    query DetailEra($id: ID!) {
  era(id: $id) {
    ...Era
  }
}
    ${EraFragmentDoc}`;

/**
 * __useDetailEraQuery__
 *
 * To run a query within a React component, call `useDetailEraQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailEraQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailEraQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailEraQuery(baseOptions: Apollo.QueryHookOptions<DetailEraQuery, DetailEraQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailEraQuery, DetailEraQueryVariables>(DetailEraDocument, options);
      }
export function useDetailEraLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailEraQuery, DetailEraQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailEraQuery, DetailEraQueryVariables>(DetailEraDocument, options);
        }
export type DetailEraQueryHookResult = ReturnType<typeof useDetailEraQuery>;
export type DetailEraLazyQueryHookResult = ReturnType<typeof useDetailEraLazyQuery>;
export type DetailEraQueryResult = Apollo.QueryResult<DetailEraQuery, DetailEraQueryVariables>;
export const MyErasDocument = gql`
    query MyEras($limit: Int, $offset: Int, $createdDay: DateTime) {
  myeras(limit: $limit, offset: $offset, createdDay: $createdDay) {
    ...ListEra
  }
}
    ${ListEraFragmentDoc}`;

/**
 * __useMyErasQuery__
 *
 * To run a query within a React component, call `useMyErasQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyErasQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyErasQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      createdDay: // value for 'createdDay'
 *   },
 * });
 */
export function useMyErasQuery(baseOptions?: Apollo.QueryHookOptions<MyErasQuery, MyErasQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyErasQuery, MyErasQueryVariables>(MyErasDocument, options);
      }
export function useMyErasLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyErasQuery, MyErasQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyErasQuery, MyErasQueryVariables>(MyErasDocument, options);
        }
export type MyErasQueryHookResult = ReturnType<typeof useMyErasQuery>;
export type MyErasLazyQueryHookResult = ReturnType<typeof useMyErasLazyQuery>;
export type MyErasQueryResult = Apollo.QueryResult<MyErasQuery, MyErasQueryVariables>;
export const EraSearchDocument = gql`
    query EraSearch($search: String) {
  options: eras(name: $search, limit: 30) {
    value: id
    label: name
  }
}
    `;

/**
 * __useEraSearchQuery__
 *
 * To run a query within a React component, call `useEraSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useEraSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useEraSearchQuery({
 *   variables: {
 *      search: // value for 'search'
 *   },
 * });
 */
export function useEraSearchQuery(baseOptions?: Apollo.QueryHookOptions<EraSearchQuery, EraSearchQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<EraSearchQuery, EraSearchQueryVariables>(EraSearchDocument, options);
      }
export function useEraSearchLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<EraSearchQuery, EraSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<EraSearchQuery, EraSearchQueryVariables>(EraSearchDocument, options);
        }
export type EraSearchQueryHookResult = ReturnType<typeof useEraSearchQuery>;
export type EraSearchLazyQueryHookResult = ReturnType<typeof useEraSearchLazyQuery>;
export type EraSearchQueryResult = Apollo.QueryResult<EraSearchQuery, EraSearchQueryVariables>;
export const MyExperimentsDocument = gql`
    query MyExperiments($limit: Int, $offset: Int, $createdDay: DateTime) {
  myexperiments(limit: $limit, offset: $offset, createdDay: $createdDay) {
    ...ListExperiment
  }
}
    ${ListExperimentFragmentDoc}`;

/**
 * __useMyExperimentsQuery__
 *
 * To run a query within a React component, call `useMyExperimentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyExperimentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyExperimentsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      createdDay: // value for 'createdDay'
 *   },
 * });
 */
export function useMyExperimentsQuery(baseOptions?: Apollo.QueryHookOptions<MyExperimentsQuery, MyExperimentsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyExperimentsQuery, MyExperimentsQueryVariables>(MyExperimentsDocument, options);
      }
export function useMyExperimentsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyExperimentsQuery, MyExperimentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyExperimentsQuery, MyExperimentsQueryVariables>(MyExperimentsDocument, options);
        }
export type MyExperimentsQueryHookResult = ReturnType<typeof useMyExperimentsQuery>;
export type MyExperimentsLazyQueryHookResult = ReturnType<typeof useMyExperimentsLazyQuery>;
export type MyExperimentsQueryResult = Apollo.QueryResult<MyExperimentsQuery, MyExperimentsQueryVariables>;
export const DetailExperimentDocument = gql`
    query DetailExperiment($id: ID!) {
  experiment(id: $id) {
    ...DetailExperiment
  }
}
    ${DetailExperimentFragmentDoc}`;

/**
 * __useDetailExperimentQuery__
 *
 * To run a query within a React component, call `useDetailExperimentQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailExperimentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailExperimentQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailExperimentQuery(baseOptions: Apollo.QueryHookOptions<DetailExperimentQuery, DetailExperimentQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailExperimentQuery, DetailExperimentQueryVariables>(DetailExperimentDocument, options);
      }
export function useDetailExperimentLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailExperimentQuery, DetailExperimentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailExperimentQuery, DetailExperimentQueryVariables>(DetailExperimentDocument, options);
        }
export type DetailExperimentQueryHookResult = ReturnType<typeof useDetailExperimentQuery>;
export type DetailExperimentLazyQueryHookResult = ReturnType<typeof useDetailExperimentLazyQuery>;
export type DetailExperimentQueryResult = Apollo.QueryResult<DetailExperimentQuery, DetailExperimentQueryVariables>;
export const SearchExperimentsDocument = gql`
    query SearchExperiments($search: String, $values: [ID]) {
  options: experiments(name: $search, limit: 10, ids: $values) {
    label: name
    value: id
  }
}
    `;

/**
 * __useSearchExperimentsQuery__
 *
 * To run a query within a React component, call `useSearchExperimentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchExperimentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchExperimentsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSearchExperimentsQuery(baseOptions?: Apollo.QueryHookOptions<SearchExperimentsQuery, SearchExperimentsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchExperimentsQuery, SearchExperimentsQueryVariables>(SearchExperimentsDocument, options);
      }
export function useSearchExperimentsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchExperimentsQuery, SearchExperimentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchExperimentsQuery, SearchExperimentsQueryVariables>(SearchExperimentsDocument, options);
        }
export type SearchExperimentsQueryHookResult = ReturnType<typeof useSearchExperimentsQuery>;
export type SearchExperimentsLazyQueryHookResult = ReturnType<typeof useSearchExperimentsLazyQuery>;
export type SearchExperimentsQueryResult = Apollo.QueryResult<SearchExperimentsQuery, SearchExperimentsQueryVariables>;
export const GlobalSearchDocument = gql`
    query GlobalSearch($search: String, $createdBefore: DateTime, $createdAfter: DateTime, $tags: [String], $creator: ID, $pinned: Boolean, $createdDay: DateTime, $stages: [ID]) {
  experiments: myexperiments(
    name: $search
    limit: 10
    createdBefore: $createdBefore
    createdAfter: $createdAfter
    tags: $tags
    creator: $creator
    pinned: $pinned
    createdDay: $createdDay
  ) {
    id
    name
    description
  }
  samples: mysamples(
    name: $search
    limit: 10
    createdBefore: $createdBefore
    createdAfter: $createdAfter
    tags: $tags
    creator: $creator
    pinned: $pinned
    createdDay: $createdDay
  ) {
    id
    name
  }
  datasets: datasets(
    name: $search
    limit: 10
    createdBefore: $createdBefore
    createdAfter: $createdAfter
    pinned: $pinned
    createdDay: $createdDay
  ) {
    id
    name
  }
  tables: mytables(
    name: $search
    limit: 10
    createdBefore: $createdBefore
    createdAfter: $createdAfter
    tags: $tags
    creator: $creator
    pinned: $pinned
    createdDay: $createdDay
  ) {
    id
    name
  }
  representations: myrepresentations(
    name: $search
    limit: 10
    createdBefore: $createdBefore
    createdAfter: $createdAfter
    tags: $tags
    creator: $creator
    pinned: $pinned
    stages: $stages
    createdDay: $createdDay
  ) {
    id
    name
    latestThumbnail {
      image
    }
  }
  files: myomerofiles(name: $search, limit: 10, createdDay: $createdDay) {
    id
    name
  }
}
    `;

/**
 * __useGlobalSearchQuery__
 *
 * To run a query within a React component, call `useGlobalSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useGlobalSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGlobalSearchQuery({
 *   variables: {
 *      search: // value for 'search'
 *      createdBefore: // value for 'createdBefore'
 *      createdAfter: // value for 'createdAfter'
 *      tags: // value for 'tags'
 *      creator: // value for 'creator'
 *      pinned: // value for 'pinned'
 *      createdDay: // value for 'createdDay'
 *      stages: // value for 'stages'
 *   },
 * });
 */
export function useGlobalSearchQuery(baseOptions?: Apollo.QueryHookOptions<GlobalSearchQuery, GlobalSearchQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GlobalSearchQuery, GlobalSearchQueryVariables>(GlobalSearchDocument, options);
      }
export function useGlobalSearchLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GlobalSearchQuery, GlobalSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GlobalSearchQuery, GlobalSearchQueryVariables>(GlobalSearchDocument, options);
        }
export type GlobalSearchQueryHookResult = ReturnType<typeof useGlobalSearchQuery>;
export type GlobalSearchLazyQueryHookResult = ReturnType<typeof useGlobalSearchLazyQuery>;
export type GlobalSearchQueryResult = Apollo.QueryResult<GlobalSearchQuery, GlobalSearchQueryVariables>;
export const MyGraphsDocument = gql`
    query MyGraphs($limit: Int, $offset: Int, $createdDay: DateTime) {
  mygraphs(limit: $limit, offset: $offset, createdDay: $createdDay) {
    ...ListGraph
  }
}
    ${ListGraphFragmentDoc}`;

/**
 * __useMyGraphsQuery__
 *
 * To run a query within a React component, call `useMyGraphsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyGraphsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyGraphsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      createdDay: // value for 'createdDay'
 *   },
 * });
 */
export function useMyGraphsQuery(baseOptions?: Apollo.QueryHookOptions<MyGraphsQuery, MyGraphsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyGraphsQuery, MyGraphsQueryVariables>(MyGraphsDocument, options);
      }
export function useMyGraphsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyGraphsQuery, MyGraphsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyGraphsQuery, MyGraphsQueryVariables>(MyGraphsDocument, options);
        }
export type MyGraphsQueryHookResult = ReturnType<typeof useMyGraphsQuery>;
export type MyGraphsLazyQueryHookResult = ReturnType<typeof useMyGraphsLazyQuery>;
export type MyGraphsQueryResult = Apollo.QueryResult<MyGraphsQuery, MyGraphsQueryVariables>;
export const DetailGraphDocument = gql`
    query DetailGraph($id: ID!) {
  graph(id: $id) {
    ...DetailGraph
  }
}
    ${DetailGraphFragmentDoc}`;

/**
 * __useDetailGraphQuery__
 *
 * To run a query within a React component, call `useDetailGraphQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailGraphQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailGraphQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailGraphQuery(baseOptions: Apollo.QueryHookOptions<DetailGraphQuery, DetailGraphQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailGraphQuery, DetailGraphQueryVariables>(DetailGraphDocument, options);
      }
export function useDetailGraphLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailGraphQuery, DetailGraphQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailGraphQuery, DetailGraphQueryVariables>(DetailGraphDocument, options);
        }
export type DetailGraphQueryHookResult = ReturnType<typeof useDetailGraphQuery>;
export type DetailGraphLazyQueryHookResult = ReturnType<typeof useDetailGraphLazyQuery>;
export type DetailGraphQueryResult = Apollo.QueryResult<DetailGraphQuery, DetailGraphQueryVariables>;
export const SearchGraphsDocument = gql`
    query SearchGraphs($search: String, $values: [ID!]) {
  options: models(name: $search, ids: $values, limit: 10) {
    label: name
    value: id
  }
}
    `;

/**
 * __useSearchGraphsQuery__
 *
 * To run a query within a React component, call `useSearchGraphsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchGraphsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchGraphsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSearchGraphsQuery(baseOptions?: Apollo.QueryHookOptions<SearchGraphsQuery, SearchGraphsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchGraphsQuery, SearchGraphsQueryVariables>(SearchGraphsDocument, options);
      }
export function useSearchGraphsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchGraphsQuery, SearchGraphsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchGraphsQuery, SearchGraphsQueryVariables>(SearchGraphsDocument, options);
        }
export type SearchGraphsQueryHookResult = ReturnType<typeof useSearchGraphsQuery>;
export type SearchGraphsLazyQueryHookResult = ReturnType<typeof useSearchGraphsLazyQuery>;
export type SearchGraphsQueryResult = Apollo.QueryResult<SearchGraphsQuery, SearchGraphsQueryVariables>;
export const DetailInstrumentDocument = gql`
    query DetailInstrument($id: ID!) {
  instrument(id: $id) {
    ...Instrument
  }
}
    ${InstrumentFragmentDoc}`;

/**
 * __useDetailInstrumentQuery__
 *
 * To run a query within a React component, call `useDetailInstrumentQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailInstrumentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailInstrumentQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailInstrumentQuery(baseOptions: Apollo.QueryHookOptions<DetailInstrumentQuery, DetailInstrumentQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailInstrumentQuery, DetailInstrumentQueryVariables>(DetailInstrumentDocument, options);
      }
export function useDetailInstrumentLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailInstrumentQuery, DetailInstrumentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailInstrumentQuery, DetailInstrumentQueryVariables>(DetailInstrumentDocument, options);
        }
export type DetailInstrumentQueryHookResult = ReturnType<typeof useDetailInstrumentQuery>;
export type DetailInstrumentLazyQueryHookResult = ReturnType<typeof useDetailInstrumentLazyQuery>;
export type DetailInstrumentQueryResult = Apollo.QueryResult<DetailInstrumentQuery, DetailInstrumentQueryVariables>;
export const InstrumentsDocument = gql`
    query Instruments {
  instruments {
    ...ListInstrument
  }
}
    ${ListInstrumentFragmentDoc}`;

/**
 * __useInstrumentsQuery__
 *
 * To run a query within a React component, call `useInstrumentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useInstrumentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useInstrumentsQuery({
 *   variables: {
 *   },
 * });
 */
export function useInstrumentsQuery(baseOptions?: Apollo.QueryHookOptions<InstrumentsQuery, InstrumentsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<InstrumentsQuery, InstrumentsQueryVariables>(InstrumentsDocument, options);
      }
export function useInstrumentsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<InstrumentsQuery, InstrumentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<InstrumentsQuery, InstrumentsQueryVariables>(InstrumentsDocument, options);
        }
export type InstrumentsQueryHookResult = ReturnType<typeof useInstrumentsQuery>;
export type InstrumentsLazyQueryHookResult = ReturnType<typeof useInstrumentsLazyQuery>;
export type InstrumentsQueryResult = Apollo.QueryResult<InstrumentsQuery, InstrumentsQueryVariables>;
export const InstrumentSearchDocument = gql`
    query InstrumentSearch($search: String) {
  options: instruments(name: $search, limit: 30) {
    value: id
    label: name
  }
}
    `;

/**
 * __useInstrumentSearchQuery__
 *
 * To run a query within a React component, call `useInstrumentSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useInstrumentSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useInstrumentSearchQuery({
 *   variables: {
 *      search: // value for 'search'
 *   },
 * });
 */
export function useInstrumentSearchQuery(baseOptions?: Apollo.QueryHookOptions<InstrumentSearchQuery, InstrumentSearchQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<InstrumentSearchQuery, InstrumentSearchQueryVariables>(InstrumentSearchDocument, options);
      }
export function useInstrumentSearchLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<InstrumentSearchQuery, InstrumentSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<InstrumentSearchQuery, InstrumentSearchQueryVariables>(InstrumentSearchDocument, options);
        }
export type InstrumentSearchQueryHookResult = ReturnType<typeof useInstrumentSearchQuery>;
export type InstrumentSearchLazyQueryHookResult = ReturnType<typeof useInstrumentSearchLazyQuery>;
export type InstrumentSearchQueryResult = Apollo.QueryResult<InstrumentSearchQuery, InstrumentSearchQueryVariables>;
export const LinksDocument = gql`
    query Links($limit: Int, $offset: Int) {
  links(limit: $limit, offset: $offset) {
    ...ListLink
  }
}
    ${ListLinkFragmentDoc}`;

/**
 * __useLinksQuery__
 *
 * To run a query within a React component, call `useLinksQuery` and pass it any options that fit your needs.
 * When your component renders, `useLinksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useLinksQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useLinksQuery(baseOptions?: Apollo.QueryHookOptions<LinksQuery, LinksQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<LinksQuery, LinksQueryVariables>(LinksDocument, options);
      }
export function useLinksLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<LinksQuery, LinksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<LinksQuery, LinksQueryVariables>(LinksDocument, options);
        }
export type LinksQueryHookResult = ReturnType<typeof useLinksQuery>;
export type LinksLazyQueryHookResult = ReturnType<typeof useLinksLazyQuery>;
export type LinksQueryResult = Apollo.QueryResult<LinksQuery, LinksQueryVariables>;
export const DetailLinkDocument = gql`
    query DetailLink($id: ID!) {
  link(id: $id) {
    ...DetailLink
  }
}
    ${DetailLinkFragmentDoc}`;

/**
 * __useDetailLinkQuery__
 *
 * To run a query within a React component, call `useDetailLinkQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailLinkQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailLinkQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailLinkQuery(baseOptions: Apollo.QueryHookOptions<DetailLinkQuery, DetailLinkQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailLinkQuery, DetailLinkQueryVariables>(DetailLinkDocument, options);
      }
export function useDetailLinkLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailLinkQuery, DetailLinkQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailLinkQuery, DetailLinkQueryVariables>(DetailLinkDocument, options);
        }
export type DetailLinkQueryHookResult = ReturnType<typeof useDetailLinkQuery>;
export type DetailLinkLazyQueryHookResult = ReturnType<typeof useDetailLinkLazyQuery>;
export type DetailLinkQueryResult = Apollo.QueryResult<DetailLinkQuery, DetailLinkQueryVariables>;
export const SearchLinksDocument = gql`
    query SearchLinks($search: String) {
  options: links(relation: $search, limit: 10) {
    label: id
    value: id
  }
}
    `;

/**
 * __useSearchLinksQuery__
 *
 * To run a query within a React component, call `useSearchLinksQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchLinksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchLinksQuery({
 *   variables: {
 *      search: // value for 'search'
 *   },
 * });
 */
export function useSearchLinksQuery(baseOptions?: Apollo.QueryHookOptions<SearchLinksQuery, SearchLinksQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchLinksQuery, SearchLinksQueryVariables>(SearchLinksDocument, options);
      }
export function useSearchLinksLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchLinksQuery, SearchLinksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchLinksQuery, SearchLinksQueryVariables>(SearchLinksDocument, options);
        }
export type SearchLinksQueryHookResult = ReturnType<typeof useSearchLinksQuery>;
export type SearchLinksLazyQueryHookResult = ReturnType<typeof useSearchLinksLazyQuery>;
export type SearchLinksQueryResult = Apollo.QueryResult<SearchLinksQuery, SearchLinksQueryVariables>;
export const DetailMetaDocument = gql`
    query DetailMeta($id: ID!) {
  meta(id: $id) {
    ...DetailOmero
  }
}
    ${DetailOmeroFragmentDoc}`;

/**
 * __useDetailMetaQuery__
 *
 * To run a query within a React component, call `useDetailMetaQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailMetaQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailMetaQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailMetaQuery(baseOptions: Apollo.QueryHookOptions<DetailMetaQuery, DetailMetaQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailMetaQuery, DetailMetaQueryVariables>(DetailMetaDocument, options);
      }
export function useDetailMetaLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailMetaQuery, DetailMetaQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailMetaQuery, DetailMetaQueryVariables>(DetailMetaDocument, options);
        }
export type DetailMetaQueryHookResult = ReturnType<typeof useDetailMetaQuery>;
export type DetailMetaLazyQueryHookResult = ReturnType<typeof useDetailMetaLazyQuery>;
export type DetailMetaQueryResult = Apollo.QueryResult<DetailMetaQuery, DetailMetaQueryVariables>;
export const DetailMetricDocument = gql`
    query DetailMetric($id: ID!) {
  metric(id: $id) {
    key
    value
  }
}
    `;

/**
 * __useDetailMetricQuery__
 *
 * To run a query within a React component, call `useDetailMetricQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailMetricQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailMetricQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailMetricQuery(baseOptions: Apollo.QueryHookOptions<DetailMetricQuery, DetailMetricQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailMetricQuery, DetailMetricQueryVariables>(DetailMetricDocument, options);
      }
export function useDetailMetricLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailMetricQuery, DetailMetricQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailMetricQuery, DetailMetricQueryVariables>(DetailMetricDocument, options);
        }
export type DetailMetricQueryHookResult = ReturnType<typeof useDetailMetricQuery>;
export type DetailMetricLazyQueryHookResult = ReturnType<typeof useDetailMetricLazyQuery>;
export type DetailMetricQueryResult = Apollo.QueryResult<DetailMetricQuery, DetailMetricQueryVariables>;
export const MyModelsDocument = gql`
    query MyModels($limit: Int, $offset: Int, $createdDay: DateTime) {
  mymodels(limit: $limit, offset: $offset, createdDay: $createdDay) {
    ...ListModel
  }
}
    ${ListModelFragmentDoc}`;

/**
 * __useMyModelsQuery__
 *
 * To run a query within a React component, call `useMyModelsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyModelsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyModelsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      createdDay: // value for 'createdDay'
 *   },
 * });
 */
export function useMyModelsQuery(baseOptions?: Apollo.QueryHookOptions<MyModelsQuery, MyModelsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyModelsQuery, MyModelsQueryVariables>(MyModelsDocument, options);
      }
export function useMyModelsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyModelsQuery, MyModelsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyModelsQuery, MyModelsQueryVariables>(MyModelsDocument, options);
        }
export type MyModelsQueryHookResult = ReturnType<typeof useMyModelsQuery>;
export type MyModelsLazyQueryHookResult = ReturnType<typeof useMyModelsLazyQuery>;
export type MyModelsQueryResult = Apollo.QueryResult<MyModelsQuery, MyModelsQueryVariables>;
export const DetailModelDocument = gql`
    query DetailModel($id: ID!) {
  model(id: $id) {
    ...DetailModel
  }
}
    ${DetailModelFragmentDoc}`;

/**
 * __useDetailModelQuery__
 *
 * To run a query within a React component, call `useDetailModelQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailModelQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailModelQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailModelQuery(baseOptions: Apollo.QueryHookOptions<DetailModelQuery, DetailModelQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailModelQuery, DetailModelQueryVariables>(DetailModelDocument, options);
      }
export function useDetailModelLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailModelQuery, DetailModelQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailModelQuery, DetailModelQueryVariables>(DetailModelDocument, options);
        }
export type DetailModelQueryHookResult = ReturnType<typeof useDetailModelQuery>;
export type DetailModelLazyQueryHookResult = ReturnType<typeof useDetailModelLazyQuery>;
export type DetailModelQueryResult = Apollo.QueryResult<DetailModelQuery, DetailModelQueryVariables>;
export const SearchModelsDocument = gql`
    query SearchModels($search: String) {
  options: models(name: $search, limit: 10) {
    label: name
    value: id
  }
}
    `;

/**
 * __useSearchModelsQuery__
 *
 * To run a query within a React component, call `useSearchModelsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchModelsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchModelsQuery({
 *   variables: {
 *      search: // value for 'search'
 *   },
 * });
 */
export function useSearchModelsQuery(baseOptions?: Apollo.QueryHookOptions<SearchModelsQuery, SearchModelsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchModelsQuery, SearchModelsQueryVariables>(SearchModelsDocument, options);
      }
export function useSearchModelsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchModelsQuery, SearchModelsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchModelsQuery, SearchModelsQueryVariables>(SearchModelsDocument, options);
        }
export type SearchModelsQueryHookResult = ReturnType<typeof useSearchModelsQuery>;
export type SearchModelsLazyQueryHookResult = ReturnType<typeof useSearchModelsLazyQuery>;
export type SearchModelsQueryResult = Apollo.QueryResult<SearchModelsQuery, SearchModelsQueryVariables>;
export const DetailObjectiveDocument = gql`
    query DetailObjective($id: ID) {
  objective(id: $id) {
    ...Objective
  }
}
    ${ObjectiveFragmentDoc}`;

/**
 * __useDetailObjectiveQuery__
 *
 * To run a query within a React component, call `useDetailObjectiveQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailObjectiveQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailObjectiveQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailObjectiveQuery(baseOptions?: Apollo.QueryHookOptions<DetailObjectiveQuery, DetailObjectiveQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailObjectiveQuery, DetailObjectiveQueryVariables>(DetailObjectiveDocument, options);
      }
export function useDetailObjectiveLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailObjectiveQuery, DetailObjectiveQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailObjectiveQuery, DetailObjectiveQueryVariables>(DetailObjectiveDocument, options);
        }
export type DetailObjectiveQueryHookResult = ReturnType<typeof useDetailObjectiveQuery>;
export type DetailObjectiveLazyQueryHookResult = ReturnType<typeof useDetailObjectiveLazyQuery>;
export type DetailObjectiveQueryResult = Apollo.QueryResult<DetailObjectiveQuery, DetailObjectiveQueryVariables>;
export const ObjectivesDocument = gql`
    query Objectives {
  objectives {
    ...ListObjective
  }
}
    ${ListObjectiveFragmentDoc}`;

/**
 * __useObjectivesQuery__
 *
 * To run a query within a React component, call `useObjectivesQuery` and pass it any options that fit your needs.
 * When your component renders, `useObjectivesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useObjectivesQuery({
 *   variables: {
 *   },
 * });
 */
export function useObjectivesQuery(baseOptions?: Apollo.QueryHookOptions<ObjectivesQuery, ObjectivesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ObjectivesQuery, ObjectivesQueryVariables>(ObjectivesDocument, options);
      }
export function useObjectivesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ObjectivesQuery, ObjectivesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ObjectivesQuery, ObjectivesQueryVariables>(ObjectivesDocument, options);
        }
export type ObjectivesQueryHookResult = ReturnType<typeof useObjectivesQuery>;
export type ObjectivesLazyQueryHookResult = ReturnType<typeof useObjectivesLazyQuery>;
export type ObjectivesQueryResult = Apollo.QueryResult<ObjectivesQuery, ObjectivesQueryVariables>;
export const SearchObjectivesDocument = gql`
    query SearchObjectives($search: String) {
  options: objectives(search: $search) {
    value: id
    label: name
  }
}
    `;

/**
 * __useSearchObjectivesQuery__
 *
 * To run a query within a React component, call `useSearchObjectivesQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchObjectivesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchObjectivesQuery({
 *   variables: {
 *      search: // value for 'search'
 *   },
 * });
 */
export function useSearchObjectivesQuery(baseOptions?: Apollo.QueryHookOptions<SearchObjectivesQuery, SearchObjectivesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchObjectivesQuery, SearchObjectivesQueryVariables>(SearchObjectivesDocument, options);
      }
export function useSearchObjectivesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchObjectivesQuery, SearchObjectivesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchObjectivesQuery, SearchObjectivesQueryVariables>(SearchObjectivesDocument, options);
        }
export type SearchObjectivesQueryHookResult = ReturnType<typeof useSearchObjectivesQuery>;
export type SearchObjectivesLazyQueryHookResult = ReturnType<typeof useSearchObjectivesLazyQuery>;
export type SearchObjectivesQueryResult = Apollo.QueryResult<SearchObjectivesQuery, SearchObjectivesQueryVariables>;
export const MyOmeroFilesDocument = gql`
    query MyOmeroFiles($limit: Int, $offset: Int, $createdDay: DateTime) {
  myomerofiles(limit: $limit, offset: $offset, createdDay: $createdDay) {
    ...ListOmeroFile
  }
}
    ${ListOmeroFileFragmentDoc}`;

/**
 * __useMyOmeroFilesQuery__
 *
 * To run a query within a React component, call `useMyOmeroFilesQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyOmeroFilesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyOmeroFilesQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      createdDay: // value for 'createdDay'
 *   },
 * });
 */
export function useMyOmeroFilesQuery(baseOptions?: Apollo.QueryHookOptions<MyOmeroFilesQuery, MyOmeroFilesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyOmeroFilesQuery, MyOmeroFilesQueryVariables>(MyOmeroFilesDocument, options);
      }
export function useMyOmeroFilesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyOmeroFilesQuery, MyOmeroFilesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyOmeroFilesQuery, MyOmeroFilesQueryVariables>(MyOmeroFilesDocument, options);
        }
export type MyOmeroFilesQueryHookResult = ReturnType<typeof useMyOmeroFilesQuery>;
export type MyOmeroFilesLazyQueryHookResult = ReturnType<typeof useMyOmeroFilesLazyQuery>;
export type MyOmeroFilesQueryResult = Apollo.QueryResult<MyOmeroFilesQuery, MyOmeroFilesQueryVariables>;
export const DetailOmeroFileDocument = gql`
    query DetailOmeroFile($id: ID!) {
  omerofile(id: $id) {
    ...DetailOmeroFile
  }
}
    ${DetailOmeroFileFragmentDoc}`;

/**
 * __useDetailOmeroFileQuery__
 *
 * To run a query within a React component, call `useDetailOmeroFileQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailOmeroFileQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailOmeroFileQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailOmeroFileQuery(baseOptions: Apollo.QueryHookOptions<DetailOmeroFileQuery, DetailOmeroFileQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailOmeroFileQuery, DetailOmeroFileQueryVariables>(DetailOmeroFileDocument, options);
      }
export function useDetailOmeroFileLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailOmeroFileQuery, DetailOmeroFileQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailOmeroFileQuery, DetailOmeroFileQueryVariables>(DetailOmeroFileDocument, options);
        }
export type DetailOmeroFileQueryHookResult = ReturnType<typeof useDetailOmeroFileQuery>;
export type DetailOmeroFileLazyQueryHookResult = ReturnType<typeof useDetailOmeroFileLazyQuery>;
export type DetailOmeroFileQueryResult = Apollo.QueryResult<DetailOmeroFileQuery, DetailOmeroFileQueryVariables>;
export const PermissionOptionsDocument = gql`
    query PermissionOptions($model: SharableModels!, $search: String) {
  options: permissionsFor(model: $model, name: $search) {
    label: name
    value: unique
  }
}
    `;

/**
 * __usePermissionOptionsQuery__
 *
 * To run a query within a React component, call `usePermissionOptionsQuery` and pass it any options that fit your needs.
 * When your component renders, `usePermissionOptionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePermissionOptionsQuery({
 *   variables: {
 *      model: // value for 'model'
 *      search: // value for 'search'
 *   },
 * });
 */
export function usePermissionOptionsQuery(baseOptions: Apollo.QueryHookOptions<PermissionOptionsQuery, PermissionOptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PermissionOptionsQuery, PermissionOptionsQueryVariables>(PermissionOptionsDocument, options);
      }
export function usePermissionOptionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PermissionOptionsQuery, PermissionOptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PermissionOptionsQuery, PermissionOptionsQueryVariables>(PermissionOptionsDocument, options);
        }
export type PermissionOptionsQueryHookResult = ReturnType<typeof usePermissionOptionsQuery>;
export type PermissionOptionsLazyQueryHookResult = ReturnType<typeof usePermissionOptionsLazyQuery>;
export type PermissionOptionsQueryResult = Apollo.QueryResult<PermissionOptionsQuery, PermissionOptionsQueryVariables>;
export const PermissionsOfDocument = gql`
    query PermissionsOf($model: SharableModels!, $id: ID!) {
  permissionsOf(model: $model, id: $id) {
    available {
      name
    }
    options: available {
      label: name
      value: codename
    }
    groupAssignments {
      ...GroupAssignment
    }
    userAssignments {
      ...UserAssignment
    }
  }
}
    ${GroupAssignmentFragmentDoc}
${UserAssignmentFragmentDoc}`;

/**
 * __usePermissionsOfQuery__
 *
 * To run a query within a React component, call `usePermissionsOfQuery` and pass it any options that fit your needs.
 * When your component renders, `usePermissionsOfQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePermissionsOfQuery({
 *   variables: {
 *      model: // value for 'model'
 *      id: // value for 'id'
 *   },
 * });
 */
export function usePermissionsOfQuery(baseOptions: Apollo.QueryHookOptions<PermissionsOfQuery, PermissionsOfQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PermissionsOfQuery, PermissionsOfQueryVariables>(PermissionsOfDocument, options);
      }
export function usePermissionsOfLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PermissionsOfQuery, PermissionsOfQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PermissionsOfQuery, PermissionsOfQueryVariables>(PermissionsOfDocument, options);
        }
export type PermissionsOfQueryHookResult = ReturnType<typeof usePermissionsOfQuery>;
export type PermissionsOfLazyQueryHookResult = ReturnType<typeof usePermissionsOfLazyQuery>;
export type PermissionsOfQueryResult = Apollo.QueryResult<PermissionsOfQuery, PermissionsOfQueryVariables>;
export const DetailPlotDocument = gql`
    query DetailPlot($id: ID!) {
  plot(id: $id) {
    ...Plot
  }
}
    ${PlotFragmentDoc}`;

/**
 * __useDetailPlotQuery__
 *
 * To run a query within a React component, call `useDetailPlotQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailPlotQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailPlotQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailPlotQuery(baseOptions: Apollo.QueryHookOptions<DetailPlotQuery, DetailPlotQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailPlotQuery, DetailPlotQueryVariables>(DetailPlotDocument, options);
      }
export function useDetailPlotLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailPlotQuery, DetailPlotQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailPlotQuery, DetailPlotQueryVariables>(DetailPlotDocument, options);
        }
export type DetailPlotQueryHookResult = ReturnType<typeof useDetailPlotQuery>;
export type DetailPlotLazyQueryHookResult = ReturnType<typeof useDetailPlotLazyQuery>;
export type DetailPlotQueryResult = Apollo.QueryResult<DetailPlotQuery, DetailPlotQueryVariables>;
export const MyPlotsDocument = gql`
    query MyPlots($limit: Int, $offset: Int, $createdDay: DateTime) {
  myplots(limit: $limit, offset: $offset, createdDay: $createdDay) {
    ...ListPlot
  }
}
    ${ListPlotFragmentDoc}`;

/**
 * __useMyPlotsQuery__
 *
 * To run a query within a React component, call `useMyPlotsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyPlotsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyPlotsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      createdDay: // value for 'createdDay'
 *   },
 * });
 */
export function useMyPlotsQuery(baseOptions?: Apollo.QueryHookOptions<MyPlotsQuery, MyPlotsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyPlotsQuery, MyPlotsQueryVariables>(MyPlotsDocument, options);
      }
export function useMyPlotsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyPlotsQuery, MyPlotsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyPlotsQuery, MyPlotsQueryVariables>(MyPlotsDocument, options);
        }
export type MyPlotsQueryHookResult = ReturnType<typeof useMyPlotsQuery>;
export type MyPlotsLazyQueryHookResult = ReturnType<typeof useMyPlotsLazyQuery>;
export type MyPlotsQueryResult = Apollo.QueryResult<MyPlotsQuery, MyPlotsQueryVariables>;
export const DetailPositionDocument = gql`
    query DetailPosition($id: ID!) {
  position(id: $id) {
    ...Position
  }
}
    ${PositionFragmentDoc}`;

/**
 * __useDetailPositionQuery__
 *
 * To run a query within a React component, call `useDetailPositionQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailPositionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailPositionQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailPositionQuery(baseOptions: Apollo.QueryHookOptions<DetailPositionQuery, DetailPositionQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailPositionQuery, DetailPositionQueryVariables>(DetailPositionDocument, options);
      }
export function useDetailPositionLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailPositionQuery, DetailPositionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailPositionQuery, DetailPositionQueryVariables>(DetailPositionDocument, options);
        }
export type DetailPositionQueryHookResult = ReturnType<typeof useDetailPositionQuery>;
export type DetailPositionLazyQueryHookResult = ReturnType<typeof useDetailPositionLazyQuery>;
export type DetailPositionQueryResult = Apollo.QueryResult<DetailPositionQuery, DetailPositionQueryVariables>;
export const PositionSearchDocument = gql`
    query PositionSearch($search: String, $stage: ID) {
  options: positions(name: $search, limit: 30, stage: $stage) {
    value: id
    label: name
  }
}
    `;

/**
 * __usePositionSearchQuery__
 *
 * To run a query within a React component, call `usePositionSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `usePositionSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePositionSearchQuery({
 *   variables: {
 *      search: // value for 'search'
 *      stage: // value for 'stage'
 *   },
 * });
 */
export function usePositionSearchQuery(baseOptions?: Apollo.QueryHookOptions<PositionSearchQuery, PositionSearchQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PositionSearchQuery, PositionSearchQueryVariables>(PositionSearchDocument, options);
      }
export function usePositionSearchLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PositionSearchQuery, PositionSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PositionSearchQuery, PositionSearchQueryVariables>(PositionSearchDocument, options);
        }
export type PositionSearchQueryHookResult = ReturnType<typeof usePositionSearchQuery>;
export type PositionSearchLazyQueryHookResult = ReturnType<typeof usePositionSearchLazyQuery>;
export type PositionSearchQueryResult = Apollo.QueryResult<PositionSearchQuery, PositionSearchQueryVariables>;
export const ProvenanceDocument = gql`
    query Provenance($ids: [ID]!) {
  provenance(createdWhiles: $ids) {
    __typename
    ... on Representation {
      ...ListRepresentation
    }
    ... on ROI {
      id
      label
      createdAt
    }
    ... on Sample {
      id
      createdAt
    }
    ... on Context {
      id
      createdAt
    }
    ... on Context {
      id
      createdAt
    }
  }
}
    ${ListRepresentationFragmentDoc}`;

/**
 * __useProvenanceQuery__
 *
 * To run a query within a React component, call `useProvenanceQuery` and pass it any options that fit your needs.
 * When your component renders, `useProvenanceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProvenanceQuery({
 *   variables: {
 *      ids: // value for 'ids'
 *   },
 * });
 */
export function useProvenanceQuery(baseOptions: Apollo.QueryHookOptions<ProvenanceQuery, ProvenanceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProvenanceQuery, ProvenanceQueryVariables>(ProvenanceDocument, options);
      }
export function useProvenanceLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProvenanceQuery, ProvenanceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProvenanceQuery, ProvenanceQueryVariables>(ProvenanceDocument, options);
        }
export type ProvenanceQueryHookResult = ReturnType<typeof useProvenanceQuery>;
export type ProvenanceLazyQueryHookResult = ReturnType<typeof useProvenanceLazyQuery>;
export type ProvenanceQueryResult = Apollo.QueryResult<ProvenanceQuery, ProvenanceQueryVariables>;
export const MyRelationsDocument = gql`
    query MyRelations($limit: Int, $offset: Int) {
  relations(limit: $limit, offset: $offset) {
    ...ListRelation
  }
}
    ${ListRelationFragmentDoc}`;

/**
 * __useMyRelationsQuery__
 *
 * To run a query within a React component, call `useMyRelationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyRelationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyRelationsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useMyRelationsQuery(baseOptions?: Apollo.QueryHookOptions<MyRelationsQuery, MyRelationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyRelationsQuery, MyRelationsQueryVariables>(MyRelationsDocument, options);
      }
export function useMyRelationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyRelationsQuery, MyRelationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyRelationsQuery, MyRelationsQueryVariables>(MyRelationsDocument, options);
        }
export type MyRelationsQueryHookResult = ReturnType<typeof useMyRelationsQuery>;
export type MyRelationsLazyQueryHookResult = ReturnType<typeof useMyRelationsLazyQuery>;
export type MyRelationsQueryResult = Apollo.QueryResult<MyRelationsQuery, MyRelationsQueryVariables>;
export const DetailRelationDocument = gql`
    query DetailRelation($id: ID!) {
  relation(id: $id) {
    ...DetailRelation
  }
}
    ${DetailRelationFragmentDoc}`;

/**
 * __useDetailRelationQuery__
 *
 * To run a query within a React component, call `useDetailRelationQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailRelationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailRelationQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailRelationQuery(baseOptions: Apollo.QueryHookOptions<DetailRelationQuery, DetailRelationQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailRelationQuery, DetailRelationQueryVariables>(DetailRelationDocument, options);
      }
export function useDetailRelationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailRelationQuery, DetailRelationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailRelationQuery, DetailRelationQueryVariables>(DetailRelationDocument, options);
        }
export type DetailRelationQueryHookResult = ReturnType<typeof useDetailRelationQuery>;
export type DetailRelationLazyQueryHookResult = ReturnType<typeof useDetailRelationLazyQuery>;
export type DetailRelationQueryResult = Apollo.QueryResult<DetailRelationQuery, DetailRelationQueryVariables>;
export const SearchRelationsDocument = gql`
    query SearchRelations($search: String, $values: [ID]) {
  options: relations(name: $search, limit: 10, ids: $values) {
    label: name
    value: id
  }
}
    `;

/**
 * __useSearchRelationsQuery__
 *
 * To run a query within a React component, call `useSearchRelationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchRelationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchRelationsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSearchRelationsQuery(baseOptions?: Apollo.QueryHookOptions<SearchRelationsQuery, SearchRelationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchRelationsQuery, SearchRelationsQueryVariables>(SearchRelationsDocument, options);
      }
export function useSearchRelationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchRelationsQuery, SearchRelationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchRelationsQuery, SearchRelationsQueryVariables>(SearchRelationsDocument, options);
        }
export type SearchRelationsQueryHookResult = ReturnType<typeof useSearchRelationsQuery>;
export type SearchRelationsLazyQueryHookResult = ReturnType<typeof useSearchRelationsLazyQuery>;
export type SearchRelationsQueryResult = Apollo.QueryResult<SearchRelationsQuery, SearchRelationsQueryVariables>;
export const DetailRepresentationDocument = gql`
    query DetailRepresentation($id: ID!) {
  representation(id: $id) {
    ...DetailRepresentation
  }
}
    ${DetailRepresentationFragmentDoc}`;

/**
 * __useDetailRepresentationQuery__
 *
 * To run a query within a React component, call `useDetailRepresentationQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailRepresentationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailRepresentationQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailRepresentationQuery(baseOptions: Apollo.QueryHookOptions<DetailRepresentationQuery, DetailRepresentationQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailRepresentationQuery, DetailRepresentationQueryVariables>(DetailRepresentationDocument, options);
      }
export function useDetailRepresentationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailRepresentationQuery, DetailRepresentationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailRepresentationQuery, DetailRepresentationQueryVariables>(DetailRepresentationDocument, options);
        }
export type DetailRepresentationQueryHookResult = ReturnType<typeof useDetailRepresentationQuery>;
export type DetailRepresentationLazyQueryHookResult = ReturnType<typeof useDetailRepresentationLazyQuery>;
export type DetailRepresentationQueryResult = Apollo.QueryResult<DetailRepresentationQuery, DetailRepresentationQueryVariables>;
export const MyRepresentationsDocument = gql`
    query MyRepresentations($limit: Int, $offset: Int, $order: [String], $noChildren: Boolean = true, $createdDay: DateTime) {
  myrepresentations(
    limit: $limit
    offset: $offset
    order: $order
    noChildren: $noChildren
    createdDay: $createdDay
  ) {
    ...ListRepresentation
  }
}
    ${ListRepresentationFragmentDoc}`;

/**
 * __useMyRepresentationsQuery__
 *
 * To run a query within a React component, call `useMyRepresentationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyRepresentationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyRepresentationsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      order: // value for 'order'
 *      noChildren: // value for 'noChildren'
 *      createdDay: // value for 'createdDay'
 *   },
 * });
 */
export function useMyRepresentationsQuery(baseOptions?: Apollo.QueryHookOptions<MyRepresentationsQuery, MyRepresentationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyRepresentationsQuery, MyRepresentationsQueryVariables>(MyRepresentationsDocument, options);
      }
export function useMyRepresentationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyRepresentationsQuery, MyRepresentationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyRepresentationsQuery, MyRepresentationsQueryVariables>(MyRepresentationsDocument, options);
        }
export type MyRepresentationsQueryHookResult = ReturnType<typeof useMyRepresentationsQuery>;
export type MyRepresentationsLazyQueryHookResult = ReturnType<typeof useMyRepresentationsLazyQuery>;
export type MyRepresentationsQueryResult = Apollo.QueryResult<MyRepresentationsQuery, MyRepresentationsQueryVariables>;
export const SharedRepresentationsDocument = gql`
    query SharedRepresentations {
  sharedrepresentations {
    ...ListSharedRepresentation
  }
}
    ${ListSharedRepresentationFragmentDoc}`;

/**
 * __useSharedRepresentationsQuery__
 *
 * To run a query within a React component, call `useSharedRepresentationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSharedRepresentationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSharedRepresentationsQuery({
 *   variables: {
 *   },
 * });
 */
export function useSharedRepresentationsQuery(baseOptions?: Apollo.QueryHookOptions<SharedRepresentationsQuery, SharedRepresentationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SharedRepresentationsQuery, SharedRepresentationsQueryVariables>(SharedRepresentationsDocument, options);
      }
export function useSharedRepresentationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SharedRepresentationsQuery, SharedRepresentationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SharedRepresentationsQuery, SharedRepresentationsQueryVariables>(SharedRepresentationsDocument, options);
        }
export type SharedRepresentationsQueryHookResult = ReturnType<typeof useSharedRepresentationsQuery>;
export type SharedRepresentationsLazyQueryHookResult = ReturnType<typeof useSharedRepresentationsLazyQuery>;
export type SharedRepresentationsQueryResult = Apollo.QueryResult<SharedRepresentationsQuery, SharedRepresentationsQueryVariables>;
export const RepresentationsForDocument = gql`
    query RepresentationsFor($group: String!) {
  representationsForGroup(name: $group) {
    ...ListSharedRepresentation
  }
}
    ${ListSharedRepresentationFragmentDoc}`;

/**
 * __useRepresentationsForQuery__
 *
 * To run a query within a React component, call `useRepresentationsForQuery` and pass it any options that fit your needs.
 * When your component renders, `useRepresentationsForQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRepresentationsForQuery({
 *   variables: {
 *      group: // value for 'group'
 *   },
 * });
 */
export function useRepresentationsForQuery(baseOptions: Apollo.QueryHookOptions<RepresentationsForQuery, RepresentationsForQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RepresentationsForQuery, RepresentationsForQueryVariables>(RepresentationsForDocument, options);
      }
export function useRepresentationsForLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RepresentationsForQuery, RepresentationsForQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RepresentationsForQuery, RepresentationsForQueryVariables>(RepresentationsForDocument, options);
        }
export type RepresentationsForQueryHookResult = ReturnType<typeof useRepresentationsForQuery>;
export type RepresentationsForLazyQueryHookResult = ReturnType<typeof useRepresentationsForLazyQuery>;
export type RepresentationsForQueryResult = Apollo.QueryResult<RepresentationsForQuery, RepresentationsForQueryVariables>;
export const RepresentationsForUserDocument = gql`
    query RepresentationsForUser($email: String!) {
  representationsForUser(email: $email) {
    ...ListSharedRepresentation
  }
}
    ${ListSharedRepresentationFragmentDoc}`;

/**
 * __useRepresentationsForUserQuery__
 *
 * To run a query within a React component, call `useRepresentationsForUserQuery` and pass it any options that fit your needs.
 * When your component renders, `useRepresentationsForUserQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRepresentationsForUserQuery({
 *   variables: {
 *      email: // value for 'email'
 *   },
 * });
 */
export function useRepresentationsForUserQuery(baseOptions: Apollo.QueryHookOptions<RepresentationsForUserQuery, RepresentationsForUserQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RepresentationsForUserQuery, RepresentationsForUserQueryVariables>(RepresentationsForUserDocument, options);
      }
export function useRepresentationsForUserLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RepresentationsForUserQuery, RepresentationsForUserQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RepresentationsForUserQuery, RepresentationsForUserQueryVariables>(RepresentationsForUserDocument, options);
        }
export type RepresentationsForUserQueryHookResult = ReturnType<typeof useRepresentationsForUserQuery>;
export type RepresentationsForUserLazyQueryHookResult = ReturnType<typeof useRepresentationsForUserLazyQuery>;
export type RepresentationsForUserQueryResult = Apollo.QueryResult<RepresentationsForUserQuery, RepresentationsForUserQueryVariables>;
export const SearchableRepresentationsDocument = gql`
    query SearchableRepresentations($limit: Int, $offset: Int, $samples: [ID], $name: String, $experiments: [ID], $tags: [String], $derivedTags: [String], $createdAfter: DateTime, $createdBefore: DateTime) {
  myrepresentations(
    limit: $limit
    name: $name
    offset: $offset
    samples: $samples
    experiments: $experiments
    tags: $tags
    derivedTags: $derivedTags
    createdAfter: $createdAfter
    createdBefore: $createdBefore
  ) {
    ...ListRepresentation
  }
}
    ${ListRepresentationFragmentDoc}`;

/**
 * __useSearchableRepresentationsQuery__
 *
 * To run a query within a React component, call `useSearchableRepresentationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchableRepresentationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchableRepresentationsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      samples: // value for 'samples'
 *      name: // value for 'name'
 *      experiments: // value for 'experiments'
 *      tags: // value for 'tags'
 *      derivedTags: // value for 'derivedTags'
 *      createdAfter: // value for 'createdAfter'
 *      createdBefore: // value for 'createdBefore'
 *   },
 * });
 */
export function useSearchableRepresentationsQuery(baseOptions?: Apollo.QueryHookOptions<SearchableRepresentationsQuery, SearchableRepresentationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchableRepresentationsQuery, SearchableRepresentationsQueryVariables>(SearchableRepresentationsDocument, options);
      }
export function useSearchableRepresentationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchableRepresentationsQuery, SearchableRepresentationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchableRepresentationsQuery, SearchableRepresentationsQueryVariables>(SearchableRepresentationsDocument, options);
        }
export type SearchableRepresentationsQueryHookResult = ReturnType<typeof useSearchableRepresentationsQuery>;
export type SearchableRepresentationsLazyQueryHookResult = ReturnType<typeof useSearchableRepresentationsLazyQuery>;
export type SearchableRepresentationsQueryResult = Apollo.QueryResult<SearchableRepresentationsQuery, SearchableRepresentationsQueryVariables>;
export const RepresentationFilterSearchDocument = gql`
    query RepresentationFilterSearch($value: String!) {
  Samples: samples(name: $value, offset: 0, limit: 10) {
    label: name
    value: id
  }
  Experiments: myexperiments(name: $value, offset: 0, limit: 10) {
    label: name
    value: id
  }
  Tags: tags(name: $value, offset: 0, limit: 10) {
    label: name
    value: name
  }
  DerivedTags: tags(name: $value, offset: 0, limit: 10) {
    label: name
    value: name
  }
}
    `;

/**
 * __useRepresentationFilterSearchQuery__
 *
 * To run a query within a React component, call `useRepresentationFilterSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useRepresentationFilterSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRepresentationFilterSearchQuery({
 *   variables: {
 *      value: // value for 'value'
 *   },
 * });
 */
export function useRepresentationFilterSearchQuery(baseOptions: Apollo.QueryHookOptions<RepresentationFilterSearchQuery, RepresentationFilterSearchQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RepresentationFilterSearchQuery, RepresentationFilterSearchQueryVariables>(RepresentationFilterSearchDocument, options);
      }
export function useRepresentationFilterSearchLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RepresentationFilterSearchQuery, RepresentationFilterSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RepresentationFilterSearchQuery, RepresentationFilterSearchQueryVariables>(RepresentationFilterSearchDocument, options);
        }
export type RepresentationFilterSearchQueryHookResult = ReturnType<typeof useRepresentationFilterSearchQuery>;
export type RepresentationFilterSearchLazyQueryHookResult = ReturnType<typeof useRepresentationFilterSearchLazyQuery>;
export type RepresentationFilterSearchQueryResult = Apollo.QueryResult<RepresentationFilterSearchQuery, RepresentationFilterSearchQueryVariables>;
export const PinnedRepresentationsDocument = gql`
    query PinnedRepresentations {
  representations(pinned: true) {
    ...ListRepresentation
  }
}
    ${ListRepresentationFragmentDoc}`;

/**
 * __usePinnedRepresentationsQuery__
 *
 * To run a query within a React component, call `usePinnedRepresentationsQuery` and pass it any options that fit your needs.
 * When your component renders, `usePinnedRepresentationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePinnedRepresentationsQuery({
 *   variables: {
 *   },
 * });
 */
export function usePinnedRepresentationsQuery(baseOptions?: Apollo.QueryHookOptions<PinnedRepresentationsQuery, PinnedRepresentationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PinnedRepresentationsQuery, PinnedRepresentationsQueryVariables>(PinnedRepresentationsDocument, options);
      }
export function usePinnedRepresentationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PinnedRepresentationsQuery, PinnedRepresentationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PinnedRepresentationsQuery, PinnedRepresentationsQueryVariables>(PinnedRepresentationsDocument, options);
        }
export type PinnedRepresentationsQueryHookResult = ReturnType<typeof usePinnedRepresentationsQuery>;
export type PinnedRepresentationsLazyQueryHookResult = ReturnType<typeof usePinnedRepresentationsLazyQuery>;
export type PinnedRepresentationsQueryResult = Apollo.QueryResult<PinnedRepresentationsQuery, PinnedRepresentationsQueryVariables>;
export const RequestDocument = gql`
    query Request {
  request {
    accessKey
    secretKey
    status
    sessionToken
  }
}
    `;

/**
 * __useRequestQuery__
 *
 * To run a query within a React component, call `useRequestQuery` and pass it any options that fit your needs.
 * When your component renders, `useRequestQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRequestQuery({
 *   variables: {
 *   },
 * });
 */
export function useRequestQuery(baseOptions?: Apollo.QueryHookOptions<RequestQuery, RequestQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RequestQuery, RequestQueryVariables>(RequestDocument, options);
      }
export function useRequestLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RequestQuery, RequestQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RequestQuery, RequestQueryVariables>(RequestDocument, options);
        }
export type RequestQueryHookResult = ReturnType<typeof useRequestQuery>;
export type RequestLazyQueryHookResult = ReturnType<typeof useRequestLazyQuery>;
export type RequestQueryResult = Apollo.QueryResult<RequestQuery, RequestQueryVariables>;
export const RoisForRepresentationDocument = gql`
    query RoisForRepresentation($representation: ID!, $type: [RoiTypeInput]) {
  rois(representation: $representation, type: $type) {
    ...RepRoi
  }
}
    ${RepRoiFragmentDoc}`;

/**
 * __useRoisForRepresentationQuery__
 *
 * To run a query within a React component, call `useRoisForRepresentationQuery` and pass it any options that fit your needs.
 * When your component renders, `useRoisForRepresentationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRoisForRepresentationQuery({
 *   variables: {
 *      representation: // value for 'representation'
 *      type: // value for 'type'
 *   },
 * });
 */
export function useRoisForRepresentationQuery(baseOptions: Apollo.QueryHookOptions<RoisForRepresentationQuery, RoisForRepresentationQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RoisForRepresentationQuery, RoisForRepresentationQueryVariables>(RoisForRepresentationDocument, options);
      }
export function useRoisForRepresentationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RoisForRepresentationQuery, RoisForRepresentationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RoisForRepresentationQuery, RoisForRepresentationQueryVariables>(RoisForRepresentationDocument, options);
        }
export type RoisForRepresentationQueryHookResult = ReturnType<typeof useRoisForRepresentationQuery>;
export type RoisForRepresentationLazyQueryHookResult = ReturnType<typeof useRoisForRepresentationLazyQuery>;
export type RoisForRepresentationQueryResult = Apollo.QueryResult<RoisForRepresentationQuery, RoisForRepresentationQueryVariables>;
export const DetailRoiDocument = gql`
    query DetailRoi($id: ID!) {
  roi(id: $id) {
    ...DetailRoi
  }
}
    ${DetailRoiFragmentDoc}`;

/**
 * __useDetailRoiQuery__
 *
 * To run a query within a React component, call `useDetailRoiQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailRoiQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailRoiQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailRoiQuery(baseOptions: Apollo.QueryHookOptions<DetailRoiQuery, DetailRoiQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailRoiQuery, DetailRoiQueryVariables>(DetailRoiDocument, options);
      }
export function useDetailRoiLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailRoiQuery, DetailRoiQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailRoiQuery, DetailRoiQueryVariables>(DetailRoiDocument, options);
        }
export type DetailRoiQueryHookResult = ReturnType<typeof useDetailRoiQuery>;
export type DetailRoiLazyQueryHookResult = ReturnType<typeof useDetailRoiLazyQuery>;
export type DetailRoiQueryResult = Apollo.QueryResult<DetailRoiQuery, DetailRoiQueryVariables>;
export const DetailSampleDocument = gql`
    query DetailSample($id: ID!) {
  sample(id: $id) {
    ...DetailSample
  }
}
    ${DetailSampleFragmentDoc}`;

/**
 * __useDetailSampleQuery__
 *
 * To run a query within a React component, call `useDetailSampleQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailSampleQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailSampleQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailSampleQuery(baseOptions: Apollo.QueryHookOptions<DetailSampleQuery, DetailSampleQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailSampleQuery, DetailSampleQueryVariables>(DetailSampleDocument, options);
      }
export function useDetailSampleLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailSampleQuery, DetailSampleQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailSampleQuery, DetailSampleQueryVariables>(DetailSampleDocument, options);
        }
export type DetailSampleQueryHookResult = ReturnType<typeof useDetailSampleQuery>;
export type DetailSampleLazyQueryHookResult = ReturnType<typeof useDetailSampleLazyQuery>;
export type DetailSampleQueryResult = Apollo.QueryResult<DetailSampleQuery, DetailSampleQueryVariables>;
export const MySamplesDocument = gql`
    query MySamples($limit: Int, $offset: Int, $createdDay: DateTime) {
  mysamples(limit: $limit, offset: $offset, createdDay: $createdDay) {
    ...ListSample
  }
}
    ${ListSampleFragmentDoc}`;

/**
 * __useMySamplesQuery__
 *
 * To run a query within a React component, call `useMySamplesQuery` and pass it any options that fit your needs.
 * When your component renders, `useMySamplesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMySamplesQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      createdDay: // value for 'createdDay'
 *   },
 * });
 */
export function useMySamplesQuery(baseOptions?: Apollo.QueryHookOptions<MySamplesQuery, MySamplesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MySamplesQuery, MySamplesQueryVariables>(MySamplesDocument, options);
      }
export function useMySamplesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MySamplesQuery, MySamplesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MySamplesQuery, MySamplesQueryVariables>(MySamplesDocument, options);
        }
export type MySamplesQueryHookResult = ReturnType<typeof useMySamplesQuery>;
export type MySamplesLazyQueryHookResult = ReturnType<typeof useMySamplesLazyQuery>;
export type MySamplesQueryResult = Apollo.QueryResult<MySamplesQuery, MySamplesQueryVariables>;
export const SearchSampleDocument = gql`
    query SearchSample($search: String) {
  options: samples(name: $search, limit: 20) {
    value: id
    label: name
  }
}
    `;

/**
 * __useSearchSampleQuery__
 *
 * To run a query within a React component, call `useSearchSampleQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchSampleQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchSampleQuery({
 *   variables: {
 *      search: // value for 'search'
 *   },
 * });
 */
export function useSearchSampleQuery(baseOptions?: Apollo.QueryHookOptions<SearchSampleQuery, SearchSampleQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchSampleQuery, SearchSampleQueryVariables>(SearchSampleDocument, options);
      }
export function useSearchSampleLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchSampleQuery, SearchSampleQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchSampleQuery, SearchSampleQueryVariables>(SearchSampleDocument, options);
        }
export type SearchSampleQueryHookResult = ReturnType<typeof useSearchSampleQuery>;
export type SearchSampleLazyQueryHookResult = ReturnType<typeof useSearchSampleLazyQuery>;
export type SearchSampleQueryResult = Apollo.QueryResult<SearchSampleQuery, SearchSampleQueryVariables>;
export const TestBoardDocument = gql`
    query TestBoard($exp: ID!) {
  experiment(id: $exp) {
    name
    id
    samples {
      meta
      name
      id
      representations {
        id
        meta
        name
        createdAt
        metrics(keys: ["test"]) {
          id
          key
          value
          createdAt
        }
        thumbnails {
          id
        }
      }
    }
  }
}
    `;

/**
 * __useTestBoardQuery__
 *
 * To run a query within a React component, call `useTestBoardQuery` and pass it any options that fit your needs.
 * When your component renders, `useTestBoardQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTestBoardQuery({
 *   variables: {
 *      exp: // value for 'exp'
 *   },
 * });
 */
export function useTestBoardQuery(baseOptions: Apollo.QueryHookOptions<TestBoardQuery, TestBoardQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TestBoardQuery, TestBoardQueryVariables>(TestBoardDocument, options);
      }
export function useTestBoardLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TestBoardQuery, TestBoardQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TestBoardQuery, TestBoardQueryVariables>(TestBoardDocument, options);
        }
export type TestBoardQueryHookResult = ReturnType<typeof useTestBoardQuery>;
export type TestBoardLazyQueryHookResult = ReturnType<typeof useTestBoardLazyQuery>;
export type TestBoardQueryResult = Apollo.QueryResult<TestBoardQuery, TestBoardQueryVariables>;
export const TestBoardFilterDocument = gql`
    query TestBoardFilter($value: String, $experiments: [ID]) {
  tags: tags(name: $value) {
    label: name
    value: name
  }
  samples: samples(name: $value, experiments: $experiments) {
    label: name
    value: id
  }
}
    `;

/**
 * __useTestBoardFilterQuery__
 *
 * To run a query within a React component, call `useTestBoardFilterQuery` and pass it any options that fit your needs.
 * When your component renders, `useTestBoardFilterQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTestBoardFilterQuery({
 *   variables: {
 *      value: // value for 'value'
 *      experiments: // value for 'experiments'
 *   },
 * });
 */
export function useTestBoardFilterQuery(baseOptions?: Apollo.QueryHookOptions<TestBoardFilterQuery, TestBoardFilterQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TestBoardFilterQuery, TestBoardFilterQueryVariables>(TestBoardFilterDocument, options);
      }
export function useTestBoardFilterLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TestBoardFilterQuery, TestBoardFilterQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TestBoardFilterQuery, TestBoardFilterQueryVariables>(TestBoardFilterDocument, options);
        }
export type TestBoardFilterQueryHookResult = ReturnType<typeof useTestBoardFilterQuery>;
export type TestBoardFilterLazyQueryHookResult = ReturnType<typeof useTestBoardFilterLazyQuery>;
export type TestBoardFilterQueryResult = Apollo.QueryResult<TestBoardFilterQuery, TestBoardFilterQueryVariables>;
export const TestBoardChangedDocument = gql`
    query TestBoardChanged($exp: ID!, $order: [String], $keys: [String], $tags: [String], $samples: [ID]) {
  experiment(id: $exp) {
    name
    id
    samples(order: ["meta__p"], ids: $samples) {
      meta
      name
      id
      display_rep: representations(order: ["-created_at"], tags: $tags, limit: 1) {
        id
        latestThumbnail {
          image
        }
      }
      data_reps: representations(order: $order, tags: [], limit: 20, variety: MASK) {
        id
        meta
        variety
        metrics(keys: $keys) {
          value
        }
      }
    }
  }
}
    `;

/**
 * __useTestBoardChangedQuery__
 *
 * To run a query within a React component, call `useTestBoardChangedQuery` and pass it any options that fit your needs.
 * When your component renders, `useTestBoardChangedQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTestBoardChangedQuery({
 *   variables: {
 *      exp: // value for 'exp'
 *      order: // value for 'order'
 *      keys: // value for 'keys'
 *      tags: // value for 'tags'
 *      samples: // value for 'samples'
 *   },
 * });
 */
export function useTestBoardChangedQuery(baseOptions: Apollo.QueryHookOptions<TestBoardChangedQuery, TestBoardChangedQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TestBoardChangedQuery, TestBoardChangedQueryVariables>(TestBoardChangedDocument, options);
      }
export function useTestBoardChangedLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TestBoardChangedQuery, TestBoardChangedQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TestBoardChangedQuery, TestBoardChangedQueryVariables>(TestBoardChangedDocument, options);
        }
export type TestBoardChangedQueryHookResult = ReturnType<typeof useTestBoardChangedQuery>;
export type TestBoardChangedLazyQueryHookResult = ReturnType<typeof useTestBoardChangedLazyQuery>;
export type TestBoardChangedQueryResult = Apollo.QueryResult<TestBoardChangedQuery, TestBoardChangedQueryVariables>;
export const TestBoardTableKeysDocument = gql`
    query TestBoardTableKeys($value: String) {
  keys: tags(name: $value) {
    label: name
    value: name
  }
}
    `;

/**
 * __useTestBoardTableKeysQuery__
 *
 * To run a query within a React component, call `useTestBoardTableKeysQuery` and pass it any options that fit your needs.
 * When your component renders, `useTestBoardTableKeysQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTestBoardTableKeysQuery({
 *   variables: {
 *      value: // value for 'value'
 *   },
 * });
 */
export function useTestBoardTableKeysQuery(baseOptions?: Apollo.QueryHookOptions<TestBoardTableKeysQuery, TestBoardTableKeysQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TestBoardTableKeysQuery, TestBoardTableKeysQueryVariables>(TestBoardTableKeysDocument, options);
      }
export function useTestBoardTableKeysLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TestBoardTableKeysQuery, TestBoardTableKeysQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TestBoardTableKeysQuery, TestBoardTableKeysQueryVariables>(TestBoardTableKeysDocument, options);
        }
export type TestBoardTableKeysQueryHookResult = ReturnType<typeof useTestBoardTableKeysQuery>;
export type TestBoardTableKeysLazyQueryHookResult = ReturnType<typeof useTestBoardTableKeysLazyQuery>;
export type TestBoardTableKeysQueryResult = Apollo.QueryResult<TestBoardTableKeysQuery, TestBoardTableKeysQueryVariables>;
export const TestBoardTableDocument = gql`
    query TestBoardTable($samples: [ID]!) {
  samples(order: ["meta__s"], ids: $samples) {
    meta
    name
    id
    representations(order: ["meta__t"]) {
      meta
      name
      derived {
        name
        derived {
          name
          metrics {
            key
            value
          }
        }
      }
    }
  }
}
    `;

/**
 * __useTestBoardTableQuery__
 *
 * To run a query within a React component, call `useTestBoardTableQuery` and pass it any options that fit your needs.
 * When your component renders, `useTestBoardTableQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTestBoardTableQuery({
 *   variables: {
 *      samples: // value for 'samples'
 *   },
 * });
 */
export function useTestBoardTableQuery(baseOptions: Apollo.QueryHookOptions<TestBoardTableQuery, TestBoardTableQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TestBoardTableQuery, TestBoardTableQueryVariables>(TestBoardTableDocument, options);
      }
export function useTestBoardTableLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TestBoardTableQuery, TestBoardTableQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TestBoardTableQuery, TestBoardTableQueryVariables>(TestBoardTableDocument, options);
        }
export type TestBoardTableQueryHookResult = ReturnType<typeof useTestBoardTableQuery>;
export type TestBoardTableLazyQueryHookResult = ReturnType<typeof useTestBoardTableLazyQuery>;
export type TestBoardTableQueryResult = Apollo.QueryResult<TestBoardTableQuery, TestBoardTableQueryVariables>;
export const HcsLandingDocument = gql`
    query HCSLanding {
  experiments {
    id
    name
    creator {
      email
    }
    description
    createdAt
  }
}
    `;

/**
 * __useHcsLandingQuery__
 *
 * To run a query within a React component, call `useHcsLandingQuery` and pass it any options that fit your needs.
 * When your component renders, `useHcsLandingQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHcsLandingQuery({
 *   variables: {
 *   },
 * });
 */
export function useHcsLandingQuery(baseOptions?: Apollo.QueryHookOptions<HcsLandingQuery, HcsLandingQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<HcsLandingQuery, HcsLandingQueryVariables>(HcsLandingDocument, options);
      }
export function useHcsLandingLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<HcsLandingQuery, HcsLandingQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<HcsLandingQuery, HcsLandingQueryVariables>(HcsLandingDocument, options);
        }
export type HcsLandingQueryHookResult = ReturnType<typeof useHcsLandingQuery>;
export type HcsLandingLazyQueryHookResult = ReturnType<typeof useHcsLandingLazyQuery>;
export type HcsLandingQueryResult = Apollo.QueryResult<HcsLandingQuery, HcsLandingQueryVariables>;
export const HcsSampleDocument = gql`
    query HCSSample($id: ID!) {
  sample(id: $id) {
    name
    meta
    representations(order: ["meta__t"]) {
      meta
      id
      name
      latestThumbnail {
        id
        image
      }
    }
  }
}
    `;

/**
 * __useHcsSampleQuery__
 *
 * To run a query within a React component, call `useHcsSampleQuery` and pass it any options that fit your needs.
 * When your component renders, `useHcsSampleQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHcsSampleQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useHcsSampleQuery(baseOptions: Apollo.QueryHookOptions<HcsSampleQuery, HcsSampleQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<HcsSampleQuery, HcsSampleQueryVariables>(HcsSampleDocument, options);
      }
export function useHcsSampleLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<HcsSampleQuery, HcsSampleQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<HcsSampleQuery, HcsSampleQueryVariables>(HcsSampleDocument, options);
        }
export type HcsSampleQueryHookResult = ReturnType<typeof useHcsSampleQuery>;
export type HcsSampleLazyQueryHookResult = ReturnType<typeof useHcsSampleLazyQuery>;
export type HcsSampleQueryResult = Apollo.QueryResult<HcsSampleQuery, HcsSampleQueryVariables>;
export const HcsSampleMetricsDocument = gql`
    query HCSSampleMetrics($sampleid: ID!, $keys: [String], $order: [String]) {
  metrics(keys: $keys, sample: $sampleid, order: $order) {
    representation {
      id
      meta
    }
    key
    value
  }
}
    `;

/**
 * __useHcsSampleMetricsQuery__
 *
 * To run a query within a React component, call `useHcsSampleMetricsQuery` and pass it any options that fit your needs.
 * When your component renders, `useHcsSampleMetricsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHcsSampleMetricsQuery({
 *   variables: {
 *      sampleid: // value for 'sampleid'
 *      keys: // value for 'keys'
 *      order: // value for 'order'
 *   },
 * });
 */
export function useHcsSampleMetricsQuery(baseOptions: Apollo.QueryHookOptions<HcsSampleMetricsQuery, HcsSampleMetricsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<HcsSampleMetricsQuery, HcsSampleMetricsQueryVariables>(HcsSampleMetricsDocument, options);
      }
export function useHcsSampleMetricsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<HcsSampleMetricsQuery, HcsSampleMetricsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<HcsSampleMetricsQuery, HcsSampleMetricsQueryVariables>(HcsSampleMetricsDocument, options);
        }
export type HcsSampleMetricsQueryHookResult = ReturnType<typeof useHcsSampleMetricsQuery>;
export type HcsSampleMetricsLazyQueryHookResult = ReturnType<typeof useHcsSampleMetricsLazyQuery>;
export type HcsSampleMetricsQueryResult = Apollo.QueryResult<HcsSampleMetricsQuery, HcsSampleMetricsQueryVariables>;
export const DetailStageDocument = gql`
    query DetailStage($id: ID!, $limit: Int, $offset: Int) {
  stage(id: $id) {
    ...Stage
    positions(limit: $limit, offset: $offset) {
      ...ListPosition
    }
  }
}
    ${StageFragmentDoc}
${ListPositionFragmentDoc}`;

/**
 * __useDetailStageQuery__
 *
 * To run a query within a React component, call `useDetailStageQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailStageQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailStageQuery({
 *   variables: {
 *      id: // value for 'id'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useDetailStageQuery(baseOptions: Apollo.QueryHookOptions<DetailStageQuery, DetailStageQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailStageQuery, DetailStageQueryVariables>(DetailStageDocument, options);
      }
export function useDetailStageLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailStageQuery, DetailStageQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailStageQuery, DetailStageQueryVariables>(DetailStageDocument, options);
        }
export type DetailStageQueryHookResult = ReturnType<typeof useDetailStageQuery>;
export type DetailStageLazyQueryHookResult = ReturnType<typeof useDetailStageLazyQuery>;
export type DetailStageQueryResult = Apollo.QueryResult<DetailStageQuery, DetailStageQueryVariables>;
export const MyStagesDocument = gql`
    query MyStages($limit: Int, $offset: Int, $createdDay: DateTime) {
  mystages(limit: $limit, offset: $offset, createdDay: $createdDay) {
    ...ListStage
  }
}
    ${ListStageFragmentDoc}`;

/**
 * __useMyStagesQuery__
 *
 * To run a query within a React component, call `useMyStagesQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyStagesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyStagesQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      createdDay: // value for 'createdDay'
 *   },
 * });
 */
export function useMyStagesQuery(baseOptions?: Apollo.QueryHookOptions<MyStagesQuery, MyStagesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyStagesQuery, MyStagesQueryVariables>(MyStagesDocument, options);
      }
export function useMyStagesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyStagesQuery, MyStagesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyStagesQuery, MyStagesQueryVariables>(MyStagesDocument, options);
        }
export type MyStagesQueryHookResult = ReturnType<typeof useMyStagesQuery>;
export type MyStagesLazyQueryHookResult = ReturnType<typeof useMyStagesLazyQuery>;
export type MyStagesQueryResult = Apollo.QueryResult<MyStagesQuery, MyStagesQueryVariables>;
export const SearchableStagesDocument = gql`
    query SearchableStages($search: String, $limit: Int, $offset: Int, $createdDay: DateTime) {
  mystages(name: $search, limit: $limit, offset: $offset, createdDay: $createdDay) {
    ...ListStage
  }
}
    ${ListStageFragmentDoc}`;

/**
 * __useSearchableStagesQuery__
 *
 * To run a query within a React component, call `useSearchableStagesQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchableStagesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchableStagesQuery({
 *   variables: {
 *      search: // value for 'search'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      createdDay: // value for 'createdDay'
 *   },
 * });
 */
export function useSearchableStagesQuery(baseOptions?: Apollo.QueryHookOptions<SearchableStagesQuery, SearchableStagesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchableStagesQuery, SearchableStagesQueryVariables>(SearchableStagesDocument, options);
      }
export function useSearchableStagesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchableStagesQuery, SearchableStagesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchableStagesQuery, SearchableStagesQueryVariables>(SearchableStagesDocument, options);
        }
export type SearchableStagesQueryHookResult = ReturnType<typeof useSearchableStagesQuery>;
export type SearchableStagesLazyQueryHookResult = ReturnType<typeof useSearchableStagesLazyQuery>;
export type SearchableStagesQueryResult = Apollo.QueryResult<SearchableStagesQuery, SearchableStagesQueryVariables>;
export const StageSearchDocument = gql`
    query StageSearch($search: String, $values: [ID!]) {
  options: stages(name: $search, ids: $values, limit: 30) {
    value: id
    label: name
  }
}
    `;

/**
 * __useStageSearchQuery__
 *
 * To run a query within a React component, call `useStageSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useStageSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useStageSearchQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useStageSearchQuery(baseOptions?: Apollo.QueryHookOptions<StageSearchQuery, StageSearchQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<StageSearchQuery, StageSearchQueryVariables>(StageSearchDocument, options);
      }
export function useStageSearchLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<StageSearchQuery, StageSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<StageSearchQuery, StageSearchQueryVariables>(StageSearchDocument, options);
        }
export type StageSearchQueryHookResult = ReturnType<typeof useStageSearchQuery>;
export type StageSearchLazyQueryHookResult = ReturnType<typeof useStageSearchLazyQuery>;
export type StageSearchQueryResult = Apollo.QueryResult<StageSearchQuery, StageSearchQueryVariables>;
export const DetailTableDocument = gql`
    query DetailTable($id: ID!, $only: [String], $limit: Int = 200, $offset: Int = 3, $query: String) {
  table(id: $id) {
    ...DetailTable
    columns(filter: $only) {
      ...Column
    }
    query(columns: $only, limit: $limit, offset: $offset, query: $query)
  }
}
    ${DetailTableFragmentDoc}
${ColumnFragmentDoc}`;

/**
 * __useDetailTableQuery__
 *
 * To run a query within a React component, call `useDetailTableQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailTableQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailTableQuery({
 *   variables: {
 *      id: // value for 'id'
 *      only: // value for 'only'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      query: // value for 'query'
 *   },
 * });
 */
export function useDetailTableQuery(baseOptions: Apollo.QueryHookOptions<DetailTableQuery, DetailTableQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailTableQuery, DetailTableQueryVariables>(DetailTableDocument, options);
      }
export function useDetailTableLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailTableQuery, DetailTableQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailTableQuery, DetailTableQueryVariables>(DetailTableDocument, options);
        }
export type DetailTableQueryHookResult = ReturnType<typeof useDetailTableQuery>;
export type DetailTableLazyQueryHookResult = ReturnType<typeof useDetailTableLazyQuery>;
export type DetailTableQueryResult = Apollo.QueryResult<DetailTableQuery, DetailTableQueryVariables>;
export const MyTablesDocument = gql`
    query MyTables($createdDay: DateTime, $limit: Int = 200, $offset: Int = 3) {
  mytables(createdDay: $createdDay, limit: $limit, offset: $offset) {
    ...ListTable
  }
}
    ${ListTableFragmentDoc}`;

/**
 * __useMyTablesQuery__
 *
 * To run a query within a React component, call `useMyTablesQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyTablesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyTablesQuery({
 *   variables: {
 *      createdDay: // value for 'createdDay'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useMyTablesQuery(baseOptions?: Apollo.QueryHookOptions<MyTablesQuery, MyTablesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyTablesQuery, MyTablesQueryVariables>(MyTablesDocument, options);
      }
export function useMyTablesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyTablesQuery, MyTablesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyTablesQuery, MyTablesQueryVariables>(MyTablesDocument, options);
        }
export type MyTablesQueryHookResult = ReturnType<typeof useMyTablesQuery>;
export type MyTablesLazyQueryHookResult = ReturnType<typeof useMyTablesLazyQuery>;
export type MyTablesQueryResult = Apollo.QueryResult<MyTablesQuery, MyTablesQueryVariables>;
export const TagSearchDocument = gql`
    query TagSearch($search: String, $values: [String]) {
  options: tags(name: $search, values: $values, limit: 20) {
    value: name
    label: slug
  }
}
    `;

/**
 * __useTagSearchQuery__
 *
 * To run a query within a React component, call `useTagSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useTagSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTagSearchQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useTagSearchQuery(baseOptions?: Apollo.QueryHookOptions<TagSearchQuery, TagSearchQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TagSearchQuery, TagSearchQueryVariables>(TagSearchDocument, options);
      }
export function useTagSearchLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TagSearchQuery, TagSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TagSearchQuery, TagSearchQueryVariables>(TagSearchDocument, options);
        }
export type TagSearchQueryHookResult = ReturnType<typeof useTagSearchQuery>;
export type TagSearchLazyQueryHookResult = ReturnType<typeof useTagSearchLazyQuery>;
export type TagSearchQueryResult = Apollo.QueryResult<TagSearchQuery, TagSearchQueryVariables>;
export const DetailThumbnailDocument = gql`
    query DetailThumbnail($id: ID!) {
  thumbnail(id: $id) {
    ...Thumbnail
  }
}
    ${ThumbnailFragmentDoc}`;

/**
 * __useDetailThumbnailQuery__
 *
 * To run a query within a React component, call `useDetailThumbnailQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailThumbnailQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailThumbnailQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailThumbnailQuery(baseOptions: Apollo.QueryHookOptions<DetailThumbnailQuery, DetailThumbnailQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailThumbnailQuery, DetailThumbnailQueryVariables>(DetailThumbnailDocument, options);
      }
export function useDetailThumbnailLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailThumbnailQuery, DetailThumbnailQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailThumbnailQuery, DetailThumbnailQueryVariables>(DetailThumbnailDocument, options);
        }
export type DetailThumbnailQueryHookResult = ReturnType<typeof useDetailThumbnailQuery>;
export type DetailThumbnailLazyQueryHookResult = ReturnType<typeof useDetailThumbnailLazyQuery>;
export type DetailThumbnailQueryResult = Apollo.QueryResult<DetailThumbnailQuery, DetailThumbnailQueryVariables>;
export const ThumbnailsDocument = gql`
    query Thumbnails($limit: Int, $offset: Int) {
  thumbnails(limit: $limit, offset: $offset) {
    ...ListThumbnail
  }
}
    ${ListThumbnailFragmentDoc}`;

/**
 * __useThumbnailsQuery__
 *
 * To run a query within a React component, call `useThumbnailsQuery` and pass it any options that fit your needs.
 * When your component renders, `useThumbnailsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useThumbnailsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useThumbnailsQuery(baseOptions?: Apollo.QueryHookOptions<ThumbnailsQuery, ThumbnailsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ThumbnailsQuery, ThumbnailsQueryVariables>(ThumbnailsDocument, options);
      }
export function useThumbnailsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ThumbnailsQuery, ThumbnailsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ThumbnailsQuery, ThumbnailsQueryVariables>(ThumbnailsDocument, options);
        }
export type ThumbnailsQueryHookResult = ReturnType<typeof useThumbnailsQuery>;
export type ThumbnailsLazyQueryHookResult = ReturnType<typeof useThumbnailsLazyQuery>;
export type ThumbnailsQueryResult = Apollo.QueryResult<ThumbnailsQuery, ThumbnailsQueryVariables>;
export const DetailTimepointDocument = gql`
    query DetailTimepoint($id: ID!) {
  timepoint(id: $id) {
    ...Timepoint
  }
}
    ${TimepointFragmentDoc}`;

/**
 * __useDetailTimepointQuery__
 *
 * To run a query within a React component, call `useDetailTimepointQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailTimepointQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailTimepointQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailTimepointQuery(baseOptions: Apollo.QueryHookOptions<DetailTimepointQuery, DetailTimepointQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailTimepointQuery, DetailTimepointQueryVariables>(DetailTimepointDocument, options);
      }
export function useDetailTimepointLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailTimepointQuery, DetailTimepointQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailTimepointQuery, DetailTimepointQueryVariables>(DetailTimepointDocument, options);
        }
export type DetailTimepointQueryHookResult = ReturnType<typeof useDetailTimepointQuery>;
export type DetailTimepointLazyQueryHookResult = ReturnType<typeof useDetailTimepointLazyQuery>;
export type DetailTimepointQueryResult = Apollo.QueryResult<DetailTimepointQuery, DetailTimepointQueryVariables>;
export const MyTimepointsDocument = gql`
    query MyTimepoints($limit: Int, $offset: Int, $createdDay: DateTime) {
  mytimepoints(limit: $limit, offset: $offset, createdDay: $createdDay) {
    ...ListTimepoint
  }
}
    ${ListTimepointFragmentDoc}`;

/**
 * __useMyTimepointsQuery__
 *
 * To run a query within a React component, call `useMyTimepointsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyTimepointsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyTimepointsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      createdDay: // value for 'createdDay'
 *   },
 * });
 */
export function useMyTimepointsQuery(baseOptions?: Apollo.QueryHookOptions<MyTimepointsQuery, MyTimepointsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyTimepointsQuery, MyTimepointsQueryVariables>(MyTimepointsDocument, options);
      }
export function useMyTimepointsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyTimepointsQuery, MyTimepointsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyTimepointsQuery, MyTimepointsQueryVariables>(MyTimepointsDocument, options);
        }
export type MyTimepointsQueryHookResult = ReturnType<typeof useMyTimepointsQuery>;
export type MyTimepointsLazyQueryHookResult = ReturnType<typeof useMyTimepointsLazyQuery>;
export type MyTimepointsQueryResult = Apollo.QueryResult<MyTimepointsQuery, MyTimepointsQueryVariables>;
export const TimepointSearchDocument = gql`
    query TimepointSearch($search: String) {
  options: timepoints(name: $search, limit: 30) {
    value: id
    label: name
  }
}
    `;

/**
 * __useTimepointSearchQuery__
 *
 * To run a query within a React component, call `useTimepointSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useTimepointSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTimepointSearchQuery({
 *   variables: {
 *      search: // value for 'search'
 *   },
 * });
 */
export function useTimepointSearchQuery(baseOptions?: Apollo.QueryHookOptions<TimepointSearchQuery, TimepointSearchQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TimepointSearchQuery, TimepointSearchQueryVariables>(TimepointSearchDocument, options);
      }
export function useTimepointSearchLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TimepointSearchQuery, TimepointSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TimepointSearchQuery, TimepointSearchQueryVariables>(TimepointSearchDocument, options);
        }
export type TimepointSearchQueryHookResult = ReturnType<typeof useTimepointSearchQuery>;
export type TimepointSearchLazyQueryHookResult = ReturnType<typeof useTimepointSearchLazyQuery>;
export type TimepointSearchQueryResult = Apollo.QueryResult<TimepointSearchQuery, TimepointSearchQueryVariables>;
export const UserOptionsDocument = gql`
    query UserOptions($search: String) {
  options: users(search: $search) {
    value: id
    label: name
  }
}
    `;

/**
 * __useUserOptionsQuery__
 *
 * To run a query within a React component, call `useUserOptionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useUserOptionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUserOptionsQuery({
 *   variables: {
 *      search: // value for 'search'
 *   },
 * });
 */
export function useUserOptionsQuery(baseOptions?: Apollo.QueryHookOptions<UserOptionsQuery, UserOptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<UserOptionsQuery, UserOptionsQueryVariables>(UserOptionsDocument, options);
      }
export function useUserOptionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UserOptionsQuery, UserOptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<UserOptionsQuery, UserOptionsQueryVariables>(UserOptionsDocument, options);
        }
export type UserOptionsQueryHookResult = ReturnType<typeof useUserOptionsQuery>;
export type UserOptionsLazyQueryHookResult = ReturnType<typeof useUserOptionsLazyQuery>;
export type UserOptionsQueryResult = Apollo.QueryResult<UserOptionsQuery, UserOptionsQueryVariables>;
export const MikroUserDocument = gql`
    query MikroUser($id: ID!) {
  user(id: $id) {
    sub
    id
    firstName
  }
}
    `;

/**
 * __useMikroUserQuery__
 *
 * To run a query within a React component, call `useMikroUserQuery` and pass it any options that fit your needs.
 * When your component renders, `useMikroUserQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMikroUserQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useMikroUserQuery(baseOptions: Apollo.QueryHookOptions<MikroUserQuery, MikroUserQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MikroUserQuery, MikroUserQueryVariables>(MikroUserDocument, options);
      }
export function useMikroUserLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MikroUserQuery, MikroUserQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MikroUserQuery, MikroUserQueryVariables>(MikroUserDocument, options);
        }
export type MikroUserQueryHookResult = ReturnType<typeof useMikroUserQuery>;
export type MikroUserLazyQueryHookResult = ReturnType<typeof useMikroUserLazyQuery>;
export type MikroUserQueryResult = Apollo.QueryResult<MikroUserQuery, MikroUserQueryVariables>;
export const DetailVideoDocument = gql`
    query DetailVideo($id: ID!) {
  video(id: $id) {
    ...Video
  }
}
    ${VideoFragmentDoc}`;

/**
 * __useDetailVideoQuery__
 *
 * To run a query within a React component, call `useDetailVideoQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailVideoQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailVideoQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailVideoQuery(baseOptions: Apollo.QueryHookOptions<DetailVideoQuery, DetailVideoQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailVideoQuery, DetailVideoQueryVariables>(DetailVideoDocument, options);
      }
export function useDetailVideoLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailVideoQuery, DetailVideoQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailVideoQuery, DetailVideoQueryVariables>(DetailVideoDocument, options);
        }
export type DetailVideoQueryHookResult = ReturnType<typeof useDetailVideoQuery>;
export type DetailVideoLazyQueryHookResult = ReturnType<typeof useDetailVideoLazyQuery>;
export type DetailVideoQueryResult = Apollo.QueryResult<DetailVideoQuery, DetailVideoQueryVariables>;
export const VideosDocument = gql`
    query Videos($limit: Int, $offset: Int) {
  videos(limit: $limit, offset: $offset) {
    ...ListVideo
  }
}
    ${ListVideoFragmentDoc}`;

/**
 * __useVideosQuery__
 *
 * To run a query within a React component, call `useVideosQuery` and pass it any options that fit your needs.
 * When your component renders, `useVideosQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useVideosQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useVideosQuery(baseOptions?: Apollo.QueryHookOptions<VideosQuery, VideosQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<VideosQuery, VideosQueryVariables>(VideosDocument, options);
      }
export function useVideosLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<VideosQuery, VideosQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<VideosQuery, VideosQueryVariables>(VideosDocument, options);
        }
export type VideosQueryHookResult = ReturnType<typeof useVideosQuery>;
export type VideosLazyQueryHookResult = ReturnType<typeof useVideosLazyQuery>;
export type VideosQueryResult = Apollo.QueryResult<VideosQuery, VideosQueryVariables>;
export const ActivesViewForRepresentationDocument = gql`
    query ActivesViewForRepresentation($representation: ID!, $z: Float, $t: Float, $c: Float, $x: Float, $y: Float) {
  views(
    representation: $representation
    activeForZ: $z
    activeForT: $t
    activeForC: $c
    activeForX: $x
    activeForY: $y
  ) {
    id
    timepoint {
      id
      name
    }
    position {
      id
      name
    }
    channel {
      id
      name
    }
  }
}
    `;

/**
 * __useActivesViewForRepresentationQuery__
 *
 * To run a query within a React component, call `useActivesViewForRepresentationQuery` and pass it any options that fit your needs.
 * When your component renders, `useActivesViewForRepresentationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useActivesViewForRepresentationQuery({
 *   variables: {
 *      representation: // value for 'representation'
 *      z: // value for 'z'
 *      t: // value for 't'
 *      c: // value for 'c'
 *      x: // value for 'x'
 *      y: // value for 'y'
 *   },
 * });
 */
export function useActivesViewForRepresentationQuery(baseOptions: Apollo.QueryHookOptions<ActivesViewForRepresentationQuery, ActivesViewForRepresentationQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ActivesViewForRepresentationQuery, ActivesViewForRepresentationQueryVariables>(ActivesViewForRepresentationDocument, options);
      }
export function useActivesViewForRepresentationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ActivesViewForRepresentationQuery, ActivesViewForRepresentationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ActivesViewForRepresentationQuery, ActivesViewForRepresentationQueryVariables>(ActivesViewForRepresentationDocument, options);
        }
export type ActivesViewForRepresentationQueryHookResult = ReturnType<typeof useActivesViewForRepresentationQuery>;
export type ActivesViewForRepresentationLazyQueryHookResult = ReturnType<typeof useActivesViewForRepresentationLazyQuery>;
export type ActivesViewForRepresentationQueryResult = Apollo.QueryResult<ActivesViewForRepresentationQuery, ActivesViewForRepresentationQueryVariables>;
export const MyExperimentsEventDocument = gql`
    subscription MyExperimentsEvent {
  myExperiments {
    deleted
    create {
      ...ListExperiment
    }
    update {
      ...ListExperiment
    }
  }
}
    ${ListExperimentFragmentDoc}`;

/**
 * __useMyExperimentsEventSubscription__
 *
 * To run a query within a React component, call `useMyExperimentsEventSubscription` and pass it any options that fit your needs.
 * When your component renders, `useMyExperimentsEventSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyExperimentsEventSubscription({
 *   variables: {
 *   },
 * });
 */
export function useMyExperimentsEventSubscription(baseOptions?: Apollo.SubscriptionHookOptions<MyExperimentsEventSubscription, MyExperimentsEventSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<MyExperimentsEventSubscription, MyExperimentsEventSubscriptionVariables>(MyExperimentsEventDocument, options);
      }
export type MyExperimentsEventSubscriptionHookResult = ReturnType<typeof useMyExperimentsEventSubscription>;
export type MyExperimentsEventSubscriptionResult = Apollo.SubscriptionResult<MyExperimentsEventSubscription>;
export const WatchMentionsDocument = gql`
    subscription WatchMentions {
  mymentions {
    create {
      ...MentionComment
    }
    update {
      ...MentionComment
    }
  }
}
    ${MentionCommentFragmentDoc}`;

/**
 * __useWatchMentionsSubscription__
 *
 * To run a query within a React component, call `useWatchMentionsSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchMentionsSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchMentionsSubscription({
 *   variables: {
 *   },
 * });
 */
export function useWatchMentionsSubscription(baseOptions?: Apollo.SubscriptionHookOptions<WatchMentionsSubscription, WatchMentionsSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<WatchMentionsSubscription, WatchMentionsSubscriptionVariables>(WatchMentionsDocument, options);
      }
export type WatchMentionsSubscriptionHookResult = ReturnType<typeof useWatchMentionsSubscription>;
export type WatchMentionsSubscriptionResult = Apollo.SubscriptionResult<WatchMentionsSubscription>;
export const MyRepresentationsEventDocument = gql`
    subscription MyRepresentationsEvent {
  myRepresentations {
    deleted
    create {
      ...ListRepresentation
    }
    update {
      ...ListRepresentation
    }
  }
}
    ${ListRepresentationFragmentDoc}`;

/**
 * __useMyRepresentationsEventSubscription__
 *
 * To run a query within a React component, call `useMyRepresentationsEventSubscription` and pass it any options that fit your needs.
 * When your component renders, `useMyRepresentationsEventSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyRepresentationsEventSubscription({
 *   variables: {
 *   },
 * });
 */
export function useMyRepresentationsEventSubscription(baseOptions?: Apollo.SubscriptionHookOptions<MyRepresentationsEventSubscription, MyRepresentationsEventSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<MyRepresentationsEventSubscription, MyRepresentationsEventSubscriptionVariables>(MyRepresentationsEventDocument, options);
      }
export type MyRepresentationsEventSubscriptionHookResult = ReturnType<typeof useMyRepresentationsEventSubscription>;
export type MyRepresentationsEventSubscriptionResult = Apollo.SubscriptionResult<MyRepresentationsEventSubscription>;
export const MyRepresentationsOriginDocument = gql`
    subscription MyRepresentationsOrigin($origin: ID!) {
  myRepresentations(origin: $origin) {
    deleted
    create {
      ...ListRepresentation
    }
    update {
      ...ListRepresentation
    }
  }
}
    ${ListRepresentationFragmentDoc}`;

/**
 * __useMyRepresentationsOriginSubscription__
 *
 * To run a query within a React component, call `useMyRepresentationsOriginSubscription` and pass it any options that fit your needs.
 * When your component renders, `useMyRepresentationsOriginSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyRepresentationsOriginSubscription({
 *   variables: {
 *      origin: // value for 'origin'
 *   },
 * });
 */
export function useMyRepresentationsOriginSubscription(baseOptions: Apollo.SubscriptionHookOptions<MyRepresentationsOriginSubscription, MyRepresentationsOriginSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<MyRepresentationsOriginSubscription, MyRepresentationsOriginSubscriptionVariables>(MyRepresentationsOriginDocument, options);
      }
export type MyRepresentationsOriginSubscriptionHookResult = ReturnType<typeof useMyRepresentationsOriginSubscription>;
export type MyRepresentationsOriginSubscriptionResult = Apollo.SubscriptionResult<MyRepresentationsOriginSubscription>;
export const WatchRoisDocument = gql`
    subscription WatchRois($representation: ID!) {
  rois(representation: $representation) {
    update {
      ...RepRoi
    }
    delete
    create {
      ...RepRoi
    }
  }
}
    ${RepRoiFragmentDoc}`;

/**
 * __useWatchRoisSubscription__
 *
 * To run a query within a React component, call `useWatchRoisSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchRoisSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchRoisSubscription({
 *   variables: {
 *      representation: // value for 'representation'
 *   },
 * });
 */
export function useWatchRoisSubscription(baseOptions: Apollo.SubscriptionHookOptions<WatchRoisSubscription, WatchRoisSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<WatchRoisSubscription, WatchRoisSubscriptionVariables>(WatchRoisDocument, options);
      }
export type WatchRoisSubscriptionHookResult = ReturnType<typeof useWatchRoisSubscription>;
export type WatchRoisSubscriptionResult = Apollo.SubscriptionResult<WatchRoisSubscription>;
export const MySamplesEventDocument = gql`
    subscription MySamplesEvent {
  mySamples {
    deleted
    create {
      ...ListSample
    }
    update {
      ...ListSample
    }
  }
}
    ${ListSampleFragmentDoc}`;

/**
 * __useMySamplesEventSubscription__
 *
 * To run a query within a React component, call `useMySamplesEventSubscription` and pass it any options that fit your needs.
 * When your component renders, `useMySamplesEventSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMySamplesEventSubscription({
 *   variables: {
 *   },
 * });
 */
export function useMySamplesEventSubscription(baseOptions?: Apollo.SubscriptionHookOptions<MySamplesEventSubscription, MySamplesEventSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<MySamplesEventSubscription, MySamplesEventSubscriptionVariables>(MySamplesEventDocument, options);
      }
export type MySamplesEventSubscriptionHookResult = ReturnType<typeof useMySamplesEventSubscription>;
export type MySamplesEventSubscriptionResult = Apollo.SubscriptionResult<MySamplesEventSubscription>;
export const MyTablesEventDocument = gql`
    subscription MyTablesEvent {
  myTables {
    deleted
    create {
      ...ListTable
    }
    update {
      ...ListTable
    }
  }
}
    ${ListTableFragmentDoc}`;

/**
 * __useMyTablesEventSubscription__
 *
 * To run a query within a React component, call `useMyTablesEventSubscription` and pass it any options that fit your needs.
 * When your component renders, `useMyTablesEventSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyTablesEventSubscription({
 *   variables: {
 *   },
 * });
 */
export function useMyTablesEventSubscription(baseOptions?: Apollo.SubscriptionHookOptions<MyTablesEventSubscription, MyTablesEventSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<MyTablesEventSubscription, MyTablesEventSubscriptionVariables>(MyTablesEventDocument, options);
      }
export type MyTablesEventSubscriptionHookResult = ReturnType<typeof useMyTablesEventSubscription>;
export type MyTablesEventSubscriptionResult = Apollo.SubscriptionResult<MyTablesEventSubscription>;