import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloReactHooks from '@/omeroark/api/funcs';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** Date with time (isoformat) */
  DateTime: { input: any; output: any; }
  _Any: { input: any; output: any; }
};

/** Metadata attached to an OMERO object. Concrete kinds carry their payload in kind-specific fields. */
export type Annotation = {
  creationDate?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  group: ExperimenterGroup;
  id: Scalars['ID']['output'];
  /** The namespace the annotation was written under, if any. */
  ns?: Maybe<Scalars['String']['output']>;
  owner: Experimenter;
  permissions: Permissions;
};

export type AnnotationLinkInput = {
  annotationId: Scalars['ID']['input'];
  target: AnnotationTargetInput;
};

/** The object an annotation is linked to (or should be linked to). */
export type AnnotationTargetInput = {
  id: Scalars['ID']['input'];
  type: OmeroObjectType;
};

export type BooleanAnnotation = Annotation & {
  __typename?: 'BooleanAnnotation';
  booleanValue?: Maybe<Scalars['Boolean']['output']>;
  creationDate?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  group: ExperimenterGroup;
  id: Scalars['ID']['output'];
  /** The namespace the annotation was written under, if any. */
  ns?: Maybe<Scalars['String']['output']>;
  owner: Experimenter;
  permissions: Permissions;
};

/** A channel of an image with its rendering settings. */
export type Channel = {
  __typename?: 'Channel';
  /** The rendering colour as #rrggbb. */
  color: Scalars['String']['output'];
  emissionWave?: Maybe<Length>;
  excitationWave?: Maybe<Length>;
  id: Scalars['ID']['output'];
  index: Scalars['Int']['output'];
  /** Whether the channel is switched on in the rendering settings. */
  isActive: Scalars['Boolean']['output'];
  /** The display label: the channel name, or its wavelength / index if unnamed. */
  label: Scalars['String']['output'];
  /** The lookup table applied to the channel, if any. */
  lut?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  /** Upper end of the rendering window. */
  windowEnd?: Maybe<Scalars['Float']['output']>;
  /** Maximum pixel value of the channel. */
  windowMax?: Maybe<Scalars['Float']['output']>;
  /** Minimum pixel value of the channel. */
  windowMin?: Maybe<Scalars['Float']['output']>;
  /** Lower end of the rendering window. */
  windowStart?: Maybe<Scalars['Float']['output']>;
};

/** A free-text comment. */
export type CommentAnnotation = Annotation & {
  __typename?: 'CommentAnnotation';
  creationDate?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  group: ExperimenterGroup;
  id: Scalars['ID']['output'];
  /** The namespace the annotation was written under, if any. */
  ns?: Maybe<Scalars['String']['output']>;
  owner: Experimenter;
  permissions: Permissions;
  text: Scalars['String']['output'];
};

export type CreateCommentInput = {
  target: AnnotationTargetInput;
  text: Scalars['String']['input'];
};

export type CreateDatasetInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  projectId?: InputMaybe<Scalars['ID']['input']>;
};

export type CreateMapAnnotationInput = {
  /** Namespace. Defaults to OMERO's client map-annotation namespace so the pairs show up as editable key/value pairs in OMERO.web. */
  ns?: InputMaybe<Scalars['String']['input']>;
  target: AnnotationTargetInput;
  values: Array<KeyValueInput>;
};

export type CreateProjectInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreateRoiInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  imageId: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  shapes: Array<ShapeInput>;
};

export type CreateScreenInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreateTagInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  /** Link the new tag to this object right away. */
  target?: InputMaybe<AnnotationTargetInput>;
  text: Scalars['String']['input'];
};

/** A dataset: an unordered collection of images. */
export type Dataset = OmeroObject & {
  __typename?: 'Dataset';
  /** All annotations linked to this object (tags, comments, key/value maps, files, ...). */
  annotations: Array<Annotation>;
  /** When the object was created in OMERO. */
  creationDate?: Maybe<Scalars['DateTime']['output']>;
  description: Scalars['String']['output'];
  /** The group this object lives in. */
  group: ExperimenterGroup;
  id: Scalars['ID']['output'];
  imageCount: Scalars['Int']['output'];
  images: Array<Image>;
  name: Scalars['String']['output'];
  /** The experimenter that owns this object. */
  owner: Experimenter;
  permissions: Permissions;
  /** The projects this dataset is linked into. */
  projects: Array<Project>;
  /** The text values of the tag annotations linked to this object. */
  tags: Array<Scalars['String']['output']>;
};


/** A dataset: an unordered collection of images. */
export type DatasetAnnotationsArgs = {
  ns?: InputMaybe<Scalars['String']['input']>;
};

export type DatasetFilter = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Only datasets that are in no project. */
  orphaned?: InputMaybe<Scalars['Boolean']['input']>;
  /** Only objects owned by this experimenter. */
  owner?: InputMaybe<Scalars['ID']['input']>;
  /** Only datasets linked into this project. */
  project?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type DatasetImagesInput = {
  datasetId: Scalars['ID']['input'];
  imageIds: Array<Scalars['ID']['input']>;
};

/** Delete a container. Children are only deleted when deleteChildren is true; otherwise they are unlinked and become orphans. */
export type DeleteContainerInput = {
  deleteChildren?: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
};

export type DeleteImageInput = {
  id: Scalars['ID']['input'];
};

export type DeleteMeInput = {
  reason?: InputMaybe<Scalars['String']['input']>;
};

export type DeleteObjectInput = {
  id: Scalars['ID']['input'];
};

export type DeleteResult = {
  __typename?: 'DeleteResult';
  id: Scalars['ID']['output'];
};

export type DoubleAnnotation = Annotation & {
  __typename?: 'DoubleAnnotation';
  creationDate?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  doubleValue?: Maybe<Scalars['Float']['output']>;
  group: ExperimenterGroup;
  id: Scalars['ID']['output'];
  /** The namespace the annotation was written under, if any. */
  ns?: Maybe<Scalars['String']['output']>;
  owner: Experimenter;
  permissions: Permissions;
};

export type Ellipse = Shape & {
  __typename?: 'Ellipse';
  /** Zero-based channel, or null if the shape applies to all channels. */
  c?: Maybe<Scalars['Int']['output']>;
  /** Fill colour as #rrggbbaa. */
  fillColor?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  radiusX: Scalars['Float']['output'];
  radiusY: Scalars['Float']['output'];
  /** Stroke colour as #rrggbbaa. */
  strokeColor?: Maybe<Scalars['String']['output']>;
  strokeWidth?: Maybe<Length>;
  /** Zero-based timepoint, or null if the shape spans all timepoints. */
  t?: Maybe<Scalars['Int']['output']>;
  /** The text label drawn with the shape. */
  text?: Maybe<Scalars['String']['output']>;
  /** Centre x. */
  x: Scalars['Float']['output'];
  /** Centre y. */
  y: Scalars['Float']['output'];
  /** Zero-based Z plane, or null if the shape spans all planes. */
  z?: Maybe<Scalars['Int']['output']>;
};

export type EllipseInput = {
  radiusX: Scalars['Float']['input'];
  radiusY: Scalars['Float']['input'];
  /** Centre x. */
  x: Scalars['Float']['input'];
  /** Centre y. */
  y: Scalars['Float']['input'];
};

/** An OMERO user account (OMERO calls these experimenters). */
export type Experimenter = {
  __typename?: 'Experimenter';
  email?: Maybe<Scalars['String']['output']>;
  firstName?: Maybe<Scalars['String']['output']>;
  fullName: Scalars['String']['output'];
  /** The groups this experimenter is a member of. */
  groups: Array<ExperimenterGroup>;
  id: Scalars['ID']['output'];
  institution?: Maybe<Scalars['String']['output']>;
  isActive: Scalars['Boolean']['output'];
  /** True if the experimenter is a member of the system group. */
  isAdmin: Scalars['Boolean']['output'];
  lastName?: Maybe<Scalars['String']['output']>;
  /** The OMERO login name (omeName). */
  omeName: Scalars['String']['output'];
};

export type ExperimenterFilter = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** An OMERO group. Data is owned by a user within a group; permissions are set per group. */
export type ExperimenterGroup = {
  __typename?: 'ExperimenterGroup';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The members of this group. */
  members: Array<Experimenter>;
  name: Scalars['String']['output'];
};

export type ExperimenterGroupFilter = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** A file attached to an object. */
export type FileAnnotation = Annotation & {
  __typename?: 'FileAnnotation';
  creationDate?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  file?: Maybe<OriginalFile>;
  fileName?: Maybe<Scalars['String']['output']>;
  /** File size in bytes. */
  fileSize?: Maybe<Scalars['Int']['output']>;
  group: ExperimenterGroup;
  id: Scalars['ID']['output'];
  /** True for the companion file OMERO writes with the original metadata at import. */
  isOriginalMetadata: Scalars['Boolean']['output'];
  /** The namespace the annotation was written under, if any. */
  ns?: Maybe<Scalars['String']['output']>;
  owner: Experimenter;
  permissions: Permissions;
};

/** The set of files a group of images was imported from together. */
export type Fileset = {
  __typename?: 'Fileset';
  files: Array<OriginalFile>;
  id: Scalars['ID']['output'];
  /** The images that were imported from this fileset. */
  images: Array<Image>;
};

/** Exactly one geometry. */
export type GeometryInput =
  { ellipse: EllipseInput; label?: never; line?: never; point?: never; polygon?: never; polyline?: never; rectangle?: never; }
  |  { ellipse?: never; label: LabelInput; line?: never; point?: never; polygon?: never; polyline?: never; rectangle?: never; }
  |  { ellipse?: never; label?: never; line: LineInput; point?: never; polygon?: never; polyline?: never; rectangle?: never; }
  |  { ellipse?: never; label?: never; line?: never; point: PointInput; polygon?: never; polyline?: never; rectangle?: never; }
  |  { ellipse?: never; label?: never; line?: never; point?: never; polygon: PolygonInput; polyline?: never; rectangle?: never; }
  |  { ellipse?: never; label?: never; line?: never; point?: never; polygon?: never; polyline: PolylineInput; rectangle?: never; }
  |  { ellipse?: never; label?: never; line?: never; point?: never; polygon?: never; polyline?: never; rectangle: RectangleInput; };

/** An image in OMERO. The pixel data itself is served over the thumbnail/download REST endpoints. */
export type Image = OmeroObject & {
  __typename?: 'Image';
  acquisitionDate?: Maybe<Scalars['DateTime']['output']>;
  /** All annotations linked to this object (tags, comments, key/value maps, files, ...). */
  annotations: Array<Annotation>;
  channels: Array<Channel>;
  /** When the object was created in OMERO. */
  creationDate?: Maybe<Scalars['DateTime']['output']>;
  /** The datasets this image is linked into (an image can be in several). */
  datasets: Array<Dataset>;
  /** The default timepoint shown by the rendering settings. */
  defaultT: Scalars['Int']['output'];
  /** The default Z plane shown by the rendering settings. */
  defaultZ: Scalars['Int']['output'];
  description: Scalars['String']['output'];
  /** The fileset this image was imported with, if any. */
  fileset?: Maybe<Fileset>;
  /** The group this object lives in. */
  group: ExperimenterGroup;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** The name of the image's original file, when known. */
  originalFile?: Maybe<Scalars['String']['output']>;
  /** The experimenter that owns this object. */
  owner: Experimenter;
  permissions: Permissions;
  physicalSizeX?: Maybe<Length>;
  physicalSizeY?: Maybe<Length>;
  physicalSizeZ?: Maybe<Length>;
  /** The pixel data type, e.g. uint8, uint16, float. */
  pixelsType?: Maybe<Scalars['String']['output']>;
  roiCount: Scalars['Int']['output'];
  rois: Array<Roi>;
  sizeC: Scalars['Int']['output'];
  sizeT: Scalars['Int']['output'];
  sizeX: Scalars['Int']['output'];
  sizeY: Scalars['Int']['output'];
  sizeZ: Scalars['Int']['output'];
  /** The text values of the tag annotations linked to this object. */
  tags: Array<Scalars['String']['output']>;
  /** The well this image belongs to, when it is part of a plate. */
  well?: Maybe<Well>;
};


/** An image in OMERO. The pixel data itself is served over the thumbnail/download REST endpoints. */
export type ImageAnnotationsArgs = {
  ns?: InputMaybe<Scalars['String']['input']>;
};

export type ImageFilter = {
  /** Only images linked into this dataset. */
  dataset?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Only images that are in no dataset and no well. */
  orphaned?: InputMaybe<Scalars['Boolean']['input']>;
  /** Only objects owned by this experimenter. */
  owner?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** A key/value pair of a map annotation. */
export type KeyValue = {
  __typename?: 'KeyValue';
  key: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type KeyValueInput = {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

/** A text label anchored at a point. */
export type Label = Shape & {
  __typename?: 'Label';
  /** Zero-based channel, or null if the shape applies to all channels. */
  c?: Maybe<Scalars['Int']['output']>;
  /** Fill colour as #rrggbbaa. */
  fillColor?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Stroke colour as #rrggbbaa. */
  strokeColor?: Maybe<Scalars['String']['output']>;
  strokeWidth?: Maybe<Length>;
  /** Zero-based timepoint, or null if the shape spans all timepoints. */
  t?: Maybe<Scalars['Int']['output']>;
  /** The text label drawn with the shape. */
  text?: Maybe<Scalars['String']['output']>;
  x: Scalars['Float']['output'];
  y: Scalars['Float']['output'];
  /** Zero-based Z plane, or null if the shape spans all planes. */
  z?: Maybe<Scalars['Int']['output']>;
};

export type LabelInput = {
  fontSize?: Scalars['Float']['input'];
  text: Scalars['String']['input'];
  x: Scalars['Float']['input'];
  y: Scalars['Float']['input'];
};

/** A physical length as OMERO stores it: a value plus its unit. */
export type Length = {
  __typename?: 'Length';
  /** The unit symbol, e.g. µm */
  symbol: Scalars['String']['output'];
  /** The OMERO UnitsLength name, e.g. MICROMETER */
  unit: Scalars['String']['output'];
  value: Scalars['Float']['output'];
};

export type Line = Shape & {
  __typename?: 'Line';
  /** Zero-based channel, or null if the shape applies to all channels. */
  c?: Maybe<Scalars['Int']['output']>;
  /** Fill colour as #rrggbbaa. */
  fillColor?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Stroke colour as #rrggbbaa. */
  strokeColor?: Maybe<Scalars['String']['output']>;
  strokeWidth?: Maybe<Length>;
  /** Zero-based timepoint, or null if the shape spans all timepoints. */
  t?: Maybe<Scalars['Int']['output']>;
  /** The text label drawn with the shape. */
  text?: Maybe<Scalars['String']['output']>;
  x1: Scalars['Float']['output'];
  x2: Scalars['Float']['output'];
  y1: Scalars['Float']['output'];
  y2: Scalars['Float']['output'];
  /** Zero-based Z plane, or null if the shape spans all planes. */
  z?: Maybe<Scalars['Int']['output']>;
};

export type LineInput = {
  x1: Scalars['Float']['input'];
  x2: Scalars['Float']['input'];
  y1: Scalars['Float']['input'];
  y2: Scalars['Float']['input'];
};

export type LongAnnotation = Annotation & {
  __typename?: 'LongAnnotation';
  creationDate?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  group: ExperimenterGroup;
  id: Scalars['ID']['output'];
  longValue?: Maybe<Scalars['Int']['output']>;
  /** The namespace the annotation was written under, if any. */
  ns?: Maybe<Scalars['String']['output']>;
  owner: Experimenter;
  permissions: Permissions;
};

/** An ordered list of key/value pairs. */
export type MapAnnotation = Annotation & {
  __typename?: 'MapAnnotation';
  creationDate?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  group: ExperimenterGroup;
  id: Scalars['ID']['output'];
  /** The namespace the annotation was written under, if any. */
  ns?: Maybe<Scalars['String']['output']>;
  owner: Experimenter;
  permissions: Permissions;
  values: Array<KeyValue>;
};

/** A binary mask covering a rectangle. The mask bytes are not exposed over GraphQL. */
export type Mask = Shape & {
  __typename?: 'Mask';
  /** Zero-based channel, or null if the shape applies to all channels. */
  c?: Maybe<Scalars['Int']['output']>;
  /** Fill colour as #rrggbbaa. */
  fillColor?: Maybe<Scalars['String']['output']>;
  height: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  /** Stroke colour as #rrggbbaa. */
  strokeColor?: Maybe<Scalars['String']['output']>;
  strokeWidth?: Maybe<Length>;
  /** Zero-based timepoint, or null if the shape spans all timepoints. */
  t?: Maybe<Scalars['Int']['output']>;
  /** The text label drawn with the shape. */
  text?: Maybe<Scalars['String']['output']>;
  width: Scalars['Float']['output'];
  x: Scalars['Float']['output'];
  y: Scalars['Float']['output'];
  /** Zero-based Z plane, or null if the shape spans all planes. */
  z?: Maybe<Scalars['Int']['output']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  createComment: CommentAnnotation;
  createDataset: Dataset;
  createMapAnnotation: MapAnnotation;
  createProject: Project;
  createRoi: Roi;
  createScreen: Screen;
  createTag: TagAnnotation;
  deleteAnnotation: DeleteResult;
  deleteDataset: DeleteResult;
  deleteImage: DeleteResult;
  deleteMe: User;
  deletePlate: DeleteResult;
  deleteProject: DeleteResult;
  deleteRoi: DeleteResult;
  deleteScreen: DeleteResult;
  ensureOmeroUser: OmeroUser;
  linkAnnotation: Annotation;
  linkDatasets: Project;
  linkImages: Dataset;
  linkPlates: Screen;
  unlinkAnnotation: Annotation;
  unlinkDatasets: Project;
  unlinkImages: Dataset;
  unlinkPlates: Screen;
  updateDataset: Dataset;
  updateImage: Image;
  updatePlate: Plate;
  updateProject: Project;
  updateScreen: Screen;
};


export type MutationCreateCommentArgs = {
  input: CreateCommentInput;
};


export type MutationCreateDatasetArgs = {
  input: CreateDatasetInput;
};


export type MutationCreateMapAnnotationArgs = {
  input: CreateMapAnnotationInput;
};


export type MutationCreateProjectArgs = {
  input: CreateProjectInput;
};


export type MutationCreateRoiArgs = {
  input: CreateRoiInput;
};


export type MutationCreateScreenArgs = {
  input: CreateScreenInput;
};


export type MutationCreateTagArgs = {
  input: CreateTagInput;
};


export type MutationDeleteAnnotationArgs = {
  input: DeleteObjectInput;
};


export type MutationDeleteDatasetArgs = {
  input: DeleteContainerInput;
};


export type MutationDeleteImageArgs = {
  input: DeleteImageInput;
};


export type MutationDeleteMeArgs = {
  input: DeleteMeInput;
};


export type MutationDeletePlateArgs = {
  input: DeleteContainerInput;
};


export type MutationDeleteProjectArgs = {
  input: DeleteContainerInput;
};


export type MutationDeleteRoiArgs = {
  input: DeleteObjectInput;
};


export type MutationDeleteScreenArgs = {
  input: DeleteContainerInput;
};


export type MutationEnsureOmeroUserArgs = {
  input: OmeroUserInput;
};


export type MutationLinkAnnotationArgs = {
  input: AnnotationLinkInput;
};


export type MutationLinkDatasetsArgs = {
  input: ProjectDatasetsInput;
};


export type MutationLinkImagesArgs = {
  input: DatasetImagesInput;
};


export type MutationLinkPlatesArgs = {
  input: ScreenPlatesInput;
};


export type MutationUnlinkAnnotationArgs = {
  input: AnnotationLinkInput;
};


export type MutationUnlinkDatasetsArgs = {
  input: ProjectDatasetsInput;
};


export type MutationUnlinkImagesArgs = {
  input: DatasetImagesInput;
};


export type MutationUnlinkPlatesArgs = {
  input: ScreenPlatesInput;
};


export type MutationUpdateDatasetArgs = {
  input: UpdateObjectInput;
};


export type MutationUpdateImageArgs = {
  input: UpdateObjectInput;
};


export type MutationUpdatePlateArgs = {
  input: UpdateObjectInput;
};


export type MutationUpdateProjectArgs = {
  input: UpdateObjectInput;
};


export type MutationUpdateScreenArgs = {
  input: UpdateObjectInput;
};

export type OffsetPaginationInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};

/** Fields every OMERO model object exposes: identity, ownership, dates, permissions and annotations. */
export type OmeroObject = {
  /** All annotations linked to this object (tags, comments, key/value maps, files, ...). */
  annotations: Array<Annotation>;
  /** When the object was created in OMERO. */
  creationDate?: Maybe<Scalars['DateTime']['output']>;
  description: Scalars['String']['output'];
  /** The group this object lives in. */
  group: ExperimenterGroup;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** The experimenter that owns this object. */
  owner: Experimenter;
  permissions: Permissions;
  /** The text values of the tag annotations linked to this object. */
  tags: Array<Scalars['String']['output']>;
};


/** Fields every OMERO model object exposes: identity, ownership, dates, permissions and annotations. */
export type OmeroObjectAnnotationsArgs = {
  ns?: InputMaybe<Scalars['String']['input']>;
};

/** The kinds of OMERO object that can be the target of an annotation or link. */
export enum OmeroObjectType {
  Dataset = 'DATASET',
  Image = 'IMAGE',
  Plate = 'PLATE',
  PlateAcquisition = 'PLATE_ACQUISITION',
  Project = 'PROJECT',
  Roi = 'ROI',
  Screen = 'SCREEN',
  Well = 'WELL'
}

/**
 * A dataset is a collection of data files and metadata files.
 * It mimics the concept of a folder in a file system and is the top level
 * object in the data model.
 */
export type OmeroUser = {
  __typename?: 'OmeroUser';
  id: Scalars['ID']['output'];
  /** The host for the omero user */
  omeroHost: Scalars['String']['output'];
  /** The password for the omero user */
  omeroPassword: Scalars['String']['output'];
  /** The port for the omero user */
  omeroPort: Scalars['Int']['output'];
  /** The username for the omero user */
  omeroUsername: Scalars['String']['output'];
  /** The user that created the dataset */
  user: User;
};

export type OmeroUserInput = {
  host?: InputMaybe<Scalars['String']['input']>;
  password: Scalars['String']['input'];
  port?: InputMaybe<Scalars['Int']['input']>;
  username: Scalars['String']['input'];
};

/** An OMERO original file: one of the files an image was imported from, or a file annotation's payload. */
export type OriginalFile = {
  __typename?: 'OriginalFile';
  id: Scalars['ID']['output'];
  mimetype?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  path?: Maybe<Scalars['String']['output']>;
  /** File size in bytes. */
  size?: Maybe<Scalars['Int']['output']>;
};

/** What the current OMERO user may do with an object. */
export type Permissions = {
  __typename?: 'Permissions';
  canAnnotate: Scalars['Boolean']['output'];
  canChgrp: Scalars['Boolean']['output'];
  canChown: Scalars['Boolean']['output'];
  canDelete: Scalars['Boolean']['output'];
  canEdit: Scalars['Boolean']['output'];
  canLink: Scalars['Boolean']['output'];
  /** True if the current OMERO user owns the object. */
  isOwned: Scalars['Boolean']['output'];
};

/** A multi-well plate. */
export type Plate = OmeroObject & {
  __typename?: 'Plate';
  /** All annotations linked to this object (tags, comments, key/value maps, files, ...). */
  annotations: Array<Annotation>;
  columnLabels: Array<Scalars['String']['output']>;
  /** Declared column count, falling back to the highest occupied column when the plate does not declare one. */
  columns: Scalars['Int']['output'];
  /** When the object was created in OMERO. */
  creationDate?: Maybe<Scalars['DateTime']['output']>;
  description: Scalars['String']['output'];
  /** The group this object lives in. */
  group: ExperimenterGroup;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** The experimenter that owns this object. */
  owner: Experimenter;
  permissions: Permissions;
  plateAcquisitions: Array<PlateAcquisition>;
  rowLabels: Array<Scalars['String']['output']>;
  /** Declared row count, falling back to the highest occupied row when the plate does not declare one. */
  rows: Scalars['Int']['output'];
  /** The screens this plate is linked into. */
  screens: Array<Screen>;
  /** The text values of the tag annotations linked to this object. */
  tags: Array<Scalars['String']['output']>;
  wellCount: Scalars['Int']['output'];
  wells: Array<Well>;
};


/** A multi-well plate. */
export type PlateAnnotationsArgs = {
  ns?: InputMaybe<Scalars['String']['input']>;
};

/** A run of a plate through the microscope. Multi-run plates have one image per well per acquisition. */
export type PlateAcquisition = OmeroObject & {
  __typename?: 'PlateAcquisition';
  /** All annotations linked to this object (tags, comments, key/value maps, files, ...). */
  annotations: Array<Annotation>;
  /** When the object was created in OMERO. */
  creationDate?: Maybe<Scalars['DateTime']['output']>;
  description: Scalars['String']['output'];
  endTime?: Maybe<Scalars['DateTime']['output']>;
  /** The group this object lives in. */
  group: ExperimenterGroup;
  id: Scalars['ID']['output'];
  maximumFieldCount?: Maybe<Scalars['Int']['output']>;
  name: Scalars['String']['output'];
  /** The experimenter that owns this object. */
  owner: Experimenter;
  permissions: Permissions;
  startTime?: Maybe<Scalars['DateTime']['output']>;
  /** The text values of the tag annotations linked to this object. */
  tags: Array<Scalars['String']['output']>;
};


/** A run of a plate through the microscope. Multi-run plates have one image per well per acquisition. */
export type PlateAcquisitionAnnotationsArgs = {
  ns?: InputMaybe<Scalars['String']['input']>;
};

export type PlateFilter = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Only plates that are in no screen. */
  orphaned?: InputMaybe<Scalars['Boolean']['input']>;
  /** Only objects owned by this experimenter. */
  owner?: InputMaybe<Scalars['ID']['input']>;
  /** Only plates linked into this screen. */
  screen?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type Point = Shape & {
  __typename?: 'Point';
  /** Zero-based channel, or null if the shape applies to all channels. */
  c?: Maybe<Scalars['Int']['output']>;
  /** Fill colour as #rrggbbaa. */
  fillColor?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Stroke colour as #rrggbbaa. */
  strokeColor?: Maybe<Scalars['String']['output']>;
  strokeWidth?: Maybe<Length>;
  /** Zero-based timepoint, or null if the shape spans all timepoints. */
  t?: Maybe<Scalars['Int']['output']>;
  /** The text label drawn with the shape. */
  text?: Maybe<Scalars['String']['output']>;
  x: Scalars['Float']['output'];
  y: Scalars['Float']['output'];
  /** Zero-based Z plane, or null if the shape spans all planes. */
  z?: Maybe<Scalars['Int']['output']>;
};

export type PointInput = {
  x: Scalars['Float']['input'];
  y: Scalars['Float']['input'];
};

export type Polygon = Shape & {
  __typename?: 'Polygon';
  /** Zero-based channel, or null if the shape applies to all channels. */
  c?: Maybe<Scalars['Int']['output']>;
  /** Fill colour as #rrggbbaa. */
  fillColor?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  points: Array<Vertex>;
  /** Stroke colour as #rrggbbaa. */
  strokeColor?: Maybe<Scalars['String']['output']>;
  strokeWidth?: Maybe<Length>;
  /** Zero-based timepoint, or null if the shape spans all timepoints. */
  t?: Maybe<Scalars['Int']['output']>;
  /** The text label drawn with the shape. */
  text?: Maybe<Scalars['String']['output']>;
  /** Zero-based Z plane, or null if the shape spans all planes. */
  z?: Maybe<Scalars['Int']['output']>;
};

export type PolygonInput = {
  points: Array<VertexInput>;
};

export type Polyline = Shape & {
  __typename?: 'Polyline';
  /** Zero-based channel, or null if the shape applies to all channels. */
  c?: Maybe<Scalars['Int']['output']>;
  /** Fill colour as #rrggbbaa. */
  fillColor?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  points: Array<Vertex>;
  /** Stroke colour as #rrggbbaa. */
  strokeColor?: Maybe<Scalars['String']['output']>;
  strokeWidth?: Maybe<Length>;
  /** Zero-based timepoint, or null if the shape spans all timepoints. */
  t?: Maybe<Scalars['Int']['output']>;
  /** The text label drawn with the shape. */
  text?: Maybe<Scalars['String']['output']>;
  /** Zero-based Z plane, or null if the shape spans all planes. */
  z?: Maybe<Scalars['Int']['output']>;
};

export type PolylineInput = {
  points: Array<VertexInput>;
};

/** A project: a collection of datasets. */
export type Project = OmeroObject & {
  __typename?: 'Project';
  /** All annotations linked to this object (tags, comments, key/value maps, files, ...). */
  annotations: Array<Annotation>;
  /** When the object was created in OMERO. */
  creationDate?: Maybe<Scalars['DateTime']['output']>;
  datasetCount: Scalars['Int']['output'];
  datasets: Array<Dataset>;
  description: Scalars['String']['output'];
  /** The group this object lives in. */
  group: ExperimenterGroup;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** The experimenter that owns this object. */
  owner: Experimenter;
  permissions: Permissions;
  /** The text values of the tag annotations linked to this object. */
  tags: Array<Scalars['String']['output']>;
};


/** A project: a collection of datasets. */
export type ProjectAnnotationsArgs = {
  ns?: InputMaybe<Scalars['String']['input']>;
};

export type ProjectDatasetsInput = {
  datasetIds: Array<Scalars['ID']['input']>;
  projectId: Scalars['ID']['input'];
};

export type ProjectFilter = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Only objects owned by this experimenter. */
  owner?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type Query = {
  __typename?: 'Query';
  _service: _Service;
  annotation: Annotation;
  currentExperimenter: Experimenter;
  dataset: Dataset;
  datasets: Array<Dataset>;
  experimenter: Experimenter;
  experimenters: Array<Experimenter>;
  group: ExperimenterGroup;
  groups: Array<ExperimenterGroup>;
  image: Image;
  images: Array<Image>;
  me: User;
  omeroUsers: Array<OmeroUser>;
  plate: Plate;
  plateAcquisition: PlateAcquisition;
  plates: Array<Plate>;
  project: Project;
  projects: Array<Project>;
  roi: Roi;
  rois: Array<Roi>;
  screen: Screen;
  screens: Array<Screen>;
  tag: TagAnnotation;
  tags: Array<TagAnnotation>;
  well: Well;
  wells: Array<Well>;
};


export type QueryAnnotationArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDatasetArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDatasetsArgs = {
  filters?: InputMaybe<DatasetFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryExperimenterArgs = {
  id: Scalars['ID']['input'];
};


export type QueryExperimentersArgs = {
  filters?: InputMaybe<ExperimenterFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryGroupArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGroupsArgs = {
  filters?: InputMaybe<ExperimenterGroupFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryImageArgs = {
  id: Scalars['ID']['input'];
};


export type QueryImagesArgs = {
  filters?: InputMaybe<ImageFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryPlateArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPlateAcquisitionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPlatesArgs = {
  filters?: InputMaybe<PlateFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryProjectArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProjectsArgs = {
  filters?: InputMaybe<ProjectFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryRoiArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRoisArgs = {
  filters?: InputMaybe<RoiFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryScreenArgs = {
  id: Scalars['ID']['input'];
};


export type QueryScreensArgs = {
  filters?: InputMaybe<ScreenFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryTagArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTagsArgs = {
  filters?: InputMaybe<TagFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryWellArgs = {
  id: Scalars['ID']['input'];
};


export type QueryWellsArgs = {
  filters?: InputMaybe<WellFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type Rectangle = Shape & {
  __typename?: 'Rectangle';
  /** Zero-based channel, or null if the shape applies to all channels. */
  c?: Maybe<Scalars['Int']['output']>;
  /** Fill colour as #rrggbbaa. */
  fillColor?: Maybe<Scalars['String']['output']>;
  height: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  /** Stroke colour as #rrggbbaa. */
  strokeColor?: Maybe<Scalars['String']['output']>;
  strokeWidth?: Maybe<Length>;
  /** Zero-based timepoint, or null if the shape spans all timepoints. */
  t?: Maybe<Scalars['Int']['output']>;
  /** The text label drawn with the shape. */
  text?: Maybe<Scalars['String']['output']>;
  width: Scalars['Float']['output'];
  x: Scalars['Float']['output'];
  y: Scalars['Float']['output'];
  /** Zero-based Z plane, or null if the shape spans all planes. */
  z?: Maybe<Scalars['Int']['output']>;
};

export type RectangleInput = {
  height: Scalars['Float']['input'];
  width: Scalars['Float']['input'];
  x: Scalars['Float']['input'];
  y: Scalars['Float']['input'];
};

/** A region of interest on an image: a named group of shapes. */
export type Roi = OmeroObject & {
  __typename?: 'Roi';
  /** All annotations linked to this object (tags, comments, key/value maps, files, ...). */
  annotations: Array<Annotation>;
  /** When the object was created in OMERO. */
  creationDate?: Maybe<Scalars['DateTime']['output']>;
  description: Scalars['String']['output'];
  /** The group this object lives in. */
  group: ExperimenterGroup;
  id: Scalars['ID']['output'];
  image: Image;
  name: Scalars['String']['output'];
  /** The experimenter that owns this object. */
  owner: Experimenter;
  permissions: Permissions;
  shapeCount: Scalars['Int']['output'];
  shapes: Array<Shape>;
  /** The text values of the tag annotations linked to this object. */
  tags: Array<Scalars['String']['output']>;
};


/** A region of interest on an image: a named group of shapes. */
export type RoiAnnotationsArgs = {
  ns?: InputMaybe<Scalars['String']['input']>;
};

export type RoiFilter = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Only ROIs drawn on this image. */
  image?: InputMaybe<Scalars['ID']['input']>;
};

/** A screen: a collection of plates. */
export type Screen = OmeroObject & {
  __typename?: 'Screen';
  /** All annotations linked to this object (tags, comments, key/value maps, files, ...). */
  annotations: Array<Annotation>;
  /** When the object was created in OMERO. */
  creationDate?: Maybe<Scalars['DateTime']['output']>;
  description: Scalars['String']['output'];
  /** The group this object lives in. */
  group: ExperimenterGroup;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** The experimenter that owns this object. */
  owner: Experimenter;
  permissions: Permissions;
  plateCount: Scalars['Int']['output'];
  plates: Array<Plate>;
  /** The text values of the tag annotations linked to this object. */
  tags: Array<Scalars['String']['output']>;
};


/** A screen: a collection of plates. */
export type ScreenAnnotationsArgs = {
  ns?: InputMaybe<Scalars['String']['input']>;
};

export type ScreenFilter = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Only objects owned by this experimenter. */
  owner?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type ScreenPlatesInput = {
  plateIds: Array<Scalars['ID']['input']>;
  screenId: Scalars['ID']['input'];
};

/** A 2D shape of a region of interest, positioned on one Z/T/C plane (or all, when unset). */
export type Shape = {
  /** Zero-based channel, or null if the shape applies to all channels. */
  c?: Maybe<Scalars['Int']['output']>;
  /** Fill colour as #rrggbbaa. */
  fillColor?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Stroke colour as #rrggbbaa. */
  strokeColor?: Maybe<Scalars['String']['output']>;
  strokeWidth?: Maybe<Length>;
  /** Zero-based timepoint, or null if the shape spans all timepoints. */
  t?: Maybe<Scalars['Int']['output']>;
  /** The text label drawn with the shape. */
  text?: Maybe<Scalars['String']['output']>;
  /** Zero-based Z plane, or null if the shape spans all planes. */
  z?: Maybe<Scalars['Int']['output']>;
};

export type ShapeInput = {
  /** Zero-based channel; null for all channels. */
  c?: InputMaybe<Scalars['Int']['input']>;
  /** #rrggbb or #rrggbbaa */
  fillColor?: InputMaybe<Scalars['String']['input']>;
  geometry: GeometryInput;
  /** #rrggbb or #rrggbbaa */
  strokeColor?: InputMaybe<Scalars['String']['input']>;
  /** Stroke width in pixels. */
  strokeWidth?: InputMaybe<Scalars['Float']['input']>;
  /** Zero-based timepoint; null for all timepoints. */
  t?: InputMaybe<Scalars['Int']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
  /** Zero-based Z plane; null for all planes. */
  z?: InputMaybe<Scalars['Int']['input']>;
};

/** A tag. Tags are shared, reusable labels linked to many objects. */
export type TagAnnotation = Annotation & {
  __typename?: 'TagAnnotation';
  creationDate?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  group: ExperimenterGroup;
  id: Scalars['ID']['output'];
  /** The namespace the annotation was written under, if any. */
  ns?: Maybe<Scalars['String']['output']>;
  owner: Experimenter;
  permissions: Permissions;
  text: Scalars['String']['output'];
};

export type TagFilter = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Only objects owned by this experimenter. */
  owner?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** A reference to an ontology term. */
export type TermAnnotation = Annotation & {
  __typename?: 'TermAnnotation';
  creationDate?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  group: ExperimenterGroup;
  id: Scalars['ID']['output'];
  /** The namespace the annotation was written under, if any. */
  ns?: Maybe<Scalars['String']['output']>;
  owner: Experimenter;
  permissions: Permissions;
  term?: Maybe<Scalars['String']['output']>;
};

export type TimestampAnnotation = Annotation & {
  __typename?: 'TimestampAnnotation';
  creationDate?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  group: ExperimenterGroup;
  id: Scalars['ID']['output'];
  /** The namespace the annotation was written under, if any. */
  ns?: Maybe<Scalars['String']['output']>;
  owner: Experimenter;
  permissions: Permissions;
  timeValue?: Maybe<Scalars['DateTime']['output']>;
};

/** Rename and/or re-describe an object. Fields left null are not touched. */
export type UpdateObjectInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

/** A reflection on the real User */
export type User = {
  __typename?: 'User';
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** The user that created the dataset */
  omeroUser?: Maybe<OmeroUser>;
  password: Scalars['String']['output'];
  sub: Scalars['String']['output'];
  /** Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. */
  username: Scalars['String']['output'];
};

/** An x/y coordinate. */
export type Vertex = {
  __typename?: 'Vertex';
  x: Scalars['Float']['output'];
  y: Scalars['Float']['output'];
};

export type VertexInput = {
  x: Scalars['Float']['input'];
  y: Scalars['Float']['input'];
};

/** A well of a plate, addressed by row/column. */
export type Well = OmeroObject & {
  __typename?: 'Well';
  /** All annotations linked to this object (tags, comments, key/value maps, files, ...). */
  annotations: Array<Annotation>;
  /** The well colour as #rrggbbaa, when one was set at import. */
  color?: Maybe<Scalars['String']['output']>;
  /** Zero-based column index. */
  column: Scalars['Int']['output'];
  /** When the object was created in OMERO. */
  creationDate?: Maybe<Scalars['DateTime']['output']>;
  description: Scalars['String']['output'];
  /** The group this object lives in. */
  group: ExperimenterGroup;
  id: Scalars['ID']['output'];
  /** The images acquired in this well, one per field/acquisition. */
  images: Array<Image>;
  name: Scalars['String']['output'];
  /** The experimenter that owns this object. */
  owner: Experimenter;
  permissions: Permissions;
  plate: Plate;
  /** The human label, e.g. A1. */
  position: Scalars['String']['output'];
  /** Zero-based row index. */
  row: Scalars['Int']['output'];
  samples: Array<WellSample>;
  /** The text values of the tag annotations linked to this object. */
  tags: Array<Scalars['String']['output']>;
};


/** A well of a plate, addressed by row/column. */
export type WellAnnotationsArgs = {
  ns?: InputMaybe<Scalars['String']['input']>;
};

export type WellFilter = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Only wells of this plate. */
  plate?: InputMaybe<Scalars['ID']['input']>;
};

/** One field of view in a well: the link between a well and an image. */
export type WellSample = {
  __typename?: 'WellSample';
  id: Scalars['ID']['output'];
  image?: Maybe<Image>;
  plateAcquisition?: Maybe<PlateAcquisition>;
  /** Stage position of the field within the well. */
  positionX?: Maybe<Length>;
  positionY?: Maybe<Length>;
};

export type _Service = {
  __typename?: '_Service';
  sdl: Scalars['String']['output'];
};

export type ListDatasetFragment = { __typename?: 'Dataset', id: string, name: string, description: string };

export type DatasetFragment = { __typename?: 'Dataset', id: string, name: string, description: string, tags: Array<string>, images: Array<(
    { __typename?: 'Image' }
    & ListOmeroImageFragment
  )> };

export type ListOmeroImageFragment = { __typename?: 'Image', id: string, name: string, description: string };

export type OmeroImageFragment = { __typename?: 'Image', id: string, name: string, acquisitionDate?: any | null, tags: Array<string> };

export type ListProjectFragment = { __typename?: 'Project', id: string, name: string, description: string };

export type ProjectFragment = { __typename?: 'Project', id: string, name: string, description: string, tags: Array<string>, datasets: Array<(
    { __typename?: 'Dataset' }
    & ListDatasetFragment
  )> };

export type CreateDatasetMutationVariables = Exact<{
  input: CreateDatasetInput;
}>;


export type CreateDatasetMutation = { __typename?: 'Mutation', createDataset: { __typename?: 'Dataset', id: string, name: string, description: string } };

export type CreateProjectMutationVariables = Exact<{
  input: CreateProjectInput;
}>;


export type CreateProjectMutation = { __typename?: 'Mutation', createProject: { __typename?: 'Project', id: string, name: string, description: string } };

export type EnsureOmeroUserMutationVariables = Exact<{
  input: OmeroUserInput;
}>;


export type EnsureOmeroUserMutation = { __typename?: 'Mutation', ensureOmeroUser: { __typename?: 'OmeroUser', id: string, omeroUsername: string, omeroPassword: string, user: { __typename?: 'User', id: string, sub: string } } };

export type DeleteMeMutationVariables = Exact<{
  input: DeleteMeInput;
}>;


export type DeleteMeMutation = { __typename?: 'Mutation', deleteMe: { __typename?: 'User', id: string } };

export type ListDatasetsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListDatasetsQuery = { __typename?: 'Query', datasets: Array<(
    { __typename?: 'Dataset' }
    & ListDatasetFragment
  )> };

export type GetDatasetQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetDatasetQuery = { __typename?: 'Query', dataset: (
    { __typename?: 'Dataset' }
    & DatasetFragment
  ) };

export type GlobalSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  noImages: Scalars['Boolean']['input'];
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type GlobalSearchQuery = { __typename?: 'Query', images?: Array<(
    { __typename?: 'Image' }
    & ListOmeroImageFragment
  )> };

export type ListOmeroImagesQueryVariables = Exact<{ [key: string]: never; }>;


export type ListOmeroImagesQuery = { __typename?: 'Query', images: Array<(
    { __typename?: 'Image' }
    & ListOmeroImageFragment
  )> };

export type GetOmeroImageQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetOmeroImageQuery = { __typename?: 'Query', image: (
    { __typename?: 'Image' }
    & OmeroImageFragment
  ) };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me: { __typename?: 'User', omeroUser?: { __typename?: 'OmeroUser', id: string, omeroUsername: string } | null } };

export type ListProjectsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListProjectsQuery = { __typename?: 'Query', projects: Array<(
    { __typename?: 'Project' }
    & ListProjectFragment
  )> };

export type GetProjectQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetProjectQuery = { __typename?: 'Query', project: (
    { __typename?: 'Project' }
    & ProjectFragment
  ) };

export const ListOmeroImageFragmentDoc = gql`
    fragment ListOmeroImage on Image {
  id
  name
  description
}
    `;
export const DatasetFragmentDoc = gql`
    fragment Dataset on Dataset {
  id
  name
  description
  images {
    ...ListOmeroImage
  }
  tags
}
    ${ListOmeroImageFragmentDoc}`;
export const OmeroImageFragmentDoc = gql`
    fragment OmeroImage on Image {
  id
  name
  acquisitionDate
  tags
}
    `;
export const ListProjectFragmentDoc = gql`
    fragment ListProject on Project {
  id
  name
  description
}
    `;
export const ListDatasetFragmentDoc = gql`
    fragment ListDataset on Dataset {
  id
  name
  description
}
    `;
export const ProjectFragmentDoc = gql`
    fragment Project on Project {
  id
  name
  description
  datasets {
    ...ListDataset
  }
  tags
}
    ${ListDatasetFragmentDoc}`;
export const CreateDatasetDocument = gql`
    mutation CreateDataset($input: CreateDatasetInput!) {
  createDataset(input: $input) {
    id
    name
    description
  }
}
    `;
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
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateDatasetMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateDatasetMutation, CreateDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateDatasetMutation, CreateDatasetMutationVariables>(CreateDatasetDocument, options);
      }
export type CreateDatasetMutationHookResult = ReturnType<typeof useCreateDatasetMutation>;
export type CreateDatasetMutationResult = Apollo.MutationResult<CreateDatasetMutation>;
export type CreateDatasetMutationOptions = Apollo.BaseMutationOptions<CreateDatasetMutation, CreateDatasetMutationVariables>;
export const CreateProjectDocument = gql`
    mutation CreateProject($input: CreateProjectInput!) {
  createProject(input: $input) {
    id
    name
    description
  }
}
    `;
export type CreateProjectMutationFn = Apollo.MutationFunction<CreateProjectMutation, CreateProjectMutationVariables>;

/**
 * __useCreateProjectMutation__
 *
 * To run a mutation, you first call `useCreateProjectMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateProjectMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createProjectMutation, { data, loading, error }] = useCreateProjectMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateProjectMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateProjectMutation, CreateProjectMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateProjectMutation, CreateProjectMutationVariables>(CreateProjectDocument, options);
      }
export type CreateProjectMutationHookResult = ReturnType<typeof useCreateProjectMutation>;
export type CreateProjectMutationResult = Apollo.MutationResult<CreateProjectMutation>;
export type CreateProjectMutationOptions = Apollo.BaseMutationOptions<CreateProjectMutation, CreateProjectMutationVariables>;
export const EnsureOmeroUserDocument = gql`
    mutation EnsureOmeroUser($input: OmeroUserInput!) {
  ensureOmeroUser(input: $input) {
    id
    omeroUsername
    omeroPassword
    user {
      id
      sub
    }
  }
}
    `;
export type EnsureOmeroUserMutationFn = Apollo.MutationFunction<EnsureOmeroUserMutation, EnsureOmeroUserMutationVariables>;

/**
 * __useEnsureOmeroUserMutation__
 *
 * To run a mutation, you first call `useEnsureOmeroUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEnsureOmeroUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [ensureOmeroUserMutation, { data, loading, error }] = useEnsureOmeroUserMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useEnsureOmeroUserMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<EnsureOmeroUserMutation, EnsureOmeroUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<EnsureOmeroUserMutation, EnsureOmeroUserMutationVariables>(EnsureOmeroUserDocument, options);
      }
export type EnsureOmeroUserMutationHookResult = ReturnType<typeof useEnsureOmeroUserMutation>;
export type EnsureOmeroUserMutationResult = Apollo.MutationResult<EnsureOmeroUserMutation>;
export type EnsureOmeroUserMutationOptions = Apollo.BaseMutationOptions<EnsureOmeroUserMutation, EnsureOmeroUserMutationVariables>;
export const DeleteMeDocument = gql`
    mutation DeleteMe($input: DeleteMeInput!) {
  deleteMe(input: $input) {
    id
  }
}
    `;
export type DeleteMeMutationFn = Apollo.MutationFunction<DeleteMeMutation, DeleteMeMutationVariables>;

/**
 * __useDeleteMeMutation__
 *
 * To run a mutation, you first call `useDeleteMeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteMeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteMeMutation, { data, loading, error }] = useDeleteMeMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useDeleteMeMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteMeMutation, DeleteMeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteMeMutation, DeleteMeMutationVariables>(DeleteMeDocument, options);
      }
export type DeleteMeMutationHookResult = ReturnType<typeof useDeleteMeMutation>;
export type DeleteMeMutationResult = Apollo.MutationResult<DeleteMeMutation>;
export type DeleteMeMutationOptions = Apollo.BaseMutationOptions<DeleteMeMutation, DeleteMeMutationVariables>;
export const ListDatasetsDocument = gql`
    query ListDatasets {
  datasets {
    ...ListDataset
  }
}
    ${ListDatasetFragmentDoc}`;

/**
 * __useListDatasetsQuery__
 *
 * To run a query within a React component, call `useListDatasetsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListDatasetsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListDatasetsQuery({
 *   variables: {
 *   },
 * });
 */
export function useListDatasetsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListDatasetsQuery, ListDatasetsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListDatasetsQuery, ListDatasetsQueryVariables>(ListDatasetsDocument, options);
      }
export function useListDatasetsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListDatasetsQuery, ListDatasetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListDatasetsQuery, ListDatasetsQueryVariables>(ListDatasetsDocument, options);
        }
export type ListDatasetsQueryHookResult = ReturnType<typeof useListDatasetsQuery>;
export type ListDatasetsLazyQueryHookResult = ReturnType<typeof useListDatasetsLazyQuery>;
export type ListDatasetsQueryResult = Apollo.QueryResult<ListDatasetsQuery, ListDatasetsQueryVariables>;
export const GetDatasetDocument = gql`
    query GetDataset($id: ID!) {
  dataset(id: $id) {
    ...Dataset
  }
}
    ${DatasetFragmentDoc}`;

/**
 * __useGetDatasetQuery__
 *
 * To run a query within a React component, call `useGetDatasetQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetDatasetQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetDatasetQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetDatasetQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetDatasetQuery, GetDatasetQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetDatasetQuery, GetDatasetQueryVariables>(GetDatasetDocument, options);
      }
export function useGetDatasetLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetDatasetQuery, GetDatasetQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetDatasetQuery, GetDatasetQueryVariables>(GetDatasetDocument, options);
        }
export type GetDatasetQueryHookResult = ReturnType<typeof useGetDatasetQuery>;
export type GetDatasetLazyQueryHookResult = ReturnType<typeof useGetDatasetLazyQuery>;
export type GetDatasetQueryResult = Apollo.QueryResult<GetDatasetQuery, GetDatasetQueryVariables>;
export const GlobalSearchDocument = gql`
    query GlobalSearch($search: String, $noImages: Boolean!, $pagination: OffsetPaginationInput) {
  images: images(filters: {search: $search}, pagination: $pagination) @skip(if: $noImages) {
    ...ListOmeroImage
  }
}
    ${ListOmeroImageFragmentDoc}`;

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
 *      noImages: // value for 'noImages'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useGlobalSearchQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GlobalSearchQuery, GlobalSearchQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GlobalSearchQuery, GlobalSearchQueryVariables>(GlobalSearchDocument, options);
      }
export function useGlobalSearchLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GlobalSearchQuery, GlobalSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GlobalSearchQuery, GlobalSearchQueryVariables>(GlobalSearchDocument, options);
        }
export type GlobalSearchQueryHookResult = ReturnType<typeof useGlobalSearchQuery>;
export type GlobalSearchLazyQueryHookResult = ReturnType<typeof useGlobalSearchLazyQuery>;
export type GlobalSearchQueryResult = Apollo.QueryResult<GlobalSearchQuery, GlobalSearchQueryVariables>;
export const ListOmeroImagesDocument = gql`
    query ListOmeroImages {
  images {
    ...ListOmeroImage
  }
}
    ${ListOmeroImageFragmentDoc}`;

/**
 * __useListOmeroImagesQuery__
 *
 * To run a query within a React component, call `useListOmeroImagesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListOmeroImagesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListOmeroImagesQuery({
 *   variables: {
 *   },
 * });
 */
export function useListOmeroImagesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListOmeroImagesQuery, ListOmeroImagesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListOmeroImagesQuery, ListOmeroImagesQueryVariables>(ListOmeroImagesDocument, options);
      }
export function useListOmeroImagesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListOmeroImagesQuery, ListOmeroImagesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListOmeroImagesQuery, ListOmeroImagesQueryVariables>(ListOmeroImagesDocument, options);
        }
export type ListOmeroImagesQueryHookResult = ReturnType<typeof useListOmeroImagesQuery>;
export type ListOmeroImagesLazyQueryHookResult = ReturnType<typeof useListOmeroImagesLazyQuery>;
export type ListOmeroImagesQueryResult = Apollo.QueryResult<ListOmeroImagesQuery, ListOmeroImagesQueryVariables>;
export const GetOmeroImageDocument = gql`
    query GetOmeroImage($id: ID!) {
  image(id: $id) {
    ...OmeroImage
  }
}
    ${OmeroImageFragmentDoc}`;

/**
 * __useGetOmeroImageQuery__
 *
 * To run a query within a React component, call `useGetOmeroImageQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetOmeroImageQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetOmeroImageQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetOmeroImageQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetOmeroImageQuery, GetOmeroImageQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetOmeroImageQuery, GetOmeroImageQueryVariables>(GetOmeroImageDocument, options);
      }
export function useGetOmeroImageLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetOmeroImageQuery, GetOmeroImageQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetOmeroImageQuery, GetOmeroImageQueryVariables>(GetOmeroImageDocument, options);
        }
export type GetOmeroImageQueryHookResult = ReturnType<typeof useGetOmeroImageQuery>;
export type GetOmeroImageLazyQueryHookResult = ReturnType<typeof useGetOmeroImageLazyQuery>;
export type GetOmeroImageQueryResult = Apollo.QueryResult<GetOmeroImageQuery, GetOmeroImageQueryVariables>;
export const MeDocument = gql`
    query Me {
  me {
    omeroUser {
      id
      omeroUsername
    }
  }
}
    `;

/**
 * __useMeQuery__
 *
 * To run a query within a React component, call `useMeQuery` and pass it any options that fit your needs.
 * When your component renders, `useMeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMeQuery({
 *   variables: {
 *   },
 * });
 */
export function useMeQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<MeQuery, MeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MeQuery, MeQueryVariables>(MeDocument, options);
      }
export function useMeLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MeQuery, MeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MeQuery, MeQueryVariables>(MeDocument, options);
        }
export type MeQueryHookResult = ReturnType<typeof useMeQuery>;
export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>;
export type MeQueryResult = Apollo.QueryResult<MeQuery, MeQueryVariables>;
export const ListProjectsDocument = gql`
    query ListProjects {
  projects {
    ...ListProject
  }
}
    ${ListProjectFragmentDoc}`;

/**
 * __useListProjectsQuery__
 *
 * To run a query within a React component, call `useListProjectsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListProjectsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListProjectsQuery({
 *   variables: {
 *   },
 * });
 */
export function useListProjectsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListProjectsQuery, ListProjectsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListProjectsQuery, ListProjectsQueryVariables>(ListProjectsDocument, options);
      }
export function useListProjectsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListProjectsQuery, ListProjectsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListProjectsQuery, ListProjectsQueryVariables>(ListProjectsDocument, options);
        }
export type ListProjectsQueryHookResult = ReturnType<typeof useListProjectsQuery>;
export type ListProjectsLazyQueryHookResult = ReturnType<typeof useListProjectsLazyQuery>;
export type ListProjectsQueryResult = Apollo.QueryResult<ListProjectsQuery, ListProjectsQueryVariables>;
export const GetProjectDocument = gql`
    query GetProject($id: ID!) {
  project(id: $id) {
    ...Project
  }
}
    ${ProjectFragmentDoc}`;

/**
 * __useGetProjectQuery__
 *
 * To run a query within a React component, call `useGetProjectQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetProjectQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetProjectQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetProjectQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetProjectQuery, GetProjectQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetProjectQuery, GetProjectQueryVariables>(GetProjectDocument, options);
      }
export function useGetProjectLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetProjectQuery, GetProjectQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetProjectQuery, GetProjectQueryVariables>(GetProjectDocument, options);
        }
export type GetProjectQueryHookResult = ReturnType<typeof useGetProjectQuery>;
export type GetProjectLazyQueryHookResult = ReturnType<typeof useGetProjectLazyQuery>;
export type GetProjectQueryResult = Apollo.QueryResult<GetProjectQuery, GetProjectQueryVariables>;