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
  DataFrame: any;
  DateTime: any;
  FeatureValue: any;
  File: any;
  GenericScalar: any;
  ImageFile: any;
  MetricValue: any;
  Parquet: any;
  Store: any;
  UUID: any;
  XArray: any;
};

export type ChangePermissionsResult = {
  __typename?: 'ChangePermissionsResult';
  message?: Maybe<Scalars['String']>;
  success?: Maybe<Scalars['Boolean']>;
};

export type Channel = {
  __typename?: 'Channel';
  acquisitionMode?: Maybe<Scalars['String']>;
  color?: Maybe<Scalars['String']>;
  emmissionWavelength?: Maybe<Scalars['Float']>;
  excitationWavelength?: Maybe<Scalars['Float']>;
  name?: Maybe<Scalars['String']>;
};

export type ChannelInput = {
  acquisitionMode?: InputMaybe<Scalars['String']>;
  color?: InputMaybe<Scalars['String']>;
  emmissionWavelength?: InputMaybe<Scalars['Float']>;
  excitationWavelength?: InputMaybe<Scalars['Float']>;
  name?: InputMaybe<Scalars['String']>;
};

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

export type Comment = {
  __typename?: 'Comment';
  children?: Maybe<Array<Maybe<Comment>>>;
  contentType?: Maybe<CommentableModels>;
  createdAt: Scalars['DateTime'];
  descendents?: Maybe<Array<Maybe<Descendent>>>;
  id: Scalars['ID'];
  mentions: Array<User>;
  objectId: Scalars['Int'];
  parent?: Maybe<Comment>;
  text: Scalars['String'];
  user: User;
};


export type CommentChildrenArgs = {
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
};

export enum CommentableModels {
  BordTable = 'BORD_TABLE',
  GrunnlagAnimal = 'GRUNNLAG_ANIMAL',
  GrunnlagAntibody = 'GRUNNLAG_ANTIBODY',
  GrunnlagExperiment = 'GRUNNLAG_EXPERIMENT',
  GrunnlagExperimentalgroup = 'GRUNNLAG_EXPERIMENTALGROUP',
  GrunnlagFeature = 'GRUNNLAG_FEATURE',
  GrunnlagInstrument = 'GRUNNLAG_INSTRUMENT',
  GrunnlagLabel = 'GRUNNLAG_LABEL',
  GrunnlagMetric = 'GRUNNLAG_METRIC',
  GrunnlagOmero = 'GRUNNLAG_OMERO',
  GrunnlagOmerofile = 'GRUNNLAG_OMEROFILE',
  GrunnlagRepresentation = 'GRUNNLAG_REPRESENTATION',
  GrunnlagRoi = 'GRUNNLAG_ROI',
  GrunnlagSample = 'GRUNNLAG_SAMPLE',
  GrunnlagThumbnail = 'GRUNNLAG_THUMBNAIL',
  GrunnlagUsermeta = 'GRUNNLAG_USERMETA'
}

export type Credentials = {
  __typename?: 'Credentials';
  accessKey?: Maybe<Scalars['String']>;
  secretKey?: Maybe<Scalars['String']>;
  status?: Maybe<Scalars['String']>;
};

export type DeleteExperimentResult = {
  __typename?: 'DeleteExperimentResult';
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

export type DeleteTableResult = {
  __typename?: 'DeleteTableResult';
  id?: Maybe<Scalars['String']>;
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

export type Descendent = {
  typename?: Maybe<Scalars['String']>;
};

/** A Representation is a multi-dimensional Array that can do what ever it wants @elements/experiment */
export type Experiment = {
  __typename?: 'Experiment';
  createdAt: Scalars['DateTime'];
  creator?: Maybe<User>;
  description?: Maybe<Scalars['String']>;
  descriptionLong?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  image?: Maybe<Scalars['String']>;
  linkedPaper?: Maybe<Scalars['String']>;
  meta?: Maybe<Scalars['GenericScalar']>;
  /** The Representatoin this Metric belongs to */
  metrics: Array<Metric>;
  name: Scalars['String'];
  pinned?: Maybe<Scalars['Boolean']>;
  pinnedBy: Array<User>;
  samples?: Maybe<Array<Maybe<Sample>>>;
  tables: Array<Table>;
  /** A comma-separated list of tags. */
  tags?: Maybe<Array<Maybe<Scalars['String']>>>;
};


/** A Representation is a multi-dimensional Array that can do what ever it wants @elements/experiment */
export type ExperimentSamplesArgs = {
  bioseries?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
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

export type Feature = {
  __typename?: 'Feature';
  creator?: Maybe<User>;
  id: Scalars['ID'];
  /** The sKesyss */
  key: Scalars['String'];
  label?: Maybe<Label>;
  /** Value */
  value?: Maybe<Scalars['FeatureValue']>;
};

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

export type ImagingEnvironment = {
  __typename?: 'ImagingEnvironment';
  airPressure?: Maybe<Scalars['Float']>;
  co2Percent?: Maybe<Scalars['Float']>;
  humidity?: Maybe<Scalars['Float']>;
  map?: Maybe<Scalars['GenericScalar']>;
  temperature?: Maybe<Scalars['Float']>;
};

export type ImagingEnvironmentInput = {
  airPessure?: InputMaybe<Scalars['Float']>;
  co2Percent?: InputMaybe<Scalars['Float']>;
  humidity?: InputMaybe<Scalars['Float']>;
  map?: InputMaybe<Scalars['GenericScalar']>;
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

export type Instrument = {
  __typename?: 'Instrument';
  detectors?: Maybe<Scalars['GenericScalar']>;
  dichroics?: Maybe<Scalars['GenericScalar']>;
  filters?: Maybe<Scalars['GenericScalar']>;
  id: Scalars['ID'];
  lotNumber?: Maybe<Scalars['String']>;
  manufacturer?: Maybe<Scalars['String']>;
  model?: Maybe<Scalars['String']>;
  name: Scalars['String'];
  omeroSet: Array<Omero>;
  serialNumber?: Maybe<Scalars['String']>;
};

export type Label = {
  __typename?: 'Label';
  createdAt: Scalars['DateTime'];
  creator: User;
  feature?: Maybe<Feature>;
  /** Features attached to this Label */
  features?: Maybe<Array<Maybe<Feature>>>;
  id: Scalars['ID'];
  instance: Scalars['Int'];
  name?: Maybe<Scalars['String']>;
  pinned?: Maybe<Scalars['Boolean']>;
  pinnedBy: Array<User>;
  representation?: Maybe<Representation>;
  /** A comma-separated list of tags. */
  tags?: Maybe<Array<Maybe<Scalars['String']>>>;
};


export type LabelFeatureArgs = {
  key: Scalars['String'];
};


export type LabelFeaturesArgs = {
  creator?: InputMaybe<Scalars['Float']>;
  keys?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  label?: InputMaybe<Scalars['ID']>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  substring?: InputMaybe<Scalars['String']>;
};

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

export enum Medium {
  Air = 'AIR',
  Glycerol = 'GLYCEROL',
  Oil = 'OIL',
  Other = 'OTHER',
  Water = 'WATER'
}

export type MentionDescendent = Descendent & Node & {
  __typename?: 'MentionDescendent';
  children?: Maybe<Array<Maybe<Descendent>>>;
  typename?: Maybe<Scalars['String']>;
  untypedChildren?: Maybe<Scalars['GenericScalar']>;
  /** The user that is mentioned */
  user: Scalars['String'];
};

export type MentionEvent = {
  __typename?: 'MentionEvent';
  create?: Maybe<Comment>;
  deleted?: Maybe<Scalars['ID']>;
  update?: Maybe<Comment>;
};

export type Metric = {
  __typename?: 'Metric';
  createdAt: Scalars['DateTime'];
  creator?: Maybe<User>;
  /** The Representatoin this Metric belongs to */
  experiment?: Maybe<Experiment>;
  id: Scalars['ID'];
  /** The Key */
  key: Scalars['String'];
  /** The Representatoin this Metric belongs to */
  representation?: Maybe<Representation>;
  /** The Representatoin this Metric belongs to */
  sample?: Maybe<Sample>;
  /** Value */
  value?: Maybe<Scalars['MetricValue']>;
};

/** The root Mutation */
export type Mutation = {
  __typename?: 'Mutation';
  /** Creates a Sample */
  changePermissions?: Maybe<ChangePermissionsResult>;
  /** Create an experiment (only signed in users) */
  createComment?: Maybe<Comment>;
  /** Create an experiment (only signed in users) */
  createExperiment?: Maybe<Experiment>;
  /** Creates a Representation */
  createInstrument?: Maybe<Instrument>;
  /** Creates a Sample */
  createLabel?: Maybe<Label>;
  /** Creates a Representation */
  createMetric?: Maybe<Metric>;
  /** Create an experiment (only signed in users) */
  createPlot?: Maybe<Plot>;
  /** Creates a Sample */
  createROI?: Maybe<Roi>;
  /** Creates a Sample */
  createSample?: Maybe<Sample>;
  /** Creates a Representation */
  createTable?: Maybe<Table>;
  /** Creates a Sample */
  createfeature?: Maybe<Feature>;
  /** Create an experiment (only signed in users) */
  deleteExperiment?: Maybe<DeleteExperimentResult>;
  /** Create an experiment (only signed in users) */
  deleteOmeroFile?: Maybe<DeleteOmeroFileResult>;
  /** Create an experiment (only signed in users) */
  deletePlot?: Maybe<DeletePlotResult>;
  /** Create an experiment (only signed in users) */
  deleteROI?: Maybe<DeleteRoiResult>;
  /** Create an experiment (only signed in users) */
  deleteRepresentation?: Maybe<DeleteRepresentationResult>;
  /** Create an experiment (only signed in users) */
  deleteSample?: Maybe<DeleteSampleResult>;
  /** Create an experiment (only signed in users) */
  deleteTable?: Maybe<DeleteTableResult>;
  /** Creates a Representation */
  fromDf?: Maybe<Table>;
  /** Creates a Representation */
  fromXArray?: Maybe<Representation>;
  negotiate?: Maybe<Scalars['GenericScalar']>;
  /** Sets the pin */
  pinExperiment?: Maybe<Experiment>;
  /** Sets the pin */
  pinROI?: Maybe<Roi>;
  /** Sets the pin */
  pinRepresentation?: Maybe<Representation>;
  /** Sets the pin */
  pinSample?: Maybe<Sample>;
  /** Create an experiment (only signed in users) */
  updateExperiment?: Maybe<Experiment>;
  /** Updates an Representation (also retriggers meta-data retrieval from data stored in) */
  updateOmeroFile?: Maybe<OmeroFile>;
  /** Create an experiment (only signed in users) */
  updatePlot?: Maybe<Plot>;
  /** Updates an Representation (also retriggers meta-data retrieval from data stored in) */
  updateRepresentation?: Maybe<Representation>;
  /** Creates a Sample */
  updateSample?: Maybe<Sample>;
  /** Updates an Representation (also retriggers meta-data retrieval from data stored in) */
  updateTable?: Maybe<Table>;
  uploadOmeroFile?: Maybe<OmeroFile>;
  uploadThumbnail?: Maybe<Thumbnail>;
};


/** The root Mutation */
export type MutationChangePermissionsArgs = {
  groupAssignments?: InputMaybe<Array<InputMaybe<GroupAssignmentInput>>>;
  object: Scalars['ID'];
  type: SharableModels;
  userAssignments?: InputMaybe<Array<InputMaybe<UserAssignmentInput>>>;
};


/** The root Mutation */
export type MutationCreateCommentArgs = {
  descendents: Array<InputMaybe<DescendendInput>>;
  object: Scalars['ID'];
  parent?: InputMaybe<Scalars['ID']>;
  type: CommentableModels;
};


/** The root Mutation */
export type MutationCreateExperimentArgs = {
  creator?: InputMaybe<Scalars['String']>;
  description?: InputMaybe<Scalars['String']>;
  meta?: InputMaybe<Scalars['GenericScalar']>;
  name: Scalars['String'];
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Mutation */
export type MutationCreateInstrumentArgs = {
  detectors?: InputMaybe<Array<InputMaybe<Scalars['GenericScalar']>>>;
  dichroics?: InputMaybe<Array<InputMaybe<Scalars['GenericScalar']>>>;
  filters?: InputMaybe<Array<InputMaybe<Scalars['GenericScalar']>>>;
  lotNumber?: InputMaybe<Scalars['String']>;
  manufacturer?: InputMaybe<Scalars['String']>;
  model?: InputMaybe<Scalars['String']>;
  name: Scalars['String'];
  serialNumber?: InputMaybe<Scalars['String']>;
};


/** The root Mutation */
export type MutationCreateLabelArgs = {
  creator?: InputMaybe<Scalars['ID']>;
  instance: Scalars['Int'];
  name?: InputMaybe<Scalars['String']>;
  representation: Scalars['ID'];
};


/** The root Mutation */
export type MutationCreateMetricArgs = {
  creator?: InputMaybe<Scalars['String']>;
  experiment?: InputMaybe<Scalars['ID']>;
  key: Scalars['String'];
  representation?: InputMaybe<Scalars['ID']>;
  sample?: InputMaybe<Scalars['ID']>;
  value: Scalars['MetricValue'];
};


/** The root Mutation */
export type MutationCreatePlotArgs = {
  name: Scalars['String'];
};


/** The root Mutation */
export type MutationCreateRoiArgs = {
  creator?: InputMaybe<Scalars['ID']>;
  label?: InputMaybe<Scalars['String']>;
  meta?: InputMaybe<Scalars['GenericScalar']>;
  representation: Scalars['ID'];
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  type: RoiTypeInput;
  vectors: Array<InputMaybe<InputVector>>;
};


/** The root Mutation */
export type MutationCreateSampleArgs = {
  creator?: InputMaybe<Scalars['String']>;
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  meta?: InputMaybe<Scalars['GenericScalar']>;
  name?: InputMaybe<Scalars['String']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Mutation */
export type MutationCreateTableArgs = {
  columns?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['String']>;
  experiment?: InputMaybe<Scalars['ID']>;
  name?: InputMaybe<Scalars['String']>;
  representation?: InputMaybe<Scalars['ID']>;
  sample?: InputMaybe<Scalars['ID']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Mutation */
export type MutationCreatefeatureArgs = {
  creator?: InputMaybe<Scalars['ID']>;
  key?: InputMaybe<Scalars['String']>;
  label: Scalars['ID'];
  value: Scalars['FeatureValue'];
};


/** The root Mutation */
export type MutationDeleteExperimentArgs = {
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
export type MutationDeleteTableArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationFromDfArgs = {
  creator?: InputMaybe<Scalars['String']>;
  df: Scalars['DataFrame'];
  experiment?: InputMaybe<Scalars['ID']>;
  name?: InputMaybe<Scalars['String']>;
  representation?: InputMaybe<Scalars['ID']>;
  sample?: InputMaybe<Scalars['ID']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Mutation */
export type MutationFromXArrayArgs = {
  creator?: InputMaybe<Scalars['String']>;
  fileOrigins?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  meta?: InputMaybe<Scalars['GenericScalar']>;
  name?: InputMaybe<Scalars['String']>;
  omero?: InputMaybe<OmeroRepresentationInput>;
  origins?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  roiOrigins?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  sample?: InputMaybe<Scalars['ID']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  variety?: InputMaybe<RepresentationVarietyInput>;
  xarray: Scalars['XArray'];
};


/** The root Mutation */
export type MutationNegotiateArgs = {
  additionals?: InputMaybe<Scalars['GenericScalar']>;
  internal?: InputMaybe<Scalars['Boolean']>;
};


/** The root Mutation */
export type MutationPinExperimentArgs = {
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
export type MutationUpdateExperimentArgs = {
  creator?: InputMaybe<Scalars['String']>;
  description?: InputMaybe<Scalars['String']>;
  id: Scalars['ID'];
  meta?: InputMaybe<Scalars['GenericScalar']>;
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
export type MutationUpdateTableArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationUploadOmeroFileArgs = {
  file: Scalars['ImageFile'];
  name?: InputMaybe<Scalars['String']>;
};


/** The root Mutation */
export type MutationUploadThumbnailArgs = {
  file: Scalars['ImageFile'];
  majorColor?: InputMaybe<Scalars['String']>;
  rep: Scalars['ID'];
};

export type Node = {
  children?: Maybe<Array<Maybe<Descendent>>>;
  untypedChildren?: Maybe<Scalars['GenericScalar']>;
};

export type ObjectiveSettings = {
  __typename?: 'ObjectiveSettings';
  correctionCollar?: Maybe<Scalars['Float']>;
  medium?: Maybe<Medium>;
  numericalAperture?: Maybe<Scalars['Float']>;
  workingDistance?: Maybe<Scalars['Float']>;
};

export type ObjectiveSettingsInput = {
  correctionCollar?: InputMaybe<Scalars['Float']>;
  medium?: InputMaybe<Medium>;
  numericalAperture?: InputMaybe<Scalars['Float']>;
  workingDistance?: InputMaybe<Scalars['Float']>;
};

export type Omero = {
  __typename?: 'Omero';
  acquisitionDate?: Maybe<Scalars['DateTime']>;
  channels?: Maybe<Array<Maybe<Channel>>>;
  id: Scalars['ID'];
  imagingEnvironment?: Maybe<ImagingEnvironment>;
  instrument?: Maybe<Instrument>;
  objectiveSettings?: Maybe<ObjectiveSettings>;
  physicalSize?: Maybe<PhysicalSize>;
  planes?: Maybe<Array<Maybe<Plane>>>;
  representation: Representation;
  scale?: Maybe<Array<Maybe<Scalars['Float']>>>;
};

export type OmeroFile = {
  __typename?: 'OmeroFile';
  createdAt: Scalars['DateTime'];
  creator?: Maybe<User>;
  derivedRepresentations: Array<Representation>;
  file?: Maybe<Scalars['File']>;
  id: Scalars['ID'];
  name: Scalars['String'];
  /** A comma-separated list of tags. */
  tags?: Maybe<Array<Maybe<Scalars['String']>>>;
  /** Url of a thumbnail */
  thumbnail?: Maybe<Scalars['String']>;
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

export type OmeroRepresentationInput = {
  acquisitionDate?: InputMaybe<Scalars['DateTime']>;
  channels?: InputMaybe<Array<InputMaybe<ChannelInput>>>;
  imagingEnvironment?: InputMaybe<ImagingEnvironmentInput>;
  instrument?: InputMaybe<Scalars['ID']>;
  objectiveSettings?: InputMaybe<ObjectiveSettingsInput>;
  physicalSize?: InputMaybe<PhysicalSizeInput>;
  planes?: InputMaybe<Array<InputMaybe<PlaneInput>>>;
  scale?: InputMaybe<Array<InputMaybe<Scalars['Float']>>>;
};

export enum PandasDType {
  Bool = 'BOOL',
  Category = 'CATEGORY',
  Datetime65 = 'DATETIME65',
  Float64 = 'FLOAT64',
  Int64 = 'INT64',
  Object = 'OBJECT',
  Timedelta = 'TIMEDELTA',
  Unicode = 'UNICODE'
}

export type ParagraphDescendent = Descendent & Node & {
  __typename?: 'ParagraphDescendent';
  children?: Maybe<Array<Maybe<Descendent>>>;
  /** The size of the paragraph */
  size?: Maybe<Scalars['String']>;
  typename?: Maybe<Scalars['String']>;
  untypedChildren?: Maybe<Scalars['GenericScalar']>;
};

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

export type PhysicalSize = {
  __typename?: 'PhysicalSize';
  c?: Maybe<Scalars['Float']>;
  t?: Maybe<Scalars['Float']>;
  x?: Maybe<Scalars['Float']>;
  y?: Maybe<Scalars['Float']>;
  z?: Maybe<Scalars['Float']>;
};

export type PhysicalSizeInput = {
  c?: InputMaybe<Scalars['Float']>;
  t?: InputMaybe<Scalars['Float']>;
  x?: InputMaybe<Scalars['Float']>;
  y?: InputMaybe<Scalars['Float']>;
  z?: InputMaybe<Scalars['Float']>;
};

export type Plane = {
  __typename?: 'Plane';
  c?: Maybe<Scalars['Int']>;
  deltaT?: Maybe<Scalars['Float']>;
  exposureTime?: Maybe<Scalars['Float']>;
  positionX?: Maybe<Scalars['Float']>;
  positionY?: Maybe<Scalars['Float']>;
  positionZ?: Maybe<Scalars['Float']>;
  t?: Maybe<Scalars['Int']>;
  x?: Maybe<Scalars['Int']>;
  y?: Maybe<Scalars['Int']>;
  z?: Maybe<Scalars['Int']>;
};

export type PlaneInput = {
  c?: InputMaybe<Scalars['Int']>;
  deltaT?: InputMaybe<Scalars['Float']>;
  exposureTime?: InputMaybe<Scalars['Float']>;
  positionX?: InputMaybe<Scalars['Float']>;
  positionY?: InputMaybe<Scalars['Float']>;
  positionZ?: InputMaybe<Scalars['Float']>;
  t?: InputMaybe<Scalars['Int']>;
  x?: InputMaybe<Scalars['Int']>;
  y?: InputMaybe<Scalars['Int']>;
  z?: InputMaybe<Scalars['Int']>;
};

export type Plot = {
  __typename?: 'Plot';
  createdAt: Scalars['DateTime'];
  creator: User;
  description: Scalars['String'];
  id: Scalars['ID'];
  name: Scalars['String'];
  query: Scalars['String'];
  updatedAt: Scalars['DateTime'];
};

/** The root Query */
export type Query = {
  __typename?: 'Query';
  accessiblerepresentations?: Maybe<Array<Maybe<Representation>>>;
  columnsof?: Maybe<Array<Maybe<Column>>>;
  commentsfor?: Maybe<Array<Maybe<Comment>>>;
  /** Get a single representation by ID */
  experiment?: Maybe<Experiment>;
  /** All Samples */
  experiments?: Maybe<Array<Maybe<Experiment>>>;
  /** Get a single representation by ID */
  feature?: Maybe<Feature>;
  /** All represetations */
  features?: Maybe<Array<Maybe<Feature>>>;
  hello?: Maybe<Scalars['String']>;
  /** Get a single representation by ID */
  instrument?: Maybe<Instrument>;
  /** All represetations */
  instruments?: Maybe<Array<Maybe<Instrument>>>;
  /** Get a single representation by ID */
  label?: Maybe<Label>;
  /** Get a label for a specific instance on a specific representation */
  labelFor?: Maybe<Label>;
  /** All represetations */
  labels?: Maybe<Array<Maybe<Label>>>;
  /** Get a single representation by ID */
  metric?: Maybe<Metric>;
  /** All Samples */
  metrics?: Maybe<Array<Maybe<Metric>>>;
  /** My samples return all of the users samples attached to the current user */
  myexperiments?: Maybe<Array<Maybe<Experiment>>>;
  mymentions?: Maybe<Array<Maybe<Comment>>>;
  /** My samples return all of the users samples attached to the current user */
  myomerofiles?: Maybe<Array<Maybe<OmeroFile>>>;
  myplots?: Maybe<Array<Maybe<Plot>>>;
  /** My Representations returns all of the Representations, attached to the current user */
  myrepresentations?: Maybe<Array<Maybe<Representation>>>;
  /** My samples return all of the users samples attached to the current user */
  mysamples?: Maybe<Array<Maybe<Sample>>>;
  /** My samples return all of the users samples attached to the current user */
  mytables?: Maybe<Array<Maybe<Table>>>;
  /** Get a single representation by ID */
  omerofile?: Maybe<OmeroFile>;
  /** My samples return all of the users samples attached to the current user */
  omerofiles?: Maybe<Array<Maybe<OmeroFile>>>;
  permissionsFor?: Maybe<Array<Maybe<Permission>>>;
  permissionsOf?: Maybe<PermissionsOfReturn>;
  plot?: Maybe<Plot>;
  /** Get a single representation by ID */
  randomRepresentation?: Maybe<Representation>;
  /** Get a single representation by ID */
  representation?: Maybe<Representation>;
  /** All represetations */
  representations?: Maybe<Array<Maybe<Representation>>>;
  representationsForGroup?: Maybe<Array<Maybe<Representation>>>;
  representationsForUser?: Maybe<Array<Maybe<Representation>>>;
  /** Get a single representation by ID */
  request?: Maybe<Credentials>;
  /** Get a single representation by ID */
  roi?: Maybe<Roi>;
  /** All represetations */
  rois?: Maybe<Array<Maybe<Roi>>>;
  /** Get a single representation by ID */
  sample?: Maybe<Sample>;
  /** All Samples */
  samples?: Maybe<Array<Maybe<Sample>>>;
  sharedrepresentations?: Maybe<Array<Maybe<Representation>>>;
  /** Get a single representation by ID */
  table?: Maybe<Table>;
  /** My samples return all of the users samples attached to the current user */
  tables?: Maybe<Array<Maybe<Table>>>;
  /** All Samples */
  tags?: Maybe<Array<Maybe<Tag>>>;
  /** Get a single representation by ID */
  thumbnail?: Maybe<Thumbnail>;
  /** All represetations */
  thumbnails?: Maybe<Array<Maybe<Thumbnail>>>;
  /** Get a list of users */
  users?: Maybe<Array<Maybe<User>>>;
  void?: Maybe<Scalars['String']>;
};


/** The root Query */
export type QueryColumnsofArgs = {
  dtype?: InputMaybe<Array<InputMaybe<PandasDType>>>;
  id: Scalars['ID'];
  name?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryCommentsforArgs = {
  id?: InputMaybe<Scalars['ID']>;
  model: CommentableModels;
};


/** The root Query */
export type QueryExperimentArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryExperimentsArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  creator?: InputMaybe<Scalars['ID']>;
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
  creator?: InputMaybe<Scalars['Float']>;
  keys?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  label?: InputMaybe<Scalars['ID']>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  substring?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryInstrumentArgs = {
  id?: InputMaybe<Scalars['ID']>;
  name?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryInstrumentsArgs = {
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
  creator?: InputMaybe<Scalars['Float']>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  representation?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryMetricArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryMetricsArgs = {
  creator?: InputMaybe<Scalars['ID']>;
  experiment?: InputMaybe<Scalars['ID']>;
  keys?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  representation?: InputMaybe<Scalars['ID']>;
  sample?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryMyexperimentsArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  creator?: InputMaybe<Scalars['ID']>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Query */
export type QueryMyomerofilesArgs = {
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
};


/** The root Query */
export type QueryMyrepresentationsArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  creator?: InputMaybe<Scalars['ID']>;
  derivedTags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  forceThumbnail?: InputMaybe<Scalars['Boolean']>;
  hasMetric?: InputMaybe<Scalars['String']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  noChildren?: InputMaybe<Scalars['Boolean']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ordering?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  samples?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  variety?: InputMaybe<RepresentationVarietyInput>;
};


/** The root Query */
export type QueryMysamplesArgs = {
  bioseries?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
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
export type QueryMytablesArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  creator?: InputMaybe<Scalars['ID']>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Query */
export type QueryOmerofileArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryOmerofilesArgs = {
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
export type QueryRepresentationArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryRepresentationsArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  creator?: InputMaybe<Scalars['ID']>;
  derivedTags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  forceThumbnail?: InputMaybe<Scalars['Boolean']>;
  hasMetric?: InputMaybe<Scalars['String']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  noChildren?: InputMaybe<Scalars['Boolean']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ordering?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  samples?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
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
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  creator?: InputMaybe<Scalars['ID']>;
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
  bioseries?: InputMaybe<Scalars['String']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
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
export type QueryTableArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryTablesArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  creator?: InputMaybe<Scalars['ID']>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Query */
export type QueryTagsArgs = {
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
};


/** The root Query */
export type QueryThumbnailArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryThumbnailsArgs = {
  creator?: InputMaybe<Scalars['ID']>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Query */
export type QueryUsersArgs = {
  email?: InputMaybe<Scalars['String']>;
  username?: InputMaybe<Scalars['String']>;
};

export type Roi = {
  __typename?: 'ROI';
  color?: Maybe<Scalars['String']>;
  createdAt: Scalars['DateTime'];
  creator: User;
  derivedRepresentations: Array<Representation>;
  id: Scalars['ID'];
  label?: Maybe<Scalars['String']>;
  nodeid?: Maybe<Scalars['String']>;
  pinned?: Maybe<Scalars['Boolean']>;
  pinnedBy: Array<User>;
  representation?: Maybe<Representation>;
  signature?: Maybe<Scalars['String']>;
  /** A comma-separated list of tags. */
  tags?: Maybe<Array<Maybe<Scalars['String']>>>;
  /** The Representation can have varying types, consult your API */
  type: RoiType;
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

/**
 * A Representation is a multi-dimensional Array that can do what ever it wants
 *
 *
 * @elements/rep:latest
 */
export type Representation = {
  __typename?: 'Representation';
  chain?: Maybe<Scalars['String']>;
  comments?: Maybe<Array<Maybe<Comment>>>;
  createdAt: Scalars['DateTime'];
  creator?: Maybe<User>;
  /** Derived Images from this Image */
  derived?: Maybe<Array<Maybe<Representation>>>;
  description?: Maybe<Scalars['String']>;
  /** The arrays dimension */
  dims?: Maybe<Array<Scalars['String']>>;
  fileOrigins: Array<OmeroFile>;
  /** The File Version of this Array */
  fileversion: Scalars['String'];
  /** Does this Model have attached Data? */
  hasArray: Scalars['Boolean'];
  id: Scalars['ID'];
  /** The Arkitekt identifier */
  identifier?: Maybe<Scalars['String']>;
  labels: Array<Label>;
  latestThumbnail?: Maybe<Thumbnail>;
  meta?: Maybe<Scalars['GenericScalar']>;
  /** Associated metrics of this Image */
  metrics?: Maybe<Array<Maybe<Metric>>>;
  /** Cleartext name */
  name?: Maybe<Scalars['String']>;
  nodeid?: Maybe<Scalars['String']>;
  omero?: Maybe<Omero>;
  origins: Array<Representation>;
  pinned?: Maybe<Scalars['Boolean']>;
  pinnedBy: Array<User>;
  roiOrigins: Array<Roi>;
  /** Associated rois */
  rois?: Maybe<Array<Maybe<Roi>>>;
  /** The Sample this representation belosngs to */
  sample?: Maybe<Sample>;
  /** The arrays shape */
  shape?: Maybe<Array<Scalars['Int']>>;
  store?: Maybe<Scalars['Store']>;
  /** Associated tables */
  tables?: Maybe<Array<Maybe<Table>>>;
  /** A comma-separated list of tags. */
  tags?: Maybe<Array<Maybe<Scalars['String']>>>;
  /** The Sample this representation belongs to */
  thumbnails: Array<Thumbnail>;
  /** The Representation can have varying types, consult your API */
  type?: Maybe<Scalars['String']>;
  /** A unique identifier for this array */
  unique: Scalars['UUID'];
  /** The Representation can have vasrying types, consult your API */
  variety: RepresentationVariety;
};


/**
 * A Representation is a multi-dimensional Array that can do what ever it wants
 *
 *
 * @elements/rep:latest
 */
export type RepresentationDerivedArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  creator?: InputMaybe<Scalars['ID']>;
  derivedTags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  forceThumbnail?: InputMaybe<Scalars['Boolean']>;
  hasMetric?: InputMaybe<Scalars['String']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  noChildren?: InputMaybe<Scalars['Boolean']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ordering?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  samples?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  variety?: InputMaybe<RepresentationVarietyInput>;
};


/**
 * A Representation is a multi-dimensional Array that can do what ever it wants
 *
 *
 * @elements/rep:latest
 */
export type RepresentationMetricsArgs = {
  creator?: InputMaybe<Scalars['ID']>;
  experiment?: InputMaybe<Scalars['ID']>;
  keys?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  representation?: InputMaybe<Scalars['ID']>;
  sample?: InputMaybe<Scalars['ID']>;
};


/**
 * A Representation is a multi-dimensional Array that can do what ever it wants
 *
 *
 * @elements/rep:latest
 */
export type RepresentationRoisArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  creator?: InputMaybe<Scalars['ID']>;
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
 * A Representation is a multi-dimensional Array that can do what ever it wants
 *
 *
 * @elements/rep:latest
 */
export type RepresentationTablesArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  creator?: InputMaybe<Scalars['ID']>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
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

/**
 * Samples are storage containers for representations. A Sample is to be understood analogous to a Biological Sample. It existed in Time (the time of acquisiton and experimental procedure),
 *     was measured in space (x,y,z) and in different modalities (c). Sample therefore provide a datacontainer where each Representation of
 *     the data shares the same dimensions. Every transaction to our image data is still part of the original acuqistion, so also filtered images are refering back to the sample
 *
 */
export type Sample = {
  __typename?: 'Sample';
  createdAt: Scalars['DateTime'];
  creator?: Maybe<User>;
  experiments: Array<Experiment>;
  id: Scalars['ID'];
  meta?: Maybe<Scalars['GenericScalar']>;
  /** The Representatoin this Metric belongs to */
  metrics: Array<Metric>;
  name: Scalars['String'];
  nodeid?: Maybe<Scalars['String']>;
  pinned?: Maybe<Scalars['Boolean']>;
  pinnedBy: Array<User>;
  representations?: Maybe<Array<Maybe<Representation>>>;
  tables: Array<Table>;
  /** A comma-separated list of tags. */
  tags?: Maybe<Array<Maybe<Scalars['String']>>>;
};


/**
 * Samples are storage containers for representations. A Sample is to be understood analogous to a Biological Sample. It existed in Time (the time of acquisiton and experimental procedure),
 *     was measured in space (x,y,z) and in different modalities (c). Sample therefore provide a datacontainer where each Representation of
 *     the data shares the same dimensions. Every transaction to our image data is still part of the original acuqistion, so also filtered images are refering back to the sample
 *
 */
export type SampleRepresentationsArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  creator?: InputMaybe<Scalars['ID']>;
  derivedTags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  forceThumbnail?: InputMaybe<Scalars['Boolean']>;
  hasMetric?: InputMaybe<Scalars['String']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  noChildren?: InputMaybe<Scalars['Boolean']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ordering?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  samples?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  variety?: InputMaybe<RepresentationVarietyInput>;
};

export type SamplesEvent = {
  __typename?: 'SamplesEvent';
  create?: Maybe<Sample>;
  deleted?: Maybe<Scalars['ID']>;
  update?: Maybe<Sample>;
};

export enum SharableModels {
  BordTable = 'BORD_TABLE',
  GrunnlagAnimal = 'GRUNNLAG_ANIMAL',
  GrunnlagAntibody = 'GRUNNLAG_ANTIBODY',
  GrunnlagExperiment = 'GRUNNLAG_EXPERIMENT',
  GrunnlagExperimentalgroup = 'GRUNNLAG_EXPERIMENTALGROUP',
  GrunnlagFeature = 'GRUNNLAG_FEATURE',
  GrunnlagInstrument = 'GRUNNLAG_INSTRUMENT',
  GrunnlagLabel = 'GRUNNLAG_LABEL',
  GrunnlagMetric = 'GRUNNLAG_METRIC',
  GrunnlagOmero = 'GRUNNLAG_OMERO',
  GrunnlagOmerofile = 'GRUNNLAG_OMEROFILE',
  GrunnlagRepresentation = 'GRUNNLAG_REPRESENTATION',
  GrunnlagRoi = 'GRUNNLAG_ROI',
  GrunnlagSample = 'GRUNNLAG_SAMPLE',
  GrunnlagThumbnail = 'GRUNNLAG_THUMBNAIL',
  GrunnlagUsermeta = 'GRUNNLAG_USERMETA'
}

/** The root Subscriptions */
export type Subscription = {
  __typename?: 'Subscription';
  myExperiments?: Maybe<ExperimentsEvent>;
  myRepresentations?: Maybe<RepresentationEvent>;
  mySamples?: Maybe<SamplesEvent>;
  myTables?: Maybe<TablesEvent>;
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

export type Table = {
  __typename?: 'Table';
  /** Columns Data */
  columns?: Maybe<Array<Maybe<Column>>>;
  createdAt: Scalars['DateTime'];
  creator?: Maybe<User>;
  experiment?: Maybe<Experiment>;
  id: Scalars['ID'];
  name: Scalars['String'];
  pinned?: Maybe<Scalars['Boolean']>;
  pinnedBy: Array<User>;
  /** List of Records */
  query?: Maybe<Array<Maybe<Scalars['GenericScalar']>>>;
  representation?: Maybe<Representation>;
  sample?: Maybe<Sample>;
  store?: Maybe<Scalars['Parquet']>;
  /** A comma-separated list of tags. */
  tags?: Maybe<Array<Maybe<Scalars['String']>>>;
};


export type TableColumnsArgs = {
  only?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


export type TableQueryArgs = {
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  only?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  query?: InputMaybe<Scalars['String']>;
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

/** Thumbnail(id, representation, image, major_color) */
export type Thumbnail = {
  __typename?: 'Thumbnail';
  id: Scalars['ID'];
  image?: Maybe<Scalars['String']>;
  majorColor?: Maybe<Scalars['String']>;
  /** The Sample this representation belongs to */
  representation: Representation;
};

export type User = {
  __typename?: 'User';
  /** The color of the user */
  color: Scalars['String'];
  email: Scalars['String'];
  firstName: Scalars['String'];
  /** The groups this user belongs to. A user will get all permissions granted to each of their groups. */
  groups: Array<Group>;
  id: Scalars['ID'];
  lastName: Scalars['String'];
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
  /** The user email */
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

export type LeafFragment = { __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' };

type Node_MentionDescendent_Fragment = { __typename?: 'MentionDescendent', typename: 'MentionDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null };

type Node_ParagraphDescendent_Fragment = { __typename?: 'ParagraphDescendent', typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null };

export type NodeFragment = Node_MentionDescendent_Fragment | Node_ParagraphDescendent_Fragment;

export type LevelDownParagraphFragment = { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null };

export type LevelDownMentionFragment = { __typename?: 'MentionDescendent', user: string };

type LevelDownDescendent_Leaf_Fragment = { __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' };

type LevelDownDescendent_MentionDescendent_Fragment = { __typename?: 'MentionDescendent', typename: 'MentionDescendent' };

type LevelDownDescendent_ParagraphDescendent_Fragment = { __typename?: 'ParagraphDescendent', typename: 'ParagraphDescendent' };

export type LevelDownDescendentFragment = LevelDownDescendent_Leaf_Fragment | LevelDownDescendent_MentionDescendent_Fragment | LevelDownDescendent_ParagraphDescendent_Fragment;

export type MentionFragment = { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null };

export type ParagraphFragment = { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null };

type Descendent_Leaf_Fragment = { __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' };

type Descendent_MentionDescendent_Fragment = { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null };

type Descendent_ParagraphDescendent_Fragment = { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null };

export type DescendentFragment = Descendent_Leaf_Fragment | Descendent_MentionDescendent_Fragment | Descendent_ParagraphDescendent_Fragment;

export type SubthreadCommentFragment = { __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', email: string }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null };

export type ListCommentFragment = { __typename?: 'Comment', id: string, createdAt: any, user: { __typename?: 'User', email: string }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', email: string }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null };

export type MentionCommentFragment = { __typename?: 'Comment', id: string, createdAt: any, objectId: number, contentType?: CommentableModels | null, user: { __typename?: 'User', email: string }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', email: string }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null, mentions: Array<{ __typename?: 'User', email: string }> };

export type DetailExperimentFragment = { __typename?: 'Experiment', id: string, name: string, description?: string | null, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples?: Array<{ __typename?: 'Sample', id: string, name: string } | null> | null, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> };

export type ListExperimentFragment = { __typename?: 'Experiment', id: string, name: string, description?: string | null };

export type OmeroFragment = { __typename?: 'Omero', id: string, acquisitionDate?: any | null, scale?: Array<number | null> | null, physicalSize?: { __typename?: 'PhysicalSize', x?: number | null, y?: number | null, z?: number | null, t?: number | null } | null, planes?: Array<{ __typename?: 'Plane', z?: number | null, t?: number | null, exposureTime?: number | null, deltaT?: number | null } | null> | null, channels?: Array<{ __typename?: 'Channel', name?: string | null, emmissionWavelength?: number | null, excitationWavelength?: number | null, color?: string | null } | null> | null, objectiveSettings?: { __typename?: 'ObjectiveSettings', correctionCollar?: number | null, medium?: Medium | null } | null, instrument?: { __typename?: 'Instrument', id: string, name: string, model?: string | null } | null, imagingEnvironment?: { __typename?: 'ImagingEnvironment', airPressure?: number | null, co2Percent?: number | null, humidity?: number | null, temperature?: number | null } | null };

export type DetailOmeroFileFragment = { __typename?: 'OmeroFile', id: string, name: string, type: OmeroFileType, createdAt: any, file?: any | null, tags?: Array<string | null> | null, derivedRepresentations: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null }> };

export type ListOmeroFileFragment = { __typename?: 'OmeroFile', id: string, name: string, type: OmeroFileType, createdAt: any, file?: any | null };

export type UserAssignmentFragment = { __typename?: 'UserAssignment', permissions: Array<string | null>, user: { __typename?: 'User', id: string, username: string, email: string } };

export type GroupAssignmentFragment = { __typename?: 'GroupAssignment', permissions: Array<string | null>, group: { __typename?: 'Group', name: string } };

export type PlotFragment = { __typename?: 'Plot', id: string, query: string, name: string, description: string, createdAt: any, updatedAt: any, creator: { __typename?: 'User', username: string } };

export type ListPlotFragment = { __typename?: 'Plot', id: string, name: string, creator: { __typename?: 'User', username: string } };

export type ListRepresentationFragment = { __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null };

export type ListSharedRepresentationFragment = { __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null, creator?: { __typename?: 'User', email: string } | null };

export type DetailRepresentationFragment = { __typename?: 'Representation', id: string, name?: string | null, shape?: Array<number> | null, dims?: Array<string> | null, tags?: Array<string | null> | null, store?: any | null, createdAt: any, pinned?: boolean | null, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null } | null, sample?: { __typename?: 'Sample', id: string, name: string } | null, metrics?: Array<{ __typename?: 'Metric', id: string, key: string, value?: any | null } | null> | null, omero?: { __typename?: 'Omero', id: string, acquisitionDate?: any | null, scale?: Array<number | null> | null, physicalSize?: { __typename?: 'PhysicalSize', x?: number | null, y?: number | null, z?: number | null, t?: number | null } | null, planes?: Array<{ __typename?: 'Plane', z?: number | null, t?: number | null, exposureTime?: number | null, deltaT?: number | null } | null> | null, channels?: Array<{ __typename?: 'Channel', name?: string | null, emmissionWavelength?: number | null, excitationWavelength?: number | null, color?: string | null } | null> | null, objectiveSettings?: { __typename?: 'ObjectiveSettings', correctionCollar?: number | null, medium?: Medium | null } | null, instrument?: { __typename?: 'Instrument', id: string, name: string, model?: string | null } | null, imagingEnvironment?: { __typename?: 'ImagingEnvironment', airPressure?: number | null, co2Percent?: number | null, humidity?: number | null, temperature?: number | null } | null } | null, origins: Array<{ __typename?: 'Representation', id: string, name?: string | null, tags?: Array<string | null> | null, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null } | null }>, derived?: Array<{ __typename?: 'Representation', id: string, name?: string | null, tags?: Array<string | null> | null, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null } | null } | null> | null, rois?: Array<{ __typename?: 'ROI', id: string, type: RoiType, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, creator: { __typename?: 'User', id: string }, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null, t?: number | null, c?: number | null } | null> | null } | null> | null, fileOrigins: Array<{ __typename?: 'OmeroFile', id: string, name: string, type: OmeroFileType }>, roiOrigins: Array<{ __typename?: 'ROI', id: string, label?: string | null, type: RoiType }>, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> };

export type RepRoiFragment = { __typename?: 'ROI', id: string, type: RoiType, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, creator: { __typename?: 'User', id: string }, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null, t?: number | null, c?: number | null } | null> | null };

export type DetailRoiFragment = { __typename?: 'ROI', id: string, type: RoiType, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, creator: { __typename?: 'User', id: string }, representation?: { __typename?: 'Representation', id: string, name?: string | null, variety: RepresentationVariety, tags?: Array<string | null> | null, creator?: { __typename?: 'User', id: string } | null } | null, derivedRepresentations: Array<{ __typename?: 'Representation', id: string, name?: string | null }>, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null } | null> | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> };

export type DetailSampleFragment = { __typename?: 'Sample', name: string, id: string, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, experiments: Array<{ __typename?: 'Experiment', id: string, name: string }>, representations?: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null> | null, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> };

export type ListSampleFragment = { __typename?: 'Sample', name: string, id: string, pinned?: boolean | null, experiments: Array<{ __typename?: 'Experiment', name: string }> };

export type ColumnFragment = { __typename?: 'Column', name?: string | null, fieldName: string, pandasType?: PandasDType | null, numpyType?: string | null, metadata?: any | null };

export type DetailTableFragment = { __typename?: 'Table', id: string, name: string, representation?: { __typename?: 'Representation', id: string } | null, sample?: { __typename?: 'Sample', id: string } | null, experiment?: { __typename?: 'Experiment', id: string } | null };

export type ListTableFragment = { __typename?: 'Table', id: string, name: string, columns?: Array<{ __typename?: 'Column', name?: string | null, fieldName: string, pandasType?: PandasDType | null, numpyType?: string | null, metadata?: any | null } | null> | null, representation?: { __typename?: 'Representation', id: string } | null, sample?: { __typename?: 'Sample', id: string } | null, experiment?: { __typename?: 'Experiment', id: string } | null };

export type CreateCommentMutationVariables = Exact<{
  id: Scalars['ID'];
  model: CommentableModels;
  descendents: Array<InputMaybe<DescendendInput>>;
  parent?: InputMaybe<Scalars['ID']>;
}>;


export type CreateCommentMutation = { __typename?: 'Mutation', createComment?: { __typename?: 'Comment', id: string, createdAt: any, user: { __typename?: 'User', email: string }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', email: string }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null } | null };

export type CreateExperimentMutationVariables = Exact<{
  name: Scalars['String'];
  description: Scalars['String'];
}>;


export type CreateExperimentMutation = { __typename?: 'Mutation', createExperiment?: { __typename?: 'Experiment', id: string, name: string, description?: string | null, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples?: Array<{ __typename?: 'Sample', id: string, name: string } | null> | null, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

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


export type UpdateExperimentMutation = { __typename?: 'Mutation', updateExperiment?: { __typename?: 'Experiment', id: string, name: string, description?: string | null, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples?: Array<{ __typename?: 'Sample', id: string, name: string } | null> | null, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

export type PinExperimentMutationVariables = Exact<{
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
}>;


export type PinExperimentMutation = { __typename?: 'Mutation', pinExperiment?: { __typename?: 'Experiment', id: string, pinned?: boolean | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

export type UploadOmeroFileMutationVariables = Exact<{
  file: Scalars['ImageFile'];
}>;


export type UploadOmeroFileMutation = { __typename?: 'Mutation', uploadOmeroFile?: { __typename?: 'OmeroFile', id: string, name: string, type: OmeroFileType, createdAt: any, file?: any | null, tags?: Array<string | null> | null, derivedRepresentations: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null }> } | null };

export type DeleteOmeroFileMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteOmeroFileMutation = { __typename?: 'Mutation', deleteOmeroFile?: { __typename?: 'DeleteOmeroFileResult', id?: string | null } | null };

export type UpdateOmeroFileMutationVariables = Exact<{
  id: Scalars['ID'];
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
}>;


export type UpdateOmeroFileMutation = { __typename?: 'Mutation', updateOmeroFile?: { __typename?: 'OmeroFile', id: string, name: string, type: OmeroFileType, createdAt: any, file?: any | null, tags?: Array<string | null> | null, derivedRepresentations: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null }> } | null };

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


export type UpdateRepresentationMutation = { __typename?: 'Mutation', updateRepresentation?: { __typename?: 'Representation', id: string, name?: string | null, shape?: Array<number> | null, dims?: Array<string> | null, tags?: Array<string | null> | null, store?: any | null, createdAt: any, pinned?: boolean | null, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null } | null, sample?: { __typename?: 'Sample', id: string, name: string } | null, metrics?: Array<{ __typename?: 'Metric', id: string, key: string, value?: any | null } | null> | null, omero?: { __typename?: 'Omero', id: string, acquisitionDate?: any | null, scale?: Array<number | null> | null, physicalSize?: { __typename?: 'PhysicalSize', x?: number | null, y?: number | null, z?: number | null, t?: number | null } | null, planes?: Array<{ __typename?: 'Plane', z?: number | null, t?: number | null, exposureTime?: number | null, deltaT?: number | null } | null> | null, channels?: Array<{ __typename?: 'Channel', name?: string | null, emmissionWavelength?: number | null, excitationWavelength?: number | null, color?: string | null } | null> | null, objectiveSettings?: { __typename?: 'ObjectiveSettings', correctionCollar?: number | null, medium?: Medium | null } | null, instrument?: { __typename?: 'Instrument', id: string, name: string, model?: string | null } | null, imagingEnvironment?: { __typename?: 'ImagingEnvironment', airPressure?: number | null, co2Percent?: number | null, humidity?: number | null, temperature?: number | null } | null } | null, origins: Array<{ __typename?: 'Representation', id: string, name?: string | null, tags?: Array<string | null> | null, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null } | null }>, derived?: Array<{ __typename?: 'Representation', id: string, name?: string | null, tags?: Array<string | null> | null, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null } | null } | null> | null, rois?: Array<{ __typename?: 'ROI', id: string, type: RoiType, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, creator: { __typename?: 'User', id: string }, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null, t?: number | null, c?: number | null } | null> | null } | null> | null, fileOrigins: Array<{ __typename?: 'OmeroFile', id: string, name: string, type: OmeroFileType }>, roiOrigins: Array<{ __typename?: 'ROI', id: string, label?: string | null, type: RoiType }>, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

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

export type CreateSampleMutationVariables = Exact<{
  experiments?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  name: Scalars['String'];
}>;


export type CreateSampleMutation = { __typename?: 'Mutation', createSample?: { __typename?: 'Sample', name: string, id: string, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, experiments: Array<{ __typename?: 'Experiment', id: string, name: string }>, representations?: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null> | null, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

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


export type UpdateSampleMutation = { __typename?: 'Mutation', updateSample?: { __typename?: 'Sample', name: string, id: string, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, experiments: Array<{ __typename?: 'Experiment', id: string, name: string }>, representations?: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null> | null, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

export type PinSampleMutationVariables = Exact<{
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
}>;


export type PinSampleMutation = { __typename?: 'Mutation', pinSample?: { __typename?: 'Sample', id: string, pinned?: boolean | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

export type DeleteTableMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteTableMutation = { __typename?: 'Mutation', deleteTable?: { __typename?: 'DeleteTableResult', id?: string | null } | null };

export type CommentsForQueryVariables = Exact<{
  id: Scalars['ID'];
  model: CommentableModels;
}>;


export type CommentsForQuery = { __typename?: 'Query', commentsfor?: Array<{ __typename?: 'Comment', id: string, createdAt: any, user: { __typename?: 'User', email: string }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', email: string }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null } | null> | null };

export type MyMentionsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyMentionsQuery = { __typename?: 'Query', mymentions?: Array<{ __typename?: 'Comment', id: string, createdAt: any, objectId: number, contentType?: CommentableModels | null, user: { __typename?: 'User', email: string }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', email: string }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null, mentions: Array<{ __typename?: 'User', email: string }> } | null> | null };

export type MyExperimentsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
}>;


export type MyExperimentsQuery = { __typename?: 'Query', myexperiments?: Array<{ __typename?: 'Experiment', id: string, name: string, description?: string | null } | null> | null };

export type DetailExperimentQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailExperimentQuery = { __typename?: 'Query', experiment?: { __typename?: 'Experiment', id: string, name: string, description?: string | null, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, samples?: Array<{ __typename?: 'Sample', id: string, name: string } | null> | null, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

export type SearchExperimentsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type SearchExperimentsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Experiment', label: string, value: string } | null> | null };

export type GlobalSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  creator?: InputMaybe<Scalars['ID']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
}>;


export type GlobalSearchQuery = { __typename?: 'Query', experiments?: Array<{ __typename?: 'Experiment', id: string, name: string, description?: string | null } | null> | null, samples?: Array<{ __typename?: 'Sample', id: string, name: string } | null> | null, tables?: Array<{ __typename?: 'Table', id: string, name: string } | null> | null, representations?: Array<{ __typename?: 'Representation', id: string, name?: string | null, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null } | null } | null> | null };

export type DetailMetricQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailMetricQuery = { __typename?: 'Query', metric?: { __typename?: 'Metric', key: string, value?: any | null } | null };

export type MyOmeroFilesQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
}>;


export type MyOmeroFilesQuery = { __typename?: 'Query', myomerofiles?: Array<{ __typename?: 'OmeroFile', id: string, name: string, type: OmeroFileType, createdAt: any, file?: any | null } | null> | null };

export type DetailOmeroFileQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailOmeroFileQuery = { __typename?: 'Query', omerofile?: { __typename?: 'OmeroFile', id: string, name: string, type: OmeroFileType, createdAt: any, file?: any | null, tags?: Array<string | null> | null, derivedRepresentations: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null }> } | null };

export type PermissionOptionsQueryVariables = Exact<{
  model: SharableModels;
  search?: InputMaybe<Scalars['String']>;
}>;


export type PermissionOptionsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Permission', label: string, value: string } | null> | null };

export type PermissionsOfQueryVariables = Exact<{
  model: SharableModels;
  id: Scalars['ID'];
}>;


export type PermissionsOfQuery = { __typename?: 'Query', permissionsOf?: { __typename?: 'PermissionsOfReturn', available?: Array<{ __typename?: 'Permission', name: string } | null> | null, options?: Array<{ __typename?: 'Permission', label: string, value: string } | null> | null, groupAssignments?: Array<{ __typename?: 'GroupAssignment', permissions: Array<string | null>, group: { __typename?: 'Group', name: string } } | null> | null, userAssignments?: Array<{ __typename?: 'UserAssignment', permissions: Array<string | null>, user: { __typename?: 'User', id: string, username: string, email: string } } | null> | null } | null };

export type DetailPlotQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailPlotQuery = { __typename?: 'Query', plot?: { __typename?: 'Plot', id: string, query: string, name: string, description: string, createdAt: any, updatedAt: any, creator: { __typename?: 'User', username: string } } | null };

export type MyPlotsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyPlotsQuery = { __typename?: 'Query', myplots?: Array<{ __typename?: 'Plot', id: string, name: string, creator: { __typename?: 'User', username: string } } | null> | null };

export type DetailRepresentationQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailRepresentationQuery = { __typename?: 'Query', representation?: { __typename?: 'Representation', id: string, name?: string | null, shape?: Array<number> | null, dims?: Array<string> | null, tags?: Array<string | null> | null, store?: any | null, createdAt: any, pinned?: boolean | null, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null } | null, sample?: { __typename?: 'Sample', id: string, name: string } | null, metrics?: Array<{ __typename?: 'Metric', id: string, key: string, value?: any | null } | null> | null, omero?: { __typename?: 'Omero', id: string, acquisitionDate?: any | null, scale?: Array<number | null> | null, physicalSize?: { __typename?: 'PhysicalSize', x?: number | null, y?: number | null, z?: number | null, t?: number | null } | null, planes?: Array<{ __typename?: 'Plane', z?: number | null, t?: number | null, exposureTime?: number | null, deltaT?: number | null } | null> | null, channels?: Array<{ __typename?: 'Channel', name?: string | null, emmissionWavelength?: number | null, excitationWavelength?: number | null, color?: string | null } | null> | null, objectiveSettings?: { __typename?: 'ObjectiveSettings', correctionCollar?: number | null, medium?: Medium | null } | null, instrument?: { __typename?: 'Instrument', id: string, name: string, model?: string | null } | null, imagingEnvironment?: { __typename?: 'ImagingEnvironment', airPressure?: number | null, co2Percent?: number | null, humidity?: number | null, temperature?: number | null } | null } | null, origins: Array<{ __typename?: 'Representation', id: string, name?: string | null, tags?: Array<string | null> | null, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null } | null }>, derived?: Array<{ __typename?: 'Representation', id: string, name?: string | null, tags?: Array<string | null> | null, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null } | null } | null> | null, rois?: Array<{ __typename?: 'ROI', id: string, type: RoiType, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, creator: { __typename?: 'User', id: string }, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null, t?: number | null, c?: number | null } | null> | null } | null> | null, fileOrigins: Array<{ __typename?: 'OmeroFile', id: string, name: string, type: OmeroFileType }>, roiOrigins: Array<{ __typename?: 'ROI', id: string, label?: string | null, type: RoiType }>, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

export type MyRepresentationsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  noChildren?: InputMaybe<Scalars['Boolean']>;
}>;


export type MyRepresentationsQuery = { __typename?: 'Query', myrepresentations?: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null> | null };

export type SharedRepresentationsQueryVariables = Exact<{ [key: string]: never; }>;


export type SharedRepresentationsQuery = { __typename?: 'Query', sharedrepresentations?: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null, creator?: { __typename?: 'User', email: string } | null } | null> | null };

export type RepresentationsForQueryVariables = Exact<{
  group: Scalars['String'];
}>;


export type RepresentationsForQuery = { __typename?: 'Query', representationsForGroup?: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null, creator?: { __typename?: 'User', email: string } | null } | null> | null };

export type RepresentationsForUserQueryVariables = Exact<{
  email: Scalars['String'];
}>;


export type RepresentationsForUserQuery = { __typename?: 'Query', representationsForUser?: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null, creator?: { __typename?: 'User', email: string } | null } | null> | null };

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


export type SearchableRepresentationsQuery = { __typename?: 'Query', myrepresentations?: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null> | null };

export type RepresentationFilterSearchQueryVariables = Exact<{
  value: Scalars['String'];
}>;


export type RepresentationFilterSearchQuery = { __typename?: 'Query', Samples?: Array<{ __typename?: 'Sample', label: string, value: string } | null> | null, Experiments?: Array<{ __typename?: 'Experiment', label: string, value: string } | null> | null, Tags?: Array<{ __typename?: 'Tag', label: string, value: string } | null> | null, DerivedTags?: Array<{ __typename?: 'Tag', label: string, value: string } | null> | null };

export type PinnedRepresentationsQueryVariables = Exact<{ [key: string]: never; }>;


export type PinnedRepresentationsQuery = { __typename?: 'Query', representations?: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null> | null };

export type RoisForRepresentationQueryVariables = Exact<{
  representation: Scalars['ID'];
  type?: InputMaybe<Array<InputMaybe<RoiTypeInput>>>;
}>;


export type RoisForRepresentationQuery = { __typename?: 'Query', rois?: Array<{ __typename?: 'ROI', id: string, type: RoiType, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, creator: { __typename?: 'User', id: string }, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null, t?: number | null, c?: number | null } | null> | null } | null> | null };

export type DetailRoiQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailRoiQuery = { __typename?: 'Query', roi?: { __typename?: 'ROI', id: string, type: RoiType, tags?: Array<string | null> | null, createdAt: any, pinned?: boolean | null, creator: { __typename?: 'User', id: string }, representation?: { __typename?: 'Representation', id: string, name?: string | null, variety: RepresentationVariety, tags?: Array<string | null> | null, creator?: { __typename?: 'User', id: string } | null } | null, derivedRepresentations: Array<{ __typename?: 'Representation', id: string, name?: string | null }>, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null } | null> | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

export type DetailSampleQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailSampleQuery = { __typename?: 'Query', sample?: { __typename?: 'Sample', name: string, id: string, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, experiments: Array<{ __typename?: 'Experiment', id: string, name: string }>, representations?: Array<{ __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null> | null, creator?: { __typename?: 'User', id: string, email: string } | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

export type MySamplesQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
}>;


export type MySamplesQuery = { __typename?: 'Query', mysamples?: Array<{ __typename?: 'Sample', name: string, id: string, pinned?: boolean | null, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null> | null };

export type SearchSampleQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type SearchSampleQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Sample', value: string, label: string } | null> | null };

export type TestBoardQueryVariables = Exact<{
  exp: Scalars['ID'];
}>;


export type TestBoardQuery = { __typename?: 'Query', experiment?: { __typename?: 'Experiment', meta?: any | null, name: string, id: string, samples?: Array<{ __typename?: 'Sample', meta?: any | null, name: string, id: string, representations?: Array<{ __typename?: 'Representation', id: string, meta?: any | null, name?: string | null, createdAt: any, metrics?: Array<{ __typename?: 'Metric', id: string, key: string, value?: any | null, createdAt: any } | null> | null, thumbnails: Array<{ __typename?: 'Thumbnail', id: string }> } | null> | null } | null> | null } | null };

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


export type TestBoardChangedQuery = { __typename?: 'Query', experiment?: { __typename?: 'Experiment', meta?: any | null, name: string, id: string, samples?: Array<{ __typename?: 'Sample', meta?: any | null, name: string, id: string, display_rep?: Array<{ __typename?: 'Representation', id: string, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null } | null } | null> | null, data_reps?: Array<{ __typename?: 'Representation', id: string, meta?: any | null, variety: RepresentationVariety, metrics?: Array<{ __typename?: 'Metric', value?: any | null } | null> | null } | null> | null } | null> | null } | null };

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

export type DetailTableQueryVariables = Exact<{
  id: Scalars['ID'];
  only?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  query?: InputMaybe<Scalars['String']>;
}>;


export type DetailTableQuery = { __typename?: 'Query', table?: { __typename?: 'Table', query?: Array<any | null> | null, id: string, name: string, columns?: Array<{ __typename?: 'Column', name?: string | null, fieldName: string, pandasType?: PandasDType | null, numpyType?: string | null, metadata?: any | null } | null> | null, representation?: { __typename?: 'Representation', id: string } | null, sample?: { __typename?: 'Sample', id: string } | null, experiment?: { __typename?: 'Experiment', id: string } | null } | null };

export type MyTablesQueryVariables = Exact<{ [key: string]: never; }>;


export type MyTablesQuery = { __typename?: 'Query', mytables?: Array<{ __typename?: 'Table', id: string, name: string, columns?: Array<{ __typename?: 'Column', name?: string | null, fieldName: string, pandasType?: PandasDType | null, numpyType?: string | null, metadata?: any | null } | null> | null, representation?: { __typename?: 'Representation', id: string } | null, sample?: { __typename?: 'Sample', id: string } | null, experiment?: { __typename?: 'Experiment', id: string } | null } | null> | null };

export type TagSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type TagSearchQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Tag', value: string, label: string } | null> | null };

export type UserOptionsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type UserOptionsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'User', value: string, label: string } | null> | null };

export type MyExperimentsEventSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type MyExperimentsEventSubscription = { __typename?: 'Subscription', myExperiments?: { __typename?: 'ExperimentsEvent', deleted?: string | null, create?: { __typename?: 'Experiment', id: string, name: string, description?: string | null } | null, update?: { __typename?: 'Experiment', id: string, name: string, description?: string | null } | null } | null };

export type WatchMentionsSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type WatchMentionsSubscription = { __typename?: 'Subscription', mymentions?: { __typename?: 'MentionEvent', create?: { __typename?: 'Comment', id: string, createdAt: any, objectId: number, contentType?: CommentableModels | null, user: { __typename?: 'User', email: string }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', email: string }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null, mentions: Array<{ __typename?: 'User', email: string }> } | null, update?: { __typename?: 'Comment', id: string, createdAt: any, objectId: number, contentType?: CommentableModels | null, user: { __typename?: 'User', email: string }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', email: string }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', user: string, typename: 'MentionDescendent' } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null, mentions: Array<{ __typename?: 'User', email: string }> } | null } | null };

export type MyRepresentationsEventSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type MyRepresentationsEventSubscription = { __typename?: 'Subscription', myRepresentations?: { __typename?: 'RepresentationEvent', deleted?: string | null, create?: { __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null, update?: { __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null } | null };

export type MyRepresentationsOriginSubscriptionVariables = Exact<{
  origin: Scalars['ID'];
}>;


export type MyRepresentationsOriginSubscription = { __typename?: 'Subscription', myRepresentations?: { __typename?: 'RepresentationEvent', deleted?: string | null, create?: { __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null, update?: { __typename?: 'Representation', name?: string | null, id: string, variety: RepresentationVariety, pinned?: boolean | null, origins: Array<{ __typename?: 'Representation', name?: string | null }>, latestThumbnail?: { __typename?: 'Thumbnail', image?: string | null, majorColor?: string | null } | null, sample?: { __typename?: 'Sample', name: string, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null } | null };

export type WatchRoisSubscriptionVariables = Exact<{
  representation: Scalars['ID'];
}>;


export type WatchRoisSubscription = { __typename?: 'Subscription', rois?: { __typename?: 'RoiEvent', delete?: string | null, update?: { __typename?: 'ROI', id: string, type: RoiType, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, creator: { __typename?: 'User', id: string }, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null, t?: number | null, c?: number | null } | null> | null } | null, create?: { __typename?: 'ROI', id: string, type: RoiType, createdAt: any, tags?: Array<string | null> | null, pinned?: boolean | null, creator: { __typename?: 'User', id: string }, vectors?: Array<{ __typename?: 'Vector', x?: number | null, y?: number | null, z?: number | null, t?: number | null, c?: number | null } | null> | null } | null } | null };

export type MySamplesEventSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type MySamplesEventSubscription = { __typename?: 'Subscription', mySamples?: { __typename?: 'SamplesEvent', deleted?: string | null, create?: { __typename?: 'Sample', name: string, id: string, pinned?: boolean | null, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null, update?: { __typename?: 'Sample', name: string, id: string, pinned?: boolean | null, experiments: Array<{ __typename?: 'Experiment', name: string }> } | null } | null };

export type MyTablesEventSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type MyTablesEventSubscription = { __typename?: 'Subscription', myTables?: { __typename?: 'TablesEvent', deleted?: string | null, create?: { __typename?: 'Table', id: string, name: string, columns?: Array<{ __typename?: 'Column', name?: string | null, fieldName: string, pandasType?: PandasDType | null, numpyType?: string | null, metadata?: any | null } | null> | null, representation?: { __typename?: 'Representation', id: string } | null, sample?: { __typename?: 'Sample', id: string } | null, experiment?: { __typename?: 'Experiment', id: string } | null } | null, update?: { __typename?: 'Table', id: string, name: string, columns?: Array<{ __typename?: 'Column', name?: string | null, fieldName: string, pandasType?: PandasDType | null, numpyType?: string | null, metadata?: any | null } | null> | null, representation?: { __typename?: 'Representation', id: string } | null, sample?: { __typename?: 'Sample', id: string } | null, experiment?: { __typename?: 'Experiment', id: string } | null } | null } | null };

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
  user
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
  user
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
    email
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
    email
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
}
    ${DescendentFragmentDoc}
${SubthreadCommentFragmentDoc}`;
export const MentionCommentFragmentDoc = gql`
    fragment MentionComment on Comment {
  user {
    email
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
    email
  }
  objectId
  contentType
}
    ${DescendentFragmentDoc}
${SubthreadCommentFragmentDoc}`;
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
}
    `;
export const ListExperimentFragmentDoc = gql`
    fragment ListExperiment on Experiment {
  id
  name
  description
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
  }
  sample {
    name
    experiments {
      name
    }
  }
  variety
  pinned
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
}
    ${ListRepresentationFragmentDoc}`;
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
    id
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
export const ListSharedRepresentationFragmentDoc = gql`
    fragment ListSharedRepresentation on Representation {
  name
  id
  origins {
    name
  }
  latestThumbnail {
    image
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
  instrument {
    id
    name
    model
  }
  imagingEnvironment {
    airPressure
    co2Percent
    humidity
    temperature
  }
  scale
}
    `;
export const RepRoiFragmentDoc = gql`
    fragment RepRoi on ROI {
  id
  type
  createdAt
  creator {
    id
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
}
    `;
export const DetailRepresentationFragmentDoc = gql`
    fragment DetailRepresentation on Representation {
  id
  name
  shape
  dims
  tags
  store
  createdAt
  latestThumbnail {
    image
    majorColor
  }
  sample {
    id
    name
  }
  metrics {
    id
    key
    value
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
    }
  }
  derived {
    id
    name
    tags
    latestThumbnail {
      image
    }
  }
  rois {
    ...RepRoi
  }
  fileOrigins {
    id
    name
    type
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
    ${OmeroFragmentDoc}
${RepRoiFragmentDoc}`;
export const DetailRoiFragmentDoc = gql`
    fragment DetailRoi on ROI {
  id
  type
  creator {
    id
  }
  tags
  representation {
    id
    name
    variety
    creator {
      id
    }
    tags
  }
  derivedRepresentations {
    id
    name
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
}
    `;
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
export const DetailTableFragmentDoc = gql`
    fragment DetailTable on Table {
  id
  name
  representation {
    id
  }
  sample {
    id
  }
  experiment {
    id
  }
}
    `;
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
  representation {
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
export const UploadOmeroFileDocument = gql`
    mutation UploadOmeroFile($file: ImageFile!) {
  uploadOmeroFile(file: $file) {
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
export const MyExperimentsDocument = gql`
    query MyExperiments($limit: Int, $offset: Int) {
  myexperiments(limit: $limit, offset: $offset) {
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
    query SearchExperiments($search: String) {
  options: experiments(name: $search, limit: 10) {
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
    query GlobalSearch($search: String, $createdBefore: DateTime, $createdAfter: DateTime, $tags: [String], $creator: ID, $pinned: Boolean) {
  experiments: myexperiments(
    name: $search
    limit: 10
    createdBefore: $createdBefore
    createdAfter: $createdAfter
    tags: $tags
    creator: $creator
    pinned: $pinned
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
  ) {
    id
    name
    latestThumbnail {
      image
    }
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
export const MyOmeroFilesDocument = gql`
    query MyOmeroFiles($limit: Int, $offset: Int) {
  myomerofiles(limit: $limit, offset: $offset) {
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
    query MyPlots {
  myplots {
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
    query MyRepresentations($limit: Int, $offset: Int, $order: [String], $noChildren: Boolean = true) {
  myrepresentations(
    limit: $limit
    offset: $offset
    order: $order
    noChildren: $noChildren
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
    query MySamples($limit: Int, $offset: Int) {
  mysamples(limit: $limit, offset: $offset) {
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
    meta
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
    meta
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
export const DetailTableDocument = gql`
    query DetailTable($id: ID!, $only: [String], $limit: Int = 200, $offset: Int = 3, $query: String) {
  table(id: $id) {
    ...DetailTable
    columns(only: $only) {
      ...Column
    }
    query(only: $only, limit: $limit, offset: $offset, query: $query)
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
    query MyTables {
  mytables {
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
    query TagSearch($search: String) {
  options: tags(name: $search, limit: 20) {
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
export const UserOptionsDocument = gql`
    query UserOptions($search: String) {
  options: users(username: $search) {
    value: id
    label: username
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