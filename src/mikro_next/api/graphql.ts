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
  ArrayLike: any;
  DateTime: any;
  FileLike: any;
  FiveDVector: any;
  FourByFourMatrix: any;
  Micrometers: any;
  Milliseconds: any;
  ParquetLike: any;
  ThreeDVector: any;
  Upload: any;
};

export type AccessCredentials = {
  __typename?: 'AccessCredentials';
  accessKey: Scalars['String'];
  bucket: Scalars['String'];
  key: Scalars['String'];
  path: Scalars['String'];
  secretKey: Scalars['String'];
  sessionToken: Scalars['String'];
};

export type Antibody = {
  __typename?: 'Antibody';
  epitope?: Maybe<Scalars['String']>;
  history: Array<History>;
  id: Scalars['ID'];
  name: Scalars['String'];
  primaryViews: Array<LabelView>;
  secondaryViews: Array<LabelView>;
};


export type AntibodyHistoryArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type AntibodyFilter = {
  AND?: InputMaybe<AntibodyFilter>;
  OR?: InputMaybe<AntibodyFilter>;
  id?: InputMaybe<Scalars['ID']>;
  name?: InputMaybe<StrFilterLookup>;
};

export type AntibodyInput = {
  epitope?: InputMaybe<Scalars['String']>;
  name: Scalars['String'];
};

export type App = {
  __typename?: 'App';
  id: Scalars['ID'];
};

export type AssociateInput = {
  other: Scalars['ID'];
  selfs: Array<Scalars['ID']>;
};

export type BigFileStore = {
  __typename?: 'BigFileStore';
  bucket: Scalars['String'];
  id: Scalars['ID'];
  key: Scalars['String'];
  path: Scalars['String'];
  presignedUrl: Scalars['String'];
};

export type Camera = {
  __typename?: 'Camera';
  bitDepth?: Maybe<Scalars['Int']>;
  history: Array<History>;
  id: Scalars['ID'];
  manufacturer?: Maybe<Scalars['String']>;
  model?: Maybe<Scalars['String']>;
  name: Scalars['String'];
  pixelSizeX?: Maybe<Scalars['Micrometers']>;
  pixelSizeY?: Maybe<Scalars['Micrometers']>;
  sensorSizeX?: Maybe<Scalars['Int']>;
  sensorSizeY?: Maybe<Scalars['Int']>;
  serialNumber: Scalars['String'];
  views: Array<OpticsView>;
};


export type CameraHistoryArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type CameraViewsArgs = {
  filters?: InputMaybe<OpticsViewFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type CameraFilter = {
  AND?: InputMaybe<CameraFilter>;
  OR?: InputMaybe<CameraFilter>;
  id?: InputMaybe<Scalars['ID']>;
  name?: InputMaybe<Scalars['String']>;
  provenance?: InputMaybe<ProvenanceFilter>;
};

export type CameraInput = {
  bitDepth?: InputMaybe<Scalars['Int']>;
  manufacturer?: InputMaybe<Scalars['String']>;
  model?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  pixelSizeX?: InputMaybe<Scalars['Micrometers']>;
  pixelSizeY?: InputMaybe<Scalars['Micrometers']>;
  sensorSizeX?: InputMaybe<Scalars['Int']>;
  sensorSizeY?: InputMaybe<Scalars['Int']>;
  serialNumber: Scalars['String'];
};

export type ChangeDatasetInput = {
  id: Scalars['ID'];
  name: Scalars['String'];
};

export type Channel = {
  __typename?: 'Channel';
  acquisitionMode?: Maybe<Scalars['String']>;
  color?: Maybe<Scalars['String']>;
  emissionWavelength?: Maybe<Scalars['Float']>;
  excitationWavelength?: Maybe<Scalars['Float']>;
  id: Scalars['ID'];
  name: Scalars['String'];
  views: Array<ChannelView>;
};

export type ChannelInput = {
  name: Scalars['String'];
};

export type ChannelView = View & {
  __typename?: 'ChannelView';
  /** The accessor */
  accessor: Array<Scalars['String']>;
  cMax?: Maybe<Scalars['Int']>;
  cMin?: Maybe<Scalars['Int']>;
  channel: Channel;
  id: Scalars['ID'];
  image: Image;
  isGlobal: Scalars['Boolean'];
  tMax?: Maybe<Scalars['Int']>;
  tMin?: Maybe<Scalars['Int']>;
  xMax?: Maybe<Scalars['Int']>;
  xMin?: Maybe<Scalars['Int']>;
  yMax?: Maybe<Scalars['Int']>;
  yMin?: Maybe<Scalars['Int']>;
  zMax?: Maybe<Scalars['Int']>;
  zMin?: Maybe<Scalars['Int']>;
};

export type ChannelViewInput = {
  cMax?: InputMaybe<Scalars['Int']>;
  cMin?: InputMaybe<Scalars['Int']>;
  channel: Scalars['ID'];
  collection?: InputMaybe<Scalars['ID']>;
  image: Scalars['ID'];
  tMax?: InputMaybe<Scalars['Int']>;
  tMin?: InputMaybe<Scalars['Int']>;
  xMax?: InputMaybe<Scalars['Int']>;
  xMin?: InputMaybe<Scalars['Int']>;
  yMax?: InputMaybe<Scalars['Int']>;
  yMin?: InputMaybe<Scalars['Int']>;
  zMax?: InputMaybe<Scalars['Int']>;
  zMin?: InputMaybe<Scalars['Int']>;
};

export type CreateDatasetInput = {
  name: Scalars['String'];
};

export type Credentials = {
  __typename?: 'Credentials';
  accessKey: Scalars['String'];
  bucket: Scalars['String'];
  datalayer: Scalars['String'];
  key: Scalars['String'];
  secretKey: Scalars['String'];
  sessionToken: Scalars['String'];
  status: Scalars['String'];
  store: Scalars['String'];
};

export type Dataset = {
  __typename?: 'Dataset';
  children: Array<Dataset>;
  createdAt: Scalars['DateTime'];
  creator?: Maybe<User>;
  description?: Maybe<Scalars['String']>;
  files: Array<File>;
  history: Array<History>;
  id: Scalars['ID'];
  images: Array<Image>;
  isDefault: Scalars['Boolean'];
  name: Scalars['String'];
  pinned: Scalars['Boolean'];
  tags: Array<Scalars['String']>;
};


export type DatasetChildrenArgs = {
  filters?: InputMaybe<DatasetFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type DatasetFilesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type DatasetHistoryArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type DatasetImagesArgs = {
  filters?: InputMaybe<ImageFilter>;
  order?: InputMaybe<ImageOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type DatasetFilter = {
  AND?: InputMaybe<DatasetFilter>;
  OR?: InputMaybe<DatasetFilter>;
  id?: InputMaybe<Scalars['ID']>;
  name?: InputMaybe<StrFilterLookup>;
  provenance?: InputMaybe<ProvenanceFilter>;
};

export type DeleteAntibodyInput = {
  id: Scalars['ID'];
};

export type DeleteCameraInput = {
  id: Scalars['ID'];
};

export type DeleteChannelInput = {
  id: Scalars['ID'];
};

export type DeleteDatasetInput = {
  id: Scalars['ID'];
};

export type DeleteEraInput = {
  id: Scalars['ID'];
};

export type DeleteFluorophoreInput = {
  id: Scalars['ID'];
};

export type DeleteInstrumentInput = {
  id: Scalars['ID'];
};

export type DeleteObjectiveInput = {
  id: Scalars['ID'];
};

export type DeleteSnaphotInput = {
  id: Scalars['ID'];
};

export type DeleteStageInput = {
  id: Scalars['ID'];
};

export type DeleteViewCollectionInput = {
  id: Scalars['ID'];
};

export type DeleteViewInput = {
  id: Scalars['ID'];
};

export type DesociateInput = {
  other: Scalars['ID'];
  selfs: Array<Scalars['ID']>;
};

export type Era = {
  __typename?: 'Era';
  begin?: Maybe<Scalars['DateTime']>;
  history: Array<History>;
  id: Scalars['ID'];
  name: Scalars['String'];
  views: Array<TimepointView>;
};


export type EraHistoryArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type EraViewsArgs = {
  filters?: InputMaybe<TimepointViewFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type EraFilter = {
  AND?: InputMaybe<EraFilter>;
  OR?: InputMaybe<EraFilter>;
  begin?: InputMaybe<Scalars['DateTime']>;
  id?: InputMaybe<Scalars['ID']>;
  provenance?: InputMaybe<ProvenanceFilter>;
};

export type EraInput = {
  begin?: InputMaybe<Scalars['DateTime']>;
  name: Scalars['String'];
};

export type File = {
  __typename?: 'File';
  id: Scalars['ID'];
  name: Scalars['String'];
  origins: Array<Image>;
  store: BigFileStore;
};


export type FileOriginsArgs = {
  filters?: InputMaybe<ImageFilter>;
  order?: InputMaybe<ImageOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type FloatFilterLookup = {
  contains?: InputMaybe<Scalars['Float']>;
  endsWith?: InputMaybe<Scalars['Float']>;
  exact?: InputMaybe<Scalars['Float']>;
  gt?: InputMaybe<Scalars['Float']>;
  gte?: InputMaybe<Scalars['Float']>;
  iContains?: InputMaybe<Scalars['Float']>;
  iEndsWith?: InputMaybe<Scalars['Float']>;
  iExact?: InputMaybe<Scalars['Float']>;
  iRegex?: InputMaybe<Scalars['String']>;
  iStartsWith?: InputMaybe<Scalars['Float']>;
  inList?: InputMaybe<Array<Scalars['Float']>>;
  isNull?: InputMaybe<Scalars['Boolean']>;
  lt?: InputMaybe<Scalars['Float']>;
  lte?: InputMaybe<Scalars['Float']>;
  nContains?: InputMaybe<Scalars['Float']>;
  nEndsWith?: InputMaybe<Scalars['Float']>;
  nExact?: InputMaybe<Scalars['Float']>;
  nGt?: InputMaybe<Scalars['Float']>;
  nGte?: InputMaybe<Scalars['Float']>;
  nIContains?: InputMaybe<Scalars['Float']>;
  nIEndsWith?: InputMaybe<Scalars['Float']>;
  nIExact?: InputMaybe<Scalars['Float']>;
  nIRegex?: InputMaybe<Scalars['String']>;
  nIStartsWith?: InputMaybe<Scalars['Float']>;
  nInList?: InputMaybe<Array<Scalars['Float']>>;
  nIsNull?: InputMaybe<Scalars['Boolean']>;
  nLt?: InputMaybe<Scalars['Float']>;
  nLte?: InputMaybe<Scalars['Float']>;
  nRange?: InputMaybe<Array<Scalars['Float']>>;
  nRegex?: InputMaybe<Scalars['String']>;
  nStartsWith?: InputMaybe<Scalars['Float']>;
  range?: InputMaybe<Array<Scalars['Float']>>;
  regex?: InputMaybe<Scalars['String']>;
  startsWith?: InputMaybe<Scalars['Float']>;
};

export type Fluorophore = {
  __typename?: 'Fluorophore';
  emissionWavelength?: Maybe<Scalars['Micrometers']>;
  excitationWavelength?: Maybe<Scalars['Micrometers']>;
  history: Array<History>;
  id: Scalars['ID'];
  name: Scalars['String'];
  views: Array<LabelView>;
};


export type FluorophoreHistoryArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type FluorophoreFilter = {
  AND?: InputMaybe<FluorophoreFilter>;
  OR?: InputMaybe<FluorophoreFilter>;
  emissionWavelength?: InputMaybe<IntFilterLookup>;
  excitationWavelength?: InputMaybe<IntFilterLookup>;
  id?: InputMaybe<Scalars['ID']>;
  provancne?: InputMaybe<ProvenanceFilter>;
};

export type FluorophoreInput = {
  emissionWavelength?: InputMaybe<Scalars['Micrometers']>;
  excitationWavelength?: InputMaybe<Scalars['Micrometers']>;
  name: Scalars['String'];
};

export type FromArrayLikeInput = {
  array: Scalars['ArrayLike'];
  channelViews?: InputMaybe<Array<PartialChannelViewInput>>;
  dataset?: InputMaybe<Scalars['ID']>;
  labelViews?: InputMaybe<Array<PartialLabelViewInput>>;
  name: Scalars['String'];
  opticsViews?: InputMaybe<Array<PartialOpticsViewInput>>;
  origins?: InputMaybe<Array<Scalars['ID']>>;
  timepointViews?: InputMaybe<Array<PartialTimepointViewInput>>;
  transformationViews?: InputMaybe<Array<PartialTransformationViewInput>>;
};

export type FromFileLike = {
  dataset?: InputMaybe<Scalars['ID']>;
  file: Scalars['FileLike'];
  name: Scalars['String'];
  origins?: InputMaybe<Array<Scalars['ID']>>;
};

export type FromParquetLike = {
  dataframe: Scalars['ParquetLike'];
  dataset?: InputMaybe<Scalars['ID']>;
  name: Scalars['String'];
  origins?: InputMaybe<Array<Scalars['ID']>>;
};

export type History = {
  __typename?: 'History';
  app?: Maybe<App>;
  date: Scalars['DateTime'];
  during?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  kind: HistoryKind;
  user?: Maybe<User>;
};

export enum HistoryKind {
  Create = 'CREATE',
  Delete = 'DELETE',
  Update = 'UPDATE'
}

export type Image = {
  __typename?: 'Image';
  channelViews: Array<ChannelView>;
  createdAt: Scalars['DateTime'];
  creator?: Maybe<User>;
  dataset?: Maybe<Dataset>;
  fileOrigins: Array<File>;
  history: Array<History>;
  id: Scalars['ID'];
  intMetrics: Array<ImageIntMetric>;
  labelViews: Array<LabelView>;
  latestSnapshot?: Maybe<Snapshot>;
  metrics: Array<ImageMetric>;
  name: Scalars['String'];
  opticsViews: Array<OpticsView>;
  origins: Array<Image>;
  pinned: Scalars['Boolean'];
  renders: Array<Render>;
  roiOrigins: Array<Roi>;
  rois: Array<View>;
  snapshots: Array<Snapshot>;
  store: ZarrStore;
  tags: Array<Scalars['String']>;
  timepointViews: Array<TimepointView>;
  transformationViews: Array<TransformationView>;
  videos: Array<Video>;
  views: Array<View>;
};


export type ImageFileOriginsArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type ImageHistoryArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type ImageIntMetricsArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type ImageMetricsArgs = {
  filters?: InputMaybe<ViewFilter>;
  types?: InputMaybe<Array<RenderKind>>;
};


export type ImageOpticsViewsArgs = {
  filters?: InputMaybe<OpticsViewFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type ImageOriginsArgs = {
  filters?: InputMaybe<ImageFilter>;
  order?: InputMaybe<ImageOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type ImageRendersArgs = {
  filters?: InputMaybe<ViewFilter>;
  types?: InputMaybe<Array<RenderKind>>;
};


export type ImageRoisArgs = {
  filters?: InputMaybe<RoiFilter>;
};


export type ImageSnapshotsArgs = {
  filters?: InputMaybe<SnapshotFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type ImageTimepointViewsArgs = {
  filters?: InputMaybe<TimepointViewFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type ImageTransformationViewsArgs = {
  filters?: InputMaybe<TransformationViewFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type ImageVideosArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type ImageViewsArgs = {
  filters?: InputMaybe<ViewFilter>;
  types?: InputMaybe<Array<ViewKind>>;
};

export type ImageFilter = {
  AND?: InputMaybe<ImageFilter>;
  OR?: InputMaybe<ImageFilter>;
  dataset?: InputMaybe<DatasetFilter>;
  ids?: InputMaybe<Array<Scalars['ID']>>;
  name?: InputMaybe<StrFilterLookup>;
  provenance?: InputMaybe<ProvenanceFilter>;
  store?: InputMaybe<ZarrStoreFilter>;
  timepointViews?: InputMaybe<TimepointViewFilter>;
  transformationViews?: InputMaybe<TransformationViewFilter>;
};

export type ImageIntMetric = ImageMetric & IntMetric & {
  __typename?: 'ImageIntMetric';
  createdAt: Scalars['DateTime'];
  creator?: Maybe<User>;
  id: Scalars['ID'];
  image: Image;
  value: Scalars['Int'];
};

export type ImageMetric = {
  createdAt: Scalars['DateTime'];
  creator?: Maybe<User>;
  image: Image;
};

export type ImageOrder = {
  createdAt?: InputMaybe<Ordering>;
};

export type Instrument = {
  __typename?: 'Instrument';
  id: Scalars['ID'];
  manufacturer?: Maybe<Scalars['String']>;
  model?: Maybe<Scalars['String']>;
  name: Scalars['String'];
  serialNumber: Scalars['String'];
  views: Array<OpticsView>;
};


export type InstrumentViewsArgs = {
  filters?: InputMaybe<OpticsViewFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type InstrumentFilter = {
  AND?: InputMaybe<InstrumentFilter>;
  OR?: InputMaybe<InstrumentFilter>;
  id?: InputMaybe<Scalars['ID']>;
  name?: InputMaybe<Scalars['String']>;
  provenance?: InputMaybe<ProvenanceFilter>;
};

export type InstrumentInput = {
  manufacturer?: InputMaybe<Scalars['String']>;
  model?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  serialNumber: Scalars['String'];
};

export type IntFilterLookup = {
  contains?: InputMaybe<Scalars['Int']>;
  endsWith?: InputMaybe<Scalars['Int']>;
  exact?: InputMaybe<Scalars['Int']>;
  gt?: InputMaybe<Scalars['Int']>;
  gte?: InputMaybe<Scalars['Int']>;
  iContains?: InputMaybe<Scalars['Int']>;
  iEndsWith?: InputMaybe<Scalars['Int']>;
  iExact?: InputMaybe<Scalars['Int']>;
  iRegex?: InputMaybe<Scalars['String']>;
  iStartsWith?: InputMaybe<Scalars['Int']>;
  inList?: InputMaybe<Array<Scalars['Int']>>;
  isNull?: InputMaybe<Scalars['Boolean']>;
  lt?: InputMaybe<Scalars['Int']>;
  lte?: InputMaybe<Scalars['Int']>;
  nContains?: InputMaybe<Scalars['Int']>;
  nEndsWith?: InputMaybe<Scalars['Int']>;
  nExact?: InputMaybe<Scalars['Int']>;
  nGt?: InputMaybe<Scalars['Int']>;
  nGte?: InputMaybe<Scalars['Int']>;
  nIContains?: InputMaybe<Scalars['Int']>;
  nIEndsWith?: InputMaybe<Scalars['Int']>;
  nIExact?: InputMaybe<Scalars['Int']>;
  nIRegex?: InputMaybe<Scalars['String']>;
  nIStartsWith?: InputMaybe<Scalars['Int']>;
  nInList?: InputMaybe<Array<Scalars['Int']>>;
  nIsNull?: InputMaybe<Scalars['Boolean']>;
  nLt?: InputMaybe<Scalars['Int']>;
  nLte?: InputMaybe<Scalars['Int']>;
  nRange?: InputMaybe<Array<Scalars['Int']>>;
  nRegex?: InputMaybe<Scalars['String']>;
  nStartsWith?: InputMaybe<Scalars['Int']>;
  range?: InputMaybe<Array<Scalars['Int']>>;
  regex?: InputMaybe<Scalars['String']>;
  startsWith?: InputMaybe<Scalars['Int']>;
};

export type IntMetric = {
  value: Scalars['Int'];
};

export type LabelView = View & {
  __typename?: 'LabelView';
  /** The accessor */
  accessor: Array<Scalars['String']>;
  acquisitionMode: Scalars['String'];
  cMax?: Maybe<Scalars['Int']>;
  cMin?: Maybe<Scalars['Int']>;
  fluorophore: Fluorophore;
  id: Scalars['ID'];
  image: Image;
  isGlobal: Scalars['Boolean'];
  primaryAntibody?: Maybe<Antibody>;
  secondaryAntibody?: Maybe<Antibody>;
  tMax?: Maybe<Scalars['Int']>;
  tMin?: Maybe<Scalars['Int']>;
  xMax?: Maybe<Scalars['Int']>;
  xMin?: Maybe<Scalars['Int']>;
  yMax?: Maybe<Scalars['Int']>;
  yMin?: Maybe<Scalars['Int']>;
  zMax?: Maybe<Scalars['Int']>;
  zMin?: Maybe<Scalars['Int']>;
};

export type LabelViewInput = {
  cMax?: InputMaybe<Scalars['Int']>;
  cMin?: InputMaybe<Scalars['Int']>;
  collection?: InputMaybe<Scalars['ID']>;
  fluorophore?: InputMaybe<Scalars['ID']>;
  image: Scalars['ID'];
  primaryAntibody?: InputMaybe<Scalars['ID']>;
  secondaryAntibody?: InputMaybe<Scalars['ID']>;
  tMax?: InputMaybe<Scalars['Int']>;
  tMin?: InputMaybe<Scalars['Int']>;
  xMax?: InputMaybe<Scalars['Int']>;
  xMin?: InputMaybe<Scalars['Int']>;
  yMax?: InputMaybe<Scalars['Int']>;
  yMin?: InputMaybe<Scalars['Int']>;
  zMax?: InputMaybe<Scalars['Int']>;
  zMin?: InputMaybe<Scalars['Int']>;
};

export type MediaStore = {
  __typename?: 'MediaStore';
  bucket: Scalars['String'];
  id: Scalars['ID'];
  key: Scalars['String'];
  path: Scalars['String'];
  presignedUrl: Scalars['String'];
};


export type MediaStorePresignedUrlArgs = {
  host?: InputMaybe<Scalars['String']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  createAntibody: Antibody;
  createCamera: Camera;
  createChannel: Channel;
  createChannelView: View;
  createDataset: Dataset;
  createEra: Era;
  createFluorophore: Fluorophore;
  createInstrument: Instrument;
  createLabelView: LabelView;
  createObjective: Objective;
  createOpticsView: OpticsView;
  createSnapshot: Snapshot;
  createStage: Stage;
  createTimepointView: TimepointView;
  createTransformationView: View;
  createViewCollection: ViewCollection;
  deleteAntibody: Scalars['ID'];
  deleteCamera: Scalars['ID'];
  deleteChannel: Scalars['ID'];
  deleteDataset: Scalars['ID'];
  deleteEra: Scalars['ID'];
  deleteFluorophore: Scalars['ID'];
  deleteInstrument: Scalars['ID'];
  deleteObjective: Scalars['ID'];
  deleteSnapshot: Scalars['ID'];
  deleteStage: Scalars['ID'];
  deleteView: Scalars['ID'];
  deleteViewCollection: Scalars['ID'];
  ensureAntibody: Antibody;
  ensureCamera: Camera;
  ensureChannel: Channel;
  ensureFluorophore: Fluorophore;
  ensureInstrument: Instrument;
  ensureObjective: Objective;
  fromArrayLike: Image;
  fromFileLike: File;
  fromParquetLike: Table;
  pinAntibody: Antibody;
  pinCamera: Camera;
  pinChannel: Channel;
  pinDataset: Dataset;
  pinEra: Era;
  pinFluorophore: Fluorophore;
  pinImage: Image;
  pinInstrument: Instrument;
  pinObjective: Objective;
  pinSnapshot: Snapshot;
  pinStage: Stage;
  pinView: View;
  pinViewCollection: ViewCollection;
  putDatasetsInDataset: Dataset;
  putFilesInDataset: Dataset;
  putImagesInDataset: Dataset;
  relateToDataset: Image;
  releaseDatasetsFromDataset: Dataset;
  releaseFilesFromDataset: Dataset;
  releaseImagesFromDataset: Dataset;
  requestAccess: AccessCredentials;
  requestFileAccess: AccessCredentials;
  requestFileUpload: Credentials;
  requestTableAccess: AccessCredentials;
  requestTableUpload: Credentials;
  requestUpload: Credentials;
  revertDataset: Dataset;
  updateDataset: Dataset;
};


export type MutationCreateAntibodyArgs = {
  input: AntibodyInput;
};


export type MutationCreateCameraArgs = {
  input: CameraInput;
};


export type MutationCreateChannelArgs = {
  input: ChannelInput;
};


export type MutationCreateChannelViewArgs = {
  input: ChannelViewInput;
};


export type MutationCreateDatasetArgs = {
  input: CreateDatasetInput;
};


export type MutationCreateEraArgs = {
  input: EraInput;
};


export type MutationCreateFluorophoreArgs = {
  input: FluorophoreInput;
};


export type MutationCreateInstrumentArgs = {
  input: InstrumentInput;
};


export type MutationCreateLabelViewArgs = {
  input: LabelViewInput;
};


export type MutationCreateObjectiveArgs = {
  input: ObjectiveInput;
};


export type MutationCreateOpticsViewArgs = {
  input: OpticsViewInput;
};


export type MutationCreateSnapshotArgs = {
  input: SnaphotInput;
};


export type MutationCreateStageArgs = {
  input: StageInput;
};


export type MutationCreateTimepointViewArgs = {
  input: TimepointViewInput;
};


export type MutationCreateTransformationViewArgs = {
  input: ChannelViewInput;
};


export type MutationCreateViewCollectionArgs = {
  input: ViewCollectionInput;
};


export type MutationDeleteAntibodyArgs = {
  input: DeleteAntibodyInput;
};


export type MutationDeleteCameraArgs = {
  input: DeleteCameraInput;
};


export type MutationDeleteChannelArgs = {
  input: DeleteChannelInput;
};


export type MutationDeleteDatasetArgs = {
  input: DeleteDatasetInput;
};


export type MutationDeleteEraArgs = {
  input: DeleteEraInput;
};


export type MutationDeleteFluorophoreArgs = {
  input: DeleteFluorophoreInput;
};


export type MutationDeleteInstrumentArgs = {
  input: DeleteInstrumentInput;
};


export type MutationDeleteObjectiveArgs = {
  input: DeleteObjectiveInput;
};


export type MutationDeleteSnapshotArgs = {
  input: DeleteSnaphotInput;
};


export type MutationDeleteStageArgs = {
  input: DeleteStageInput;
};


export type MutationDeleteViewArgs = {
  input: DeleteViewInput;
};


export type MutationDeleteViewCollectionArgs = {
  input: DeleteViewCollectionInput;
};


export type MutationEnsureAntibodyArgs = {
  input: AntibodyInput;
};


export type MutationEnsureCameraArgs = {
  input: CameraInput;
};


export type MutationEnsureChannelArgs = {
  input: ChannelInput;
};


export type MutationEnsureFluorophoreArgs = {
  input: FluorophoreInput;
};


export type MutationEnsureInstrumentArgs = {
  input: InstrumentInput;
};


export type MutationEnsureObjectiveArgs = {
  input: ObjectiveInput;
};


export type MutationFromArrayLikeArgs = {
  input: FromArrayLikeInput;
};


export type MutationFromFileLikeArgs = {
  input: FromFileLike;
};


export type MutationFromParquetLikeArgs = {
  input: FromParquetLike;
};


export type MutationPinAntibodyArgs = {
  input: PinAntibodyInput;
};


export type MutationPinCameraArgs = {
  input: PinCameraInput;
};


export type MutationPinChannelArgs = {
  input: PinChannelInput;
};


export type MutationPinDatasetArgs = {
  input: PinDatasetInput;
};


export type MutationPinEraArgs = {
  input: PinEraInput;
};


export type MutationPinFluorophoreArgs = {
  input: PinFluorophoreInput;
};


export type MutationPinImageArgs = {
  input: PinImageInput;
};


export type MutationPinInstrumentArgs = {
  input: PinInstrumentInput;
};


export type MutationPinObjectiveArgs = {
  input: PinObjectiveInput;
};


export type MutationPinSnapshotArgs = {
  input: PinSnapshotInput;
};


export type MutationPinStageArgs = {
  input: PinStageInput;
};


export type MutationPinViewArgs = {
  input: PinViewInput;
};


export type MutationPinViewCollectionArgs = {
  input: PinViewCollectionInput;
};


export type MutationPutDatasetsInDatasetArgs = {
  input: AssociateInput;
};


export type MutationPutFilesInDatasetArgs = {
  input: AssociateInput;
};


export type MutationPutImagesInDatasetArgs = {
  input: AssociateInput;
};


export type MutationRelateToDatasetArgs = {
  input: RelateToDatasetInput;
};


export type MutationReleaseDatasetsFromDatasetArgs = {
  input: DesociateInput;
};


export type MutationReleaseFilesFromDatasetArgs = {
  input: DesociateInput;
};


export type MutationReleaseImagesFromDatasetArgs = {
  input: DesociateInput;
};


export type MutationRequestAccessArgs = {
  input: RequestAccessInput;
};


export type MutationRequestFileAccessArgs = {
  input: RequestFileAccessInput;
};


export type MutationRequestFileUploadArgs = {
  input: RequestFileUploadInput;
};


export type MutationRequestTableAccessArgs = {
  input: RequestTableAccessInput;
};


export type MutationRequestTableUploadArgs = {
  input: RequestTableUploadInput;
};


export type MutationRequestUploadArgs = {
  input: RequestUploadInput;
};


export type MutationRevertDatasetArgs = {
  input: RevertInput;
};


export type MutationUpdateDatasetArgs = {
  input: ChangeDatasetInput;
};

export type Objective = {
  __typename?: 'Objective';
  id: Scalars['ID'];
  immersion?: Maybe<Scalars['String']>;
  magnification?: Maybe<Scalars['Float']>;
  na?: Maybe<Scalars['Float']>;
  name: Scalars['String'];
  serialNumber: Scalars['String'];
  views: Array<OpticsView>;
};


export type ObjectiveViewsArgs = {
  filters?: InputMaybe<OpticsViewFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type ObjectiveFilter = {
  AND?: InputMaybe<ObjectiveFilter>;
  OR?: InputMaybe<ObjectiveFilter>;
  id?: InputMaybe<Scalars['ID']>;
  name?: InputMaybe<Scalars['String']>;
  provenance?: InputMaybe<ProvenanceFilter>;
};

export type ObjectiveInput = {
  immersion?: InputMaybe<Scalars['String']>;
  magnification?: InputMaybe<Scalars['Float']>;
  na?: InputMaybe<Scalars['Float']>;
  name?: InputMaybe<Scalars['String']>;
  serialNumber: Scalars['String'];
};

export type OffsetPaginationInput = {
  limit?: Scalars['Int'];
  offset?: Scalars['Int'];
};

export type OpticsView = View & {
  __typename?: 'OpticsView';
  /** The accessor */
  accessor: Array<Scalars['String']>;
  cMax?: Maybe<Scalars['Int']>;
  cMin?: Maybe<Scalars['Int']>;
  camera?: Maybe<Camera>;
  id: Scalars['ID'];
  image: Image;
  instrument?: Maybe<Instrument>;
  isGlobal: Scalars['Boolean'];
  objective?: Maybe<Objective>;
  tMax?: Maybe<Scalars['Int']>;
  tMin?: Maybe<Scalars['Int']>;
  xMax?: Maybe<Scalars['Int']>;
  xMin?: Maybe<Scalars['Int']>;
  yMax?: Maybe<Scalars['Int']>;
  yMin?: Maybe<Scalars['Int']>;
  zMax?: Maybe<Scalars['Int']>;
  zMin?: Maybe<Scalars['Int']>;
};

export type OpticsViewFilter = {
  AND?: InputMaybe<OpticsViewFilter>;
  OR?: InputMaybe<OpticsViewFilter>;
  camera?: InputMaybe<CameraFilter>;
  instrument?: InputMaybe<InstrumentFilter>;
  isGlobal?: InputMaybe<Scalars['Boolean']>;
  objective?: InputMaybe<ObjectiveFilter>;
  provenance?: InputMaybe<ProvenanceFilter>;
};

export type OpticsViewInput = {
  cMax?: InputMaybe<Scalars['Int']>;
  cMin?: InputMaybe<Scalars['Int']>;
  camera?: InputMaybe<Scalars['ID']>;
  collection?: InputMaybe<Scalars['ID']>;
  image: Scalars['ID'];
  instrument?: InputMaybe<Scalars['ID']>;
  objective?: InputMaybe<Scalars['ID']>;
  tMax?: InputMaybe<Scalars['Int']>;
  tMin?: InputMaybe<Scalars['Int']>;
  xMax?: InputMaybe<Scalars['Int']>;
  xMin?: InputMaybe<Scalars['Int']>;
  yMax?: InputMaybe<Scalars['Int']>;
  yMin?: InputMaybe<Scalars['Int']>;
  zMax?: InputMaybe<Scalars['Int']>;
  zMin?: InputMaybe<Scalars['Int']>;
};

export enum Ordering {
  Asc = 'ASC',
  Desc = 'DESC'
}

export type ParquetStore = {
  __typename?: 'ParquetStore';
  bucket: Scalars['String'];
  id: Scalars['ID'];
  key: Scalars['String'];
  path: Scalars['String'];
};

export type PartialChannelViewInput = {
  cMax?: InputMaybe<Scalars['Int']>;
  cMin?: InputMaybe<Scalars['Int']>;
  channel: Scalars['ID'];
  collection?: InputMaybe<Scalars['ID']>;
  tMax?: InputMaybe<Scalars['Int']>;
  tMin?: InputMaybe<Scalars['Int']>;
  xMax?: InputMaybe<Scalars['Int']>;
  xMin?: InputMaybe<Scalars['Int']>;
  yMax?: InputMaybe<Scalars['Int']>;
  yMin?: InputMaybe<Scalars['Int']>;
  zMax?: InputMaybe<Scalars['Int']>;
  zMin?: InputMaybe<Scalars['Int']>;
};

export type PartialLabelViewInput = {
  cMax?: InputMaybe<Scalars['Int']>;
  cMin?: InputMaybe<Scalars['Int']>;
  collection?: InputMaybe<Scalars['ID']>;
  fluorophore?: InputMaybe<Scalars['ID']>;
  primaryAntibody?: InputMaybe<Scalars['ID']>;
  secondaryAntibody?: InputMaybe<Scalars['ID']>;
  tMax?: InputMaybe<Scalars['Int']>;
  tMin?: InputMaybe<Scalars['Int']>;
  xMax?: InputMaybe<Scalars['Int']>;
  xMin?: InputMaybe<Scalars['Int']>;
  yMax?: InputMaybe<Scalars['Int']>;
  yMin?: InputMaybe<Scalars['Int']>;
  zMax?: InputMaybe<Scalars['Int']>;
  zMin?: InputMaybe<Scalars['Int']>;
};

export type PartialOpticsViewInput = {
  cMax?: InputMaybe<Scalars['Int']>;
  cMin?: InputMaybe<Scalars['Int']>;
  camera?: InputMaybe<Scalars['ID']>;
  collection?: InputMaybe<Scalars['ID']>;
  instrument?: InputMaybe<Scalars['ID']>;
  objective?: InputMaybe<Scalars['ID']>;
  tMax?: InputMaybe<Scalars['Int']>;
  tMin?: InputMaybe<Scalars['Int']>;
  xMax?: InputMaybe<Scalars['Int']>;
  xMin?: InputMaybe<Scalars['Int']>;
  yMax?: InputMaybe<Scalars['Int']>;
  yMin?: InputMaybe<Scalars['Int']>;
  zMax?: InputMaybe<Scalars['Int']>;
  zMin?: InputMaybe<Scalars['Int']>;
};

export type PartialTimepointViewInput = {
  cMax?: InputMaybe<Scalars['Int']>;
  cMin?: InputMaybe<Scalars['Int']>;
  collection?: InputMaybe<Scalars['ID']>;
  era?: InputMaybe<Scalars['ID']>;
  indexSinceStart?: InputMaybe<Scalars['Int']>;
  msSinceStart?: InputMaybe<Scalars['Milliseconds']>;
  tMax?: InputMaybe<Scalars['Int']>;
  tMin?: InputMaybe<Scalars['Int']>;
  xMax?: InputMaybe<Scalars['Int']>;
  xMin?: InputMaybe<Scalars['Int']>;
  yMax?: InputMaybe<Scalars['Int']>;
  yMin?: InputMaybe<Scalars['Int']>;
  zMax?: InputMaybe<Scalars['Int']>;
  zMin?: InputMaybe<Scalars['Int']>;
};

export type PartialTransformationViewInput = {
  cMax?: InputMaybe<Scalars['Int']>;
  cMin?: InputMaybe<Scalars['Int']>;
  collection?: InputMaybe<Scalars['ID']>;
  kind?: InputMaybe<TransformationKind>;
  matrix: Scalars['FourByFourMatrix'];
  stage?: InputMaybe<Scalars['ID']>;
  tMax?: InputMaybe<Scalars['Int']>;
  tMin?: InputMaybe<Scalars['Int']>;
  xMax?: InputMaybe<Scalars['Int']>;
  xMin?: InputMaybe<Scalars['Int']>;
  yMax?: InputMaybe<Scalars['Int']>;
  yMin?: InputMaybe<Scalars['Int']>;
  zMax?: InputMaybe<Scalars['Int']>;
  zMin?: InputMaybe<Scalars['Int']>;
};

export type PinAntibodyInput = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};

export type PinCameraInput = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};

export type PinChannelInput = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};

export type PinDatasetInput = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};

export type PinEraInput = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};

export type PinFluorophoreInput = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};

export type PinImageInput = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};

export type PinInstrumentInput = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};

export type PinObjectiveInput = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};

export type PinSnapshotInput = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};

export type PinStageInput = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};

export type PinViewCollectionInput = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};

export type PinViewInput = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};

export type ProvenanceFilter = {
  AND?: InputMaybe<ProvenanceFilter>;
  OR?: InputMaybe<ProvenanceFilter>;
  during?: InputMaybe<Scalars['String']>;
  user?: InputMaybe<UserFilter>;
};

export type Query = {
  __typename?: 'Query';
  antibodies: Array<Antibody>;
  camera: Camera;
  channelViews: Array<ChannelView>;
  channels: Array<Channel>;
  dataset: Dataset;
  datasets: Array<Dataset>;
  eras: Array<Era>;
  file: File;
  files: Array<File>;
  fluorophores: Array<Fluorophore>;
  image: Image;
  images: Array<Image>;
  instrument: Instrument;
  instruments: Array<Instrument>;
  labelViews: Array<LabelView>;
  mychannels: Array<Channel>;
  mydatasets: Array<Dataset>;
  myeras: Array<Era>;
  myfiles: Array<File>;
  myimages: Array<Image>;
  myinstruments: Array<Instrument>;
  myobjectives: Array<Objective>;
  mysnapshots: Array<Snapshot>;
  mytables: Array<Table>;
  objective: Objective;
  objectives: Array<Objective>;
  snapshot: Snapshot;
  snapshots: Array<Snapshot>;
  stage: Stage;
  stages: Array<Stage>;
  table: Table;
  tables: Array<Table>;
  timepointViews: Array<TimepointView>;
  transformationViews: Array<TransformationView>;
};


export type QueryAntibodiesArgs = {
  filters?: InputMaybe<AntibodyFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryCameraArgs = {
  id: Scalars['ID'];
};


export type QueryDatasetArgs = {
  id: Scalars['ID'];
};


export type QueryDatasetsArgs = {
  filters?: InputMaybe<DatasetFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryErasArgs = {
  filters?: InputMaybe<EraFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryFileArgs = {
  id: Scalars['ID'];
};


export type QueryFilesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryFluorophoresArgs = {
  filters?: InputMaybe<FluorophoreFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryImageArgs = {
  id: Scalars['ID'];
};


export type QueryImagesArgs = {
  filters?: InputMaybe<ImageFilter>;
  order?: InputMaybe<ImageOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryInstrumentArgs = {
  id: Scalars['ID'];
};


export type QueryMydatasetsArgs = {
  filters?: InputMaybe<DatasetFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMyerasArgs = {
  filters?: InputMaybe<EraFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMyfilesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMyimagesArgs = {
  filters?: InputMaybe<ImageFilter>;
  order?: InputMaybe<ImageOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMysnapshotsArgs = {
  filters?: InputMaybe<SnapshotFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMytablesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryObjectiveArgs = {
  id: Scalars['ID'];
};


export type QuerySnapshotArgs = {
  id: Scalars['ID'];
};


export type QuerySnapshotsArgs = {
  filters?: InputMaybe<SnapshotFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryStageArgs = {
  id: Scalars['ID'];
};


export type QueryStagesArgs = {
  filters?: InputMaybe<StageFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryTableArgs = {
  id: Scalars['ID'];
};


export type QueryTablesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryTimepointViewsArgs = {
  filters?: InputMaybe<TimepointViewFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryTransformationViewsArgs = {
  filters?: InputMaybe<TransformationViewFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type Roi = {
  id: Scalars['ID'];
  image: Image;
  vectors: Scalars['FiveDVector'];
};

export type RoiFilter = {
  AND?: InputMaybe<RoiFilter>;
  OR?: InputMaybe<RoiFilter>;
  id?: InputMaybe<Scalars['ID']>;
  kind?: InputMaybe<RoiKind>;
};

export type RelateToDatasetInput = {
  id: Scalars['ID'];
  other: Scalars['ID'];
};

export type Render = {
  createdAt: Scalars['DateTime'];
  creator?: Maybe<User>;
};

export enum RenderKind {
  Snapshot = 'SNAPSHOT',
  Video = 'VIDEO'
}

export type RequestAccessInput = {
  duration?: InputMaybe<Scalars['Int']>;
  store: Scalars['ID'];
};

export type RequestFileAccessInput = {
  duration?: InputMaybe<Scalars['Int']>;
  store: Scalars['ID'];
};

export type RequestFileUploadInput = {
  datalayer: Scalars['String'];
  key: Scalars['String'];
};

export type RequestTableAccessInput = {
  duration?: InputMaybe<Scalars['Int']>;
  store: Scalars['ID'];
};

export type RequestTableUploadInput = {
  datalayer: Scalars['String'];
  key: Scalars['String'];
};

export type RequestUploadInput = {
  datalayer: Scalars['String'];
  key: Scalars['String'];
};

export type RevertInput = {
  historyId: Scalars['ID'];
  id: Scalars['ID'];
};

export enum RoiKind {
  Ellipsis = 'ELLIPSIS',
  Frame = 'FRAME',
  Line = 'LINE',
  Path = 'PATH',
  Point = 'POINT',
  Polygon = 'POLYGON',
  Rectangle = 'RECTANGLE',
  Slice = 'SLICE',
  Unknown = 'UNKNOWN'
}

export type SnaphotInput = {
  file: Scalars['Upload'];
  image: Scalars['ID'];
};

export type Snapshot = Render & {
  __typename?: 'Snapshot';
  createdAt: Scalars['DateTime'];
  creator?: Maybe<User>;
  id: Scalars['ID'];
  name: Scalars['String'];
  store: MediaStore;
};

export type SnapshotFilter = {
  AND?: InputMaybe<SnapshotFilter>;
  OR?: InputMaybe<SnapshotFilter>;
  ids?: InputMaybe<Array<Scalars['ID']>>;
  name?: InputMaybe<StrFilterLookup>;
};

export type Stage = {
  __typename?: 'Stage';
  description?: Maybe<Scalars['String']>;
  history: Array<History>;
  id: Scalars['ID'];
  name: Scalars['String'];
  pinned: Scalars['Boolean'];
  views: Array<TransformationView>;
};


export type StageHistoryArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type StageViewsArgs = {
  filters?: InputMaybe<TransformationViewFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type StageFilter = {
  AND?: InputMaybe<StageFilter>;
  OR?: InputMaybe<StageFilter>;
  id?: InputMaybe<Scalars['ID']>;
  kind?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<StrFilterLookup>;
  provenance?: InputMaybe<ProvenanceFilter>;
};

export type StageInput = {
  instrument?: InputMaybe<Scalars['ID']>;
  name: Scalars['String'];
};

export type StrFilterLookup = {
  contains?: InputMaybe<Scalars['String']>;
  endsWith?: InputMaybe<Scalars['String']>;
  exact?: InputMaybe<Scalars['String']>;
  gt?: InputMaybe<Scalars['String']>;
  gte?: InputMaybe<Scalars['String']>;
  iContains?: InputMaybe<Scalars['String']>;
  iEndsWith?: InputMaybe<Scalars['String']>;
  iExact?: InputMaybe<Scalars['String']>;
  iRegex?: InputMaybe<Scalars['String']>;
  iStartsWith?: InputMaybe<Scalars['String']>;
  inList?: InputMaybe<Array<Scalars['String']>>;
  isNull?: InputMaybe<Scalars['Boolean']>;
  lt?: InputMaybe<Scalars['String']>;
  lte?: InputMaybe<Scalars['String']>;
  nContains?: InputMaybe<Scalars['String']>;
  nEndsWith?: InputMaybe<Scalars['String']>;
  nExact?: InputMaybe<Scalars['String']>;
  nGt?: InputMaybe<Scalars['String']>;
  nGte?: InputMaybe<Scalars['String']>;
  nIContains?: InputMaybe<Scalars['String']>;
  nIEndsWith?: InputMaybe<Scalars['String']>;
  nIExact?: InputMaybe<Scalars['String']>;
  nIRegex?: InputMaybe<Scalars['String']>;
  nIStartsWith?: InputMaybe<Scalars['String']>;
  nInList?: InputMaybe<Array<Scalars['String']>>;
  nIsNull?: InputMaybe<Scalars['Boolean']>;
  nLt?: InputMaybe<Scalars['String']>;
  nLte?: InputMaybe<Scalars['String']>;
  nRange?: InputMaybe<Array<Scalars['String']>>;
  nRegex?: InputMaybe<Scalars['String']>;
  nStartsWith?: InputMaybe<Scalars['String']>;
  range?: InputMaybe<Array<Scalars['String']>>;
  regex?: InputMaybe<Scalars['String']>;
  startsWith?: InputMaybe<Scalars['String']>;
};

export type Subscription = {
  __typename?: 'Subscription';
  historyEvents: Image;
};


export type SubscriptionHistoryEventsArgs = {
  user: Scalars['String'];
};

export type Table = {
  __typename?: 'Table';
  id: Scalars['ID'];
  name: Scalars['String'];
  origins: Array<Image>;
  store: ParquetStore;
};


export type TableOriginsArgs = {
  filters?: InputMaybe<ImageFilter>;
  order?: InputMaybe<ImageOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type TimepointView = View & {
  __typename?: 'TimepointView';
  /** The accessor */
  accessor: Array<Scalars['String']>;
  cMax?: Maybe<Scalars['Int']>;
  cMin?: Maybe<Scalars['Int']>;
  era: Era;
  id: Scalars['ID'];
  image: Image;
  indexSinceStart?: Maybe<Scalars['Int']>;
  isGlobal: Scalars['Boolean'];
  msSinceStart?: Maybe<Scalars['Milliseconds']>;
  tMax?: Maybe<Scalars['Int']>;
  tMin?: Maybe<Scalars['Int']>;
  xMax?: Maybe<Scalars['Int']>;
  xMin?: Maybe<Scalars['Int']>;
  yMax?: Maybe<Scalars['Int']>;
  yMin?: Maybe<Scalars['Int']>;
  zMax?: Maybe<Scalars['Int']>;
  zMin?: Maybe<Scalars['Int']>;
};

export type TimepointViewFilter = {
  AND?: InputMaybe<TimepointViewFilter>;
  OR?: InputMaybe<TimepointViewFilter>;
  era?: InputMaybe<EraFilter>;
  indexSinceStart?: InputMaybe<Scalars['Int']>;
  isGlobal?: InputMaybe<Scalars['Boolean']>;
  msSinceStart?: InputMaybe<Scalars['Float']>;
  provenance?: InputMaybe<ProvenanceFilter>;
};

export type TimepointViewInput = {
  cMax?: InputMaybe<Scalars['Int']>;
  cMin?: InputMaybe<Scalars['Int']>;
  collection?: InputMaybe<Scalars['ID']>;
  era?: InputMaybe<Scalars['ID']>;
  image: Scalars['ID'];
  indexSinceStart?: InputMaybe<Scalars['Int']>;
  msSinceStart?: InputMaybe<Scalars['Milliseconds']>;
  tMax?: InputMaybe<Scalars['Int']>;
  tMin?: InputMaybe<Scalars['Int']>;
  xMax?: InputMaybe<Scalars['Int']>;
  xMin?: InputMaybe<Scalars['Int']>;
  yMax?: InputMaybe<Scalars['Int']>;
  yMin?: InputMaybe<Scalars['Int']>;
  zMax?: InputMaybe<Scalars['Int']>;
  zMin?: InputMaybe<Scalars['Int']>;
};

export enum TransformationKind {
  Affine = 'AFFINE',
  NonAffine = 'NON_AFFINE'
}

export type TransformationView = View & {
  __typename?: 'TransformationView';
  /** The accessor */
  accessor: Array<Scalars['String']>;
  cMax?: Maybe<Scalars['Int']>;
  cMin?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
  image: Image;
  isGlobal: Scalars['Boolean'];
  kind: TransformationKind;
  matrix: Scalars['FourByFourMatrix'];
  pixelSize: Scalars['ThreeDVector'];
  pixelSizeX: Scalars['Micrometers'];
  pixelSizeY: Scalars['Micrometers'];
  position: Scalars['ThreeDVector'];
  stage: Stage;
  tMax?: Maybe<Scalars['Int']>;
  tMin?: Maybe<Scalars['Int']>;
  xMax?: Maybe<Scalars['Int']>;
  xMin?: Maybe<Scalars['Int']>;
  yMax?: Maybe<Scalars['Int']>;
  yMin?: Maybe<Scalars['Int']>;
  zMax?: Maybe<Scalars['Int']>;
  zMin?: Maybe<Scalars['Int']>;
};

export type TransformationViewFilter = {
  AND?: InputMaybe<TransformationViewFilter>;
  OR?: InputMaybe<TransformationViewFilter>;
  isGlobal?: InputMaybe<Scalars['Boolean']>;
  pixelSize?: InputMaybe<FloatFilterLookup>;
  provenance?: InputMaybe<ProvenanceFilter>;
  stage?: InputMaybe<StageFilter>;
};

export type User = {
  __typename?: 'User';
  email: Scalars['String'];
  id: Scalars['ID'];
  password: Scalars['String'];
  sub: Scalars['String'];
  username: Scalars['String'];
};

export type UserFilter = {
  AND?: InputMaybe<UserFilter>;
  OR?: InputMaybe<UserFilter>;
  username: StrFilterLookup;
};

export type Video = Render & {
  __typename?: 'Video';
  createdAt: Scalars['DateTime'];
  creator?: Maybe<User>;
  id: Scalars['ID'];
  store: MediaStore;
  thumbnail: MediaStore;
};

export type View = {
  /** The accessor */
  accessor: Array<Scalars['String']>;
  cMax?: Maybe<Scalars['Int']>;
  cMin?: Maybe<Scalars['Int']>;
  image: Image;
  isGlobal: Scalars['Boolean'];
  tMax?: Maybe<Scalars['Int']>;
  tMin?: Maybe<Scalars['Int']>;
  xMax?: Maybe<Scalars['Int']>;
  xMin?: Maybe<Scalars['Int']>;
  yMax?: Maybe<Scalars['Int']>;
  yMin?: Maybe<Scalars['Int']>;
  zMax?: Maybe<Scalars['Int']>;
  zMin?: Maybe<Scalars['Int']>;
};

export type ViewCollection = {
  __typename?: 'ViewCollection';
  channelViews: Array<ChannelView>;
  history: Array<History>;
  id: Scalars['ID'];
  labelViews: Array<LabelView>;
  name: Scalars['String'];
  transformationViews: Array<TransformationView>;
  views: Array<View>;
};


export type ViewCollectionHistoryArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type ViewCollectionTransformationViewsArgs = {
  filters?: InputMaybe<TransformationViewFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type ViewCollectionInput = {
  name: Scalars['String'];
};

export type ViewFilter = {
  AND?: InputMaybe<ViewFilter>;
  OR?: InputMaybe<ViewFilter>;
  isGlobal?: InputMaybe<Scalars['Boolean']>;
  provenance?: InputMaybe<ProvenanceFilter>;
};

export enum ViewKind {
  Channel = 'CHANNEL',
  Label = 'LABEL',
  Optics = 'OPTICS',
  Timepoint = 'TIMEPOINT',
  Transformation = 'TRANSFORMATION'
}

export type ZarrStore = {
  __typename?: 'ZarrStore';
  bucket: Scalars['String'];
  chunks?: Maybe<Array<Scalars['Int']>>;
  dtype?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  key: Scalars['String'];
  path: Scalars['String'];
  populated: Scalars['Boolean'];
  shape?: Maybe<Array<Scalars['Int']>>;
};

export type ZarrStoreFilter = {
  AND?: InputMaybe<ZarrStoreFilter>;
  OR?: InputMaybe<ZarrStoreFilter>;
  shape?: InputMaybe<IntFilterLookup>;
};

export type AntibodyFragment = { __typename?: 'Antibody', name: string, epitope?: string | null };

export type CameraFragment = { __typename?: 'Camera', sensorSizeX?: number | null, sensorSizeY?: number | null, pixelSizeX?: any | null, pixelSizeY?: any | null, name: string, serialNumber: string };

export type ChannelFragment = { __typename?: 'Channel', id: string, name: string, excitationWavelength?: number | null };

export type CredentialsFragment = { __typename?: 'Credentials', accessKey: string, status: string, secretKey: string, bucket: string, key: string, sessionToken: string, store: string };

export type AccessCredentialsFragment = { __typename?: 'AccessCredentials', accessKey: string, secretKey: string, bucket: string, key: string, sessionToken: string, path: string };

export type DatasetFragment = { __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean, pinned: boolean, createdAt: any, tags: Array<string>, history: Array<{ __typename?: 'History', id: string, during?: string | null, kind: HistoryKind, date: any }>, images: Array<{ __typename?: 'Image', id: string, name: string, latestSnapshot?: { __typename?: 'Snapshot', id: string, store: { __typename?: 'MediaStore', key: string, presignedUrl: string } } | null }>, files: Array<{ __typename?: 'File', id: string, name: string }>, children: Array<{ __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean }>, creator?: { __typename?: 'User', sub: string } | null };

export type ListDatasetFragment = { __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean };

export type EraFragment = { __typename?: 'Era', id: string, begin?: any | null, name: string };

export type FileFragment = { __typename?: 'File', id: string, name: string, origins: Array<{ __typename?: 'Image', id: string }>, store: { __typename?: 'BigFileStore', id: string, key: string, bucket: string, path: string } };

export type ListFileFragment = { __typename?: 'File', id: string, name: string };

export type FluorophoreFragment = { __typename?: 'Fluorophore', name: string, emissionWavelength?: any | null, excitationWavelength?: any | null };

export type HistoryFragment = { __typename?: 'History', id: string, during?: string | null, kind: HistoryKind, date: any };

export type ImageFragment = { __typename?: 'Image', id: string, name: string, pinned: boolean, createdAt: any, tags: Array<string>, origins: Array<{ __typename?: 'Image', id: string }>, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape?: Array<number> | null, dtype?: string | null }, views: Array<{ __typename?: 'ChannelView', id: string, zMin?: number | null, zMax?: number | null, channel: { __typename?: 'Channel', id: string, name: string, excitationWavelength?: number | null } } | { __typename?: 'LabelView', id: string, zMin?: number | null, zMax?: number | null, fluorophore: { __typename?: 'Fluorophore', name: string, emissionWavelength?: any | null, excitationWavelength?: any | null }, primaryAntibody?: { __typename?: 'Antibody', name: string, epitope?: string | null } | null, secondaryAntibody?: { __typename?: 'Antibody', name: string, epitope?: string | null } | null } | { __typename?: 'OpticsView', id: string, zMin?: number | null, zMax?: number | null, objective?: { __typename?: 'Objective', id: string, name: string, serialNumber: string } | null, camera?: { __typename?: 'Camera', id: string, name: string, serialNumber: string } | null, instrument?: { __typename?: 'Instrument', id: string, name: string, serialNumber: string } | null } | { __typename?: 'TimepointView', id: string, msSinceStart?: any | null, indexSinceStart?: number | null, zMin?: number | null, zMax?: number | null, era: { __typename?: 'Era', id: string, begin?: any | null, name: string } } | { __typename?: 'TransformationView', id: string, kind: TransformationKind, matrix: any, zMin?: number | null, zMax?: number | null, stage: { __typename?: 'Stage', id: string } }>, renders: Array<{ __typename?: 'Snapshot', id: string, store: { __typename?: 'MediaStore', key: string, presignedUrl: string } } | { __typename?: 'Video', id: string, store: { __typename?: 'MediaStore', key: string, presignedUrl: string } }>, dataset?: { __typename?: 'Dataset', name: string, id: string } | null, history: Array<{ __typename?: 'History', id: string, during?: string | null, kind: HistoryKind, date: any }>, creator?: { __typename?: 'User', sub: string } | null, metrics: Array<{ __typename?: 'ImageIntMetric', id: string, value: number }>, roiOrigins: Array<never>, fileOrigins: Array<{ __typename?: 'File', id: string, name: string }> };

export type ListImageFragment = { __typename?: 'Image', id: string, name: string, latestSnapshot?: { __typename?: 'Snapshot', id: string, store: { __typename?: 'MediaStore', key: string, presignedUrl: string } } | null };

export type InstrumentFragment = { __typename?: 'Instrument', model?: string | null, name: string, serialNumber: string };

export type ImageIntMetricFragment = { __typename?: 'ImageIntMetric', id: string, value: number };

export type ImageMetricFragment = { __typename?: 'ImageIntMetric', id: string, value: number };

export type ObjectiveFragment = { __typename?: 'Objective', na?: number | null, name: string, serialNumber: string };

export type ListRoiFragment = {};

export type SnapshotFragment = { __typename?: 'Snapshot', id: string, store: { __typename?: 'MediaStore', key: string, presignedUrl: string } };

export type StageFragment = { __typename?: 'Stage', id: string, pinned: boolean, name: string, views: Array<{ __typename?: 'TransformationView', id: string, kind: TransformationKind, matrix: any, zMin?: number | null, zMax?: number | null, stage: { __typename?: 'Stage', id: string } }> };

export type ListStageFragment = { __typename?: 'Stage', id: string, name: string };

export type ZarrStoreFragment = { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape?: Array<number> | null, dtype?: string | null };

export type ParquetStoreFragment = { __typename?: 'ParquetStore', id: string, key: string, bucket: string, path: string };

export type BigFileStoreFragment = { __typename?: 'BigFileStore', id: string, key: string, bucket: string, path: string };

export type TableFragment = { __typename?: 'Table', id: string, name: string, origins: Array<{ __typename?: 'Image', id: string }>, store: { __typename?: 'ParquetStore', id: string, key: string, bucket: string, path: string } };

export type VideoFragment = { __typename?: 'Video', id: string, store: { __typename?: 'MediaStore', key: string, presignedUrl: string } };

type View_ChannelView_Fragment = { __typename?: 'ChannelView', zMin?: number | null, zMax?: number | null };

type View_LabelView_Fragment = { __typename?: 'LabelView', zMin?: number | null, zMax?: number | null };

type View_OpticsView_Fragment = { __typename?: 'OpticsView', zMin?: number | null, zMax?: number | null };

type View_TimepointView_Fragment = { __typename?: 'TimepointView', zMin?: number | null, zMax?: number | null };

type View_TransformationView_Fragment = { __typename?: 'TransformationView', zMin?: number | null, zMax?: number | null };

export type ViewFragment = View_ChannelView_Fragment | View_LabelView_Fragment | View_OpticsView_Fragment | View_TimepointView_Fragment | View_TransformationView_Fragment;

export type ChannelViewFragment = { __typename?: 'ChannelView', id: string, zMin?: number | null, zMax?: number | null, channel: { __typename?: 'Channel', id: string, name: string, excitationWavelength?: number | null } };

export type TransformationViewFragment = { __typename?: 'TransformationView', id: string, kind: TransformationKind, matrix: any, zMin?: number | null, zMax?: number | null, stage: { __typename?: 'Stage', id: string } };

export type TimepointViewFragment = { __typename?: 'TimepointView', id: string, msSinceStart?: any | null, indexSinceStart?: number | null, zMin?: number | null, zMax?: number | null, era: { __typename?: 'Era', id: string, begin?: any | null, name: string } };

export type OpticsViewFragment = { __typename?: 'OpticsView', id: string, zMin?: number | null, zMax?: number | null, objective?: { __typename?: 'Objective', id: string, name: string, serialNumber: string } | null, camera?: { __typename?: 'Camera', id: string, name: string, serialNumber: string } | null, instrument?: { __typename?: 'Instrument', id: string, name: string, serialNumber: string } | null };

export type LabelViewFragment = { __typename?: 'LabelView', id: string, zMin?: number | null, zMax?: number | null, fluorophore: { __typename?: 'Fluorophore', name: string, emissionWavelength?: any | null, excitationWavelength?: any | null }, primaryAntibody?: { __typename?: 'Antibody', name: string, epitope?: string | null } | null, secondaryAntibody?: { __typename?: 'Antibody', name: string, epitope?: string | null } | null };

export type CreateAntibodyMutationVariables = Exact<{
  name: Scalars['String'];
  epitope?: InputMaybe<Scalars['String']>;
}>;


export type CreateAntibodyMutation = { __typename?: 'Mutation', createAntibody: { __typename?: 'Antibody', id: string, name: string } };

export type EnsureAntibodyMutationVariables = Exact<{
  name: Scalars['String'];
  epitope?: InputMaybe<Scalars['String']>;
}>;


export type EnsureAntibodyMutation = { __typename?: 'Mutation', ensureAntibody: { __typename?: 'Antibody', id: string, name: string } };

export type CreateCameraMutationVariables = Exact<{
  serialNumber: Scalars['String'];
  name?: InputMaybe<Scalars['String']>;
  pixelSizeX?: InputMaybe<Scalars['Micrometers']>;
  pixelSizeY?: InputMaybe<Scalars['Micrometers']>;
  sensorSizeX?: InputMaybe<Scalars['Int']>;
  sensorSizeY?: InputMaybe<Scalars['Int']>;
}>;


export type CreateCameraMutation = { __typename?: 'Mutation', createCamera: { __typename?: 'Camera', id: string, name: string } };

export type EnsureCameraMutationVariables = Exact<{
  serialNumber: Scalars['String'];
  name?: InputMaybe<Scalars['String']>;
  pixelSizeX?: InputMaybe<Scalars['Micrometers']>;
  pixelSizeY?: InputMaybe<Scalars['Micrometers']>;
  sensorSizeX?: InputMaybe<Scalars['Int']>;
  sensorSizeY?: InputMaybe<Scalars['Int']>;
}>;


export type EnsureCameraMutation = { __typename?: 'Mutation', ensureCamera: { __typename?: 'Camera', id: string, name: string } };

export type CreateChannelMutationVariables = Exact<{
  name: Scalars['String'];
}>;


export type CreateChannelMutation = { __typename?: 'Mutation', createChannel: { __typename?: 'Channel', id: string, name: string } };

export type EnsureChannelMutationVariables = Exact<{
  name: Scalars['String'];
}>;


export type EnsureChannelMutation = { __typename?: 'Mutation', ensureChannel: { __typename?: 'Channel', id: string, name: string } };

export type CreateDatasetMutationVariables = Exact<{
  name: Scalars['String'];
}>;


export type CreateDatasetMutation = { __typename?: 'Mutation', createDataset: { __typename?: 'Dataset', id: string, name: string } };

export type UpdateDatasetMutationVariables = Exact<{
  id: Scalars['ID'];
  name: Scalars['String'];
}>;


export type UpdateDatasetMutation = { __typename?: 'Mutation', updateDataset: { __typename?: 'Dataset', id: string, name: string } };

export type PinDatasetMutationVariables = Exact<{
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
}>;


export type PinDatasetMutation = { __typename?: 'Mutation', pinDataset: { __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean, pinned: boolean, createdAt: any, tags: Array<string>, history: Array<{ __typename?: 'History', id: string, during?: string | null, kind: HistoryKind, date: any }>, images: Array<{ __typename?: 'Image', id: string, name: string, latestSnapshot?: { __typename?: 'Snapshot', id: string, store: { __typename?: 'MediaStore', key: string, presignedUrl: string } } | null }>, files: Array<{ __typename?: 'File', id: string, name: string }>, children: Array<{ __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean }>, creator?: { __typename?: 'User', sub: string } | null } };

export type PutDatasetsInDatasetMutationVariables = Exact<{
  selfs: Array<Scalars['ID']>;
  other: Scalars['ID'];
}>;


export type PutDatasetsInDatasetMutation = { __typename?: 'Mutation', putDatasetsInDataset: { __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean, pinned: boolean, createdAt: any, tags: Array<string>, history: Array<{ __typename?: 'History', id: string, during?: string | null, kind: HistoryKind, date: any }>, images: Array<{ __typename?: 'Image', id: string, name: string, latestSnapshot?: { __typename?: 'Snapshot', id: string, store: { __typename?: 'MediaStore', key: string, presignedUrl: string } } | null }>, files: Array<{ __typename?: 'File', id: string, name: string }>, children: Array<{ __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean }>, creator?: { __typename?: 'User', sub: string } | null } };

export type ReleaseDatasetsFromDatasetMutationVariables = Exact<{
  selfs: Array<Scalars['ID']>;
  other: Scalars['ID'];
}>;


export type ReleaseDatasetsFromDatasetMutation = { __typename?: 'Mutation', releaseDatasetsFromDataset: { __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean, pinned: boolean, createdAt: any, tags: Array<string>, history: Array<{ __typename?: 'History', id: string, during?: string | null, kind: HistoryKind, date: any }>, images: Array<{ __typename?: 'Image', id: string, name: string, latestSnapshot?: { __typename?: 'Snapshot', id: string, store: { __typename?: 'MediaStore', key: string, presignedUrl: string } } | null }>, files: Array<{ __typename?: 'File', id: string, name: string }>, children: Array<{ __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean }>, creator?: { __typename?: 'User', sub: string } | null } };

export type PutImagesInDatasetMutationVariables = Exact<{
  selfs: Array<Scalars['ID']>;
  other: Scalars['ID'];
}>;


export type PutImagesInDatasetMutation = { __typename?: 'Mutation', putImagesInDataset: { __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean, pinned: boolean, createdAt: any, tags: Array<string>, history: Array<{ __typename?: 'History', id: string, during?: string | null, kind: HistoryKind, date: any }>, images: Array<{ __typename?: 'Image', id: string, name: string, latestSnapshot?: { __typename?: 'Snapshot', id: string, store: { __typename?: 'MediaStore', key: string, presignedUrl: string } } | null }>, files: Array<{ __typename?: 'File', id: string, name: string }>, children: Array<{ __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean }>, creator?: { __typename?: 'User', sub: string } | null } };

export type ReleaseImagesFromDatasetMutationVariables = Exact<{
  selfs: Array<Scalars['ID']>;
  other: Scalars['ID'];
}>;


export type ReleaseImagesFromDatasetMutation = { __typename?: 'Mutation', releaseImagesFromDataset: { __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean, pinned: boolean, createdAt: any, tags: Array<string>, history: Array<{ __typename?: 'History', id: string, during?: string | null, kind: HistoryKind, date: any }>, images: Array<{ __typename?: 'Image', id: string, name: string, latestSnapshot?: { __typename?: 'Snapshot', id: string, store: { __typename?: 'MediaStore', key: string, presignedUrl: string } } | null }>, files: Array<{ __typename?: 'File', id: string, name: string }>, children: Array<{ __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean }>, creator?: { __typename?: 'User', sub: string } | null } };

export type PutFilesInDatasetMutationVariables = Exact<{
  selfs: Array<Scalars['ID']>;
  other: Scalars['ID'];
}>;


export type PutFilesInDatasetMutation = { __typename?: 'Mutation', putFilesInDataset: { __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean, pinned: boolean, createdAt: any, tags: Array<string>, history: Array<{ __typename?: 'History', id: string, during?: string | null, kind: HistoryKind, date: any }>, images: Array<{ __typename?: 'Image', id: string, name: string, latestSnapshot?: { __typename?: 'Snapshot', id: string, store: { __typename?: 'MediaStore', key: string, presignedUrl: string } } | null }>, files: Array<{ __typename?: 'File', id: string, name: string }>, children: Array<{ __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean }>, creator?: { __typename?: 'User', sub: string } | null } };

export type ReleaseFilesFromDatasetMutationVariables = Exact<{
  selfs: Array<Scalars['ID']>;
  other: Scalars['ID'];
}>;


export type ReleaseFilesFromDatasetMutation = { __typename?: 'Mutation', releaseFilesFromDataset: { __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean, pinned: boolean, createdAt: any, tags: Array<string>, history: Array<{ __typename?: 'History', id: string, during?: string | null, kind: HistoryKind, date: any }>, images: Array<{ __typename?: 'Image', id: string, name: string, latestSnapshot?: { __typename?: 'Snapshot', id: string, store: { __typename?: 'MediaStore', key: string, presignedUrl: string } } | null }>, files: Array<{ __typename?: 'File', id: string, name: string }>, children: Array<{ __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean }>, creator?: { __typename?: 'User', sub: string } | null } };

export type RevertDatasetMutationVariables = Exact<{
  dataset: Scalars['ID'];
  history: Scalars['ID'];
}>;


export type RevertDatasetMutation = { __typename?: 'Mutation', revertDataset: { __typename?: 'Dataset', id: string, name: string, description?: string | null } };

export type CreateEraMutationVariables = Exact<{
  name: Scalars['String'];
  begin?: InputMaybe<Scalars['DateTime']>;
}>;


export type CreateEraMutation = { __typename?: 'Mutation', createEra: { __typename?: 'Era', id: string, begin?: any | null } };

export type From_File_LikeMutationVariables = Exact<{
  file: Scalars['FileLike'];
  name: Scalars['String'];
  origins?: InputMaybe<Array<Scalars['ID']>>;
  dataset?: InputMaybe<Scalars['ID']>;
}>;


export type From_File_LikeMutation = { __typename?: 'Mutation', fromFileLike: { __typename?: 'File', id: string, name: string, origins: Array<{ __typename?: 'Image', id: string }>, store: { __typename?: 'BigFileStore', id: string, key: string, bucket: string, path: string } } };

export type RequestFileUploadMutationVariables = Exact<{
  key: Scalars['String'];
  datalayer: Scalars['String'];
}>;


export type RequestFileUploadMutation = { __typename?: 'Mutation', requestFileUpload: { __typename?: 'Credentials', accessKey: string, status: string, secretKey: string, bucket: string, key: string, sessionToken: string, store: string } };

export type RequestFileAccessMutationVariables = Exact<{
  store: Scalars['ID'];
  duration?: InputMaybe<Scalars['Int']>;
}>;


export type RequestFileAccessMutation = { __typename?: 'Mutation', requestFileAccess: { __typename?: 'AccessCredentials', accessKey: string, secretKey: string, bucket: string, key: string, sessionToken: string, path: string } };

export type CreateFluorophoreMutationVariables = Exact<{
  name: Scalars['String'];
  excitationWavelength?: InputMaybe<Scalars['Micrometers']>;
  emissionWavelength?: InputMaybe<Scalars['Micrometers']>;
}>;


export type CreateFluorophoreMutation = { __typename?: 'Mutation', createFluorophore: { __typename?: 'Fluorophore', id: string, name: string } };

export type EnsureFluorophoreMutationVariables = Exact<{
  name: Scalars['String'];
  excitationWavelength?: InputMaybe<Scalars['Micrometers']>;
  emissionWavelength?: InputMaybe<Scalars['Micrometers']>;
}>;


export type EnsureFluorophoreMutation = { __typename?: 'Mutation', ensureFluorophore: { __typename?: 'Fluorophore', id: string, name: string } };

export type From_Array_LikeMutationVariables = Exact<{
  array: Scalars['ArrayLike'];
  name: Scalars['String'];
  origins?: InputMaybe<Array<Scalars['ID']>>;
  channelViews?: InputMaybe<Array<PartialChannelViewInput>>;
  transformationViews?: InputMaybe<Array<PartialTransformationViewInput>>;
  labelViews?: InputMaybe<Array<PartialLabelViewInput>>;
  timepointViews?: InputMaybe<Array<PartialTimepointViewInput>>;
  opticsViews?: InputMaybe<Array<PartialOpticsViewInput>>;
}>;


export type From_Array_LikeMutation = { __typename?: 'Mutation', fromArrayLike: { __typename?: 'Image', id: string, name: string, pinned: boolean, createdAt: any, tags: Array<string>, origins: Array<{ __typename?: 'Image', id: string }>, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape?: Array<number> | null, dtype?: string | null }, views: Array<{ __typename?: 'ChannelView', id: string, zMin?: number | null, zMax?: number | null, channel: { __typename?: 'Channel', id: string, name: string, excitationWavelength?: number | null } } | { __typename?: 'LabelView', id: string, zMin?: number | null, zMax?: number | null, fluorophore: { __typename?: 'Fluorophore', name: string, emissionWavelength?: any | null, excitationWavelength?: any | null }, primaryAntibody?: { __typename?: 'Antibody', name: string, epitope?: string | null } | null, secondaryAntibody?: { __typename?: 'Antibody', name: string, epitope?: string | null } | null } | { __typename?: 'OpticsView', id: string, zMin?: number | null, zMax?: number | null, objective?: { __typename?: 'Objective', id: string, name: string, serialNumber: string } | null, camera?: { __typename?: 'Camera', id: string, name: string, serialNumber: string } | null, instrument?: { __typename?: 'Instrument', id: string, name: string, serialNumber: string } | null } | { __typename?: 'TimepointView', id: string, msSinceStart?: any | null, indexSinceStart?: number | null, zMin?: number | null, zMax?: number | null, era: { __typename?: 'Era', id: string, begin?: any | null, name: string } } | { __typename?: 'TransformationView', id: string, kind: TransformationKind, matrix: any, zMin?: number | null, zMax?: number | null, stage: { __typename?: 'Stage', id: string } }>, renders: Array<{ __typename?: 'Snapshot', id: string, store: { __typename?: 'MediaStore', key: string, presignedUrl: string } } | { __typename?: 'Video', id: string, store: { __typename?: 'MediaStore', key: string, presignedUrl: string } }>, dataset?: { __typename?: 'Dataset', name: string, id: string } | null, history: Array<{ __typename?: 'History', id: string, during?: string | null, kind: HistoryKind, date: any }>, creator?: { __typename?: 'User', sub: string } | null, metrics: Array<{ __typename?: 'ImageIntMetric', id: string, value: number }>, roiOrigins: Array<never>, fileOrigins: Array<{ __typename?: 'File', id: string, name: string }> } };

export type RequestUploadMutationVariables = Exact<{
  key: Scalars['String'];
  datalayer: Scalars['String'];
}>;


export type RequestUploadMutation = { __typename?: 'Mutation', requestUpload: { __typename?: 'Credentials', accessKey: string, status: string, secretKey: string, bucket: string, key: string, sessionToken: string, store: string } };

export type RequestAccessMutationVariables = Exact<{
  store: Scalars['ID'];
  duration?: InputMaybe<Scalars['Int']>;
}>;


export type RequestAccessMutation = { __typename?: 'Mutation', requestAccess: { __typename?: 'AccessCredentials', accessKey: string, secretKey: string, bucket: string, key: string, sessionToken: string, path: string } };

export type PinImageMutationVariables = Exact<{
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
}>;


export type PinImageMutation = { __typename?: 'Mutation', pinImage: { __typename?: 'Image', id: string, name: string, pinned: boolean, createdAt: any, tags: Array<string>, origins: Array<{ __typename?: 'Image', id: string }>, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape?: Array<number> | null, dtype?: string | null }, views: Array<{ __typename?: 'ChannelView', id: string, zMin?: number | null, zMax?: number | null, channel: { __typename?: 'Channel', id: string, name: string, excitationWavelength?: number | null } } | { __typename?: 'LabelView', id: string, zMin?: number | null, zMax?: number | null, fluorophore: { __typename?: 'Fluorophore', name: string, emissionWavelength?: any | null, excitationWavelength?: any | null }, primaryAntibody?: { __typename?: 'Antibody', name: string, epitope?: string | null } | null, secondaryAntibody?: { __typename?: 'Antibody', name: string, epitope?: string | null } | null } | { __typename?: 'OpticsView', id: string, zMin?: number | null, zMax?: number | null, objective?: { __typename?: 'Objective', id: string, name: string, serialNumber: string } | null, camera?: { __typename?: 'Camera', id: string, name: string, serialNumber: string } | null, instrument?: { __typename?: 'Instrument', id: string, name: string, serialNumber: string } | null } | { __typename?: 'TimepointView', id: string, msSinceStart?: any | null, indexSinceStart?: number | null, zMin?: number | null, zMax?: number | null, era: { __typename?: 'Era', id: string, begin?: any | null, name: string } } | { __typename?: 'TransformationView', id: string, kind: TransformationKind, matrix: any, zMin?: number | null, zMax?: number | null, stage: { __typename?: 'Stage', id: string } }>, renders: Array<{ __typename?: 'Snapshot', id: string, store: { __typename?: 'MediaStore', key: string, presignedUrl: string } } | { __typename?: 'Video', id: string, store: { __typename?: 'MediaStore', key: string, presignedUrl: string } }>, dataset?: { __typename?: 'Dataset', name: string, id: string } | null, history: Array<{ __typename?: 'History', id: string, during?: string | null, kind: HistoryKind, date: any }>, creator?: { __typename?: 'User', sub: string } | null, metrics: Array<{ __typename?: 'ImageIntMetric', id: string, value: number }>, roiOrigins: Array<never>, fileOrigins: Array<{ __typename?: 'File', id: string, name: string }> } };

export type CreateInstrumentMutationVariables = Exact<{
  serialNumber: Scalars['String'];
  name?: InputMaybe<Scalars['String']>;
  model?: InputMaybe<Scalars['String']>;
}>;


export type CreateInstrumentMutation = { __typename?: 'Mutation', createInstrument: { __typename?: 'Instrument', id: string, name: string } };

export type EnsureInstrumentMutationVariables = Exact<{
  serialNumber: Scalars['String'];
  name?: InputMaybe<Scalars['String']>;
  model?: InputMaybe<Scalars['String']>;
}>;


export type EnsureInstrumentMutation = { __typename?: 'Mutation', ensureInstrument: { __typename?: 'Instrument', id: string, name: string } };

export type CreateObjectiveMutationVariables = Exact<{
  serialNumber: Scalars['String'];
  name?: InputMaybe<Scalars['String']>;
  na?: InputMaybe<Scalars['Float']>;
  magnification?: InputMaybe<Scalars['Float']>;
}>;


export type CreateObjectiveMutation = { __typename?: 'Mutation', createObjective: { __typename?: 'Objective', id: string, name: string } };

export type EnsureObjectiveMutationVariables = Exact<{
  serialNumber: Scalars['String'];
  name?: InputMaybe<Scalars['String']>;
  na?: InputMaybe<Scalars['Float']>;
  magnification?: InputMaybe<Scalars['Float']>;
}>;


export type EnsureObjectiveMutation = { __typename?: 'Mutation', ensureObjective: { __typename?: 'Objective', id: string, name: string } };

export type CreateSnapshotMutationVariables = Exact<{
  image: Scalars['ID'];
  file: Scalars['Upload'];
}>;


export type CreateSnapshotMutation = { __typename?: 'Mutation', createSnapshot: { __typename?: 'Snapshot', id: string, store: { __typename?: 'MediaStore', key: string, presignedUrl: string } } };

export type CreateStageMutationVariables = Exact<{
  name: Scalars['String'];
}>;


export type CreateStageMutation = { __typename?: 'Mutation', createStage: { __typename?: 'Stage', id: string, name: string } };

export type PinStageMutationVariables = Exact<{
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
}>;


export type PinStageMutation = { __typename?: 'Mutation', pinStage: { __typename?: 'Stage', id: string, pinned: boolean, name: string, views: Array<{ __typename?: 'TransformationView', id: string, kind: TransformationKind, matrix: any, zMin?: number | null, zMax?: number | null, stage: { __typename?: 'Stage', id: string } }> } };

export type From_Parquet_LikeMutationVariables = Exact<{
  dataframe: Scalars['ParquetLike'];
  name: Scalars['String'];
  origins?: InputMaybe<Array<Scalars['ID']>>;
  dataset?: InputMaybe<Scalars['ID']>;
}>;


export type From_Parquet_LikeMutation = { __typename?: 'Mutation', fromParquetLike: { __typename?: 'Table', id: string, name: string, origins: Array<{ __typename?: 'Image', id: string }>, store: { __typename?: 'ParquetStore', id: string, key: string, bucket: string, path: string } } };

export type RequestTableUploadMutationVariables = Exact<{
  key: Scalars['String'];
  datalayer: Scalars['String'];
}>;


export type RequestTableUploadMutation = { __typename?: 'Mutation', requestTableUpload: { __typename?: 'Credentials', accessKey: string, status: string, secretKey: string, bucket: string, key: string, sessionToken: string, store: string } };

export type RequestTableAccessMutationVariables = Exact<{
  store: Scalars['ID'];
  duration?: InputMaybe<Scalars['Int']>;
}>;


export type RequestTableAccessMutation = { __typename?: 'Mutation', requestTableAccess: { __typename?: 'AccessCredentials', accessKey: string, secretKey: string, bucket: string, key: string, sessionToken: string, path: string } };

export type CreateViewCollectionMutationVariables = Exact<{
  name: Scalars['String'];
}>;


export type CreateViewCollectionMutation = { __typename?: 'Mutation', createViewCollection: { __typename?: 'ViewCollection', id: string, name: string } };

export type GetCameraQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetCameraQuery = { __typename?: 'Query', camera: { __typename?: 'Camera', sensorSizeX?: number | null, sensorSizeY?: number | null, pixelSizeX?: any | null, pixelSizeY?: any | null, name: string, serialNumber: string } };

export type GetDatasetQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetDatasetQuery = { __typename?: 'Query', dataset: { __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean, pinned: boolean, createdAt: any, tags: Array<string>, history: Array<{ __typename?: 'History', id: string, during?: string | null, kind: HistoryKind, date: any }>, images: Array<{ __typename?: 'Image', id: string, name: string, latestSnapshot?: { __typename?: 'Snapshot', id: string, store: { __typename?: 'MediaStore', key: string, presignedUrl: string } } | null }>, files: Array<{ __typename?: 'File', id: string, name: string }>, children: Array<{ __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean }>, creator?: { __typename?: 'User', sub: string } | null } };

export type GetDatasetsQueryVariables = Exact<{
  filters?: InputMaybe<DatasetFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type GetDatasetsQuery = { __typename?: 'Query', datasets: Array<{ __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean }> };

export type GetFileQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetFileQuery = { __typename?: 'Query', file: { __typename?: 'File', id: string, name: string, origins: Array<{ __typename?: 'Image', id: string }>, store: { __typename?: 'BigFileStore', id: string, key: string, bucket: string, path: string } } };

export type ImagesQueryVariables = Exact<{ [key: string]: never; }>;


export type ImagesQuery = { __typename?: 'Query', images: Array<{ __typename?: 'Image', id: string }> };

export type GetImageQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetImageQuery = { __typename?: 'Query', image: { __typename?: 'Image', id: string, name: string, pinned: boolean, createdAt: any, tags: Array<string>, origins: Array<{ __typename?: 'Image', id: string }>, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape?: Array<number> | null, dtype?: string | null }, views: Array<{ __typename?: 'ChannelView', id: string, zMin?: number | null, zMax?: number | null, channel: { __typename?: 'Channel', id: string, name: string, excitationWavelength?: number | null } } | { __typename?: 'LabelView', id: string, zMin?: number | null, zMax?: number | null, fluorophore: { __typename?: 'Fluorophore', name: string, emissionWavelength?: any | null, excitationWavelength?: any | null }, primaryAntibody?: { __typename?: 'Antibody', name: string, epitope?: string | null } | null, secondaryAntibody?: { __typename?: 'Antibody', name: string, epitope?: string | null } | null } | { __typename?: 'OpticsView', id: string, zMin?: number | null, zMax?: number | null, objective?: { __typename?: 'Objective', id: string, name: string, serialNumber: string } | null, camera?: { __typename?: 'Camera', id: string, name: string, serialNumber: string } | null, instrument?: { __typename?: 'Instrument', id: string, name: string, serialNumber: string } | null } | { __typename?: 'TimepointView', id: string, msSinceStart?: any | null, indexSinceStart?: number | null, zMin?: number | null, zMax?: number | null, era: { __typename?: 'Era', id: string, begin?: any | null, name: string } } | { __typename?: 'TransformationView', id: string, kind: TransformationKind, matrix: any, zMin?: number | null, zMax?: number | null, stage: { __typename?: 'Stage', id: string } }>, renders: Array<{ __typename?: 'Snapshot', id: string, store: { __typename?: 'MediaStore', key: string, presignedUrl: string } } | { __typename?: 'Video', id: string, store: { __typename?: 'MediaStore', key: string, presignedUrl: string } }>, dataset?: { __typename?: 'Dataset', name: string, id: string } | null, history: Array<{ __typename?: 'History', id: string, during?: string | null, kind: HistoryKind, date: any }>, creator?: { __typename?: 'User', sub: string } | null, metrics: Array<{ __typename?: 'ImageIntMetric', id: string, value: number }>, roiOrigins: Array<never>, fileOrigins: Array<{ __typename?: 'File', id: string, name: string }> } };

export type GetImagesQueryVariables = Exact<{
  filters?: InputMaybe<ImageFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type GetImagesQuery = { __typename?: 'Query', images: Array<{ __typename?: 'Image', id: string, name: string, latestSnapshot?: { __typename?: 'Snapshot', id: string, store: { __typename?: 'MediaStore', key: string, presignedUrl: string } } | null }> };

export type GetInstrumentQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetInstrumentQuery = { __typename?: 'Query', instrument: { __typename?: 'Instrument', model?: string | null, name: string, serialNumber: string } };

export type GetObjectiveQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetObjectiveQuery = { __typename?: 'Query', objective: { __typename?: 'Objective', na?: number | null, name: string, serialNumber: string } };

export type GetStageQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetStageQuery = { __typename?: 'Query', stage: { __typename?: 'Stage', id: string, pinned: boolean, name: string, views: Array<{ __typename?: 'TransformationView', id: string, kind: TransformationKind, matrix: any, zMin?: number | null, zMax?: number | null, stage: { __typename?: 'Stage', id: string } }> } };

export type GetStagesQueryVariables = Exact<{
  filters?: InputMaybe<StageFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type GetStagesQuery = { __typename?: 'Query', stages: Array<{ __typename?: 'Stage', id: string, name: string }> };

export type GetTableQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetTableQuery = { __typename?: 'Query', table: { __typename?: 'Table', id: string, name: string, origins: Array<{ __typename?: 'Image', id: string }>, store: { __typename?: 'ParquetStore', id: string, key: string, bucket: string, path: string } } };

export const CameraFragmentDoc = gql`
    fragment Camera on Camera {
  sensorSizeX
  sensorSizeY
  pixelSizeX
  pixelSizeY
  name
  serialNumber
}
    `;
export const CredentialsFragmentDoc = gql`
    fragment Credentials on Credentials {
  accessKey
  status
  secretKey
  bucket
  key
  sessionToken
  store
}
    `;
export const AccessCredentialsFragmentDoc = gql`
    fragment AccessCredentials on AccessCredentials {
  accessKey
  secretKey
  bucket
  key
  sessionToken
  path
}
    `;
export const HistoryFragmentDoc = gql`
    fragment History on History {
  id
  during
  kind
  date
}
    `;
export const ListImageFragmentDoc = gql`
    fragment ListImage on Image {
  latestSnapshot {
    id
    store {
      key
      presignedUrl
    }
  }
  id
  name
}
    `;
export const ListFileFragmentDoc = gql`
    fragment ListFile on File {
  id
  name
}
    `;
export const ListDatasetFragmentDoc = gql`
    fragment ListDataset on Dataset {
  id
  name
  description
  isDefault
}
    `;
export const DatasetFragmentDoc = gql`
    fragment Dataset on Dataset {
  id
  name
  description
  history {
    ...History
  }
  images {
    ...ListImage
  }
  files {
    ...ListFile
  }
  children {
    ...ListDataset
  }
  isDefault
  pinned
  createdAt
  creator {
    sub
  }
  tags
}
    ${HistoryFragmentDoc}
${ListImageFragmentDoc}
${ListFileFragmentDoc}
${ListDatasetFragmentDoc}`;
export const BigFileStoreFragmentDoc = gql`
    fragment BigFileStore on BigFileStore {
  id
  key
  bucket
  path
}
    `;
export const FileFragmentDoc = gql`
    fragment File on File {
  origins {
    id
  }
  id
  name
  store {
    ...BigFileStore
  }
}
    ${BigFileStoreFragmentDoc}`;
export const ZarrStoreFragmentDoc = gql`
    fragment ZarrStore on ZarrStore {
  id
  key
  bucket
  path
  shape
  dtype
}
    `;
export const ViewFragmentDoc = gql`
    fragment View on View {
  zMin
  zMax
}
    `;
export const ChannelFragmentDoc = gql`
    fragment Channel on Channel {
  id
  name
  excitationWavelength
}
    `;
export const ChannelViewFragmentDoc = gql`
    fragment ChannelView on ChannelView {
  ...View
  id
  channel {
    ...Channel
  }
}
    ${ViewFragmentDoc}
${ChannelFragmentDoc}`;
export const TransformationViewFragmentDoc = gql`
    fragment TransformationView on TransformationView {
  ...View
  id
  kind
  matrix
  stage {
    id
  }
}
    ${ViewFragmentDoc}`;
export const FluorophoreFragmentDoc = gql`
    fragment Fluorophore on Fluorophore {
  name
  emissionWavelength
  excitationWavelength
}
    `;
export const AntibodyFragmentDoc = gql`
    fragment Antibody on Antibody {
  name
  epitope
}
    `;
export const LabelViewFragmentDoc = gql`
    fragment LabelView on LabelView {
  ...View
  id
  fluorophore {
    ...Fluorophore
  }
  primaryAntibody {
    ...Antibody
  }
  secondaryAntibody {
    ...Antibody
  }
}
    ${ViewFragmentDoc}
${FluorophoreFragmentDoc}
${AntibodyFragmentDoc}`;
export const EraFragmentDoc = gql`
    fragment Era on Era {
  id
  begin
  name
}
    `;
export const TimepointViewFragmentDoc = gql`
    fragment TimepointView on TimepointView {
  ...View
  id
  msSinceStart
  indexSinceStart
  era {
    ...Era
  }
}
    ${ViewFragmentDoc}
${EraFragmentDoc}`;
export const OpticsViewFragmentDoc = gql`
    fragment OpticsView on OpticsView {
  ...View
  id
  objective {
    id
    name
    serialNumber
  }
  camera {
    id
    name
    serialNumber
  }
  instrument {
    id
    name
    serialNumber
  }
}
    ${ViewFragmentDoc}`;
export const SnapshotFragmentDoc = gql`
    fragment Snapshot on Snapshot {
  id
  store {
    key
    presignedUrl
  }
}
    `;
export const VideoFragmentDoc = gql`
    fragment Video on Video {
  id
  store {
    key
    presignedUrl
  }
}
    `;
export const ImageIntMetricFragmentDoc = gql`
    fragment ImageIntMetric on ImageIntMetric {
  id
  value
}
    `;
export const ImageMetricFragmentDoc = gql`
    fragment ImageMetric on ImageMetric {
  ...ImageIntMetric
}
    ${ImageIntMetricFragmentDoc}`;
export const ListRoiFragmentDoc = gql`
    fragment ListROI on ROI {
  id
  image {
    id
    name
  }
}
    `;
export const ImageFragmentDoc = gql`
    fragment Image on Image {
  origins {
    id
  }
  id
  name
  store {
    ...ZarrStore
  }
  views {
    ...ChannelView
    ...TransformationView
    ...LabelView
    ...TimepointView
    ...OpticsView
  }
  pinned
  renders {
    ...Snapshot
    ...Video
  }
  dataset {
    name
    id
  }
  createdAt
  history(pagination: {limit: 3}) {
    ...History
  }
  creator {
    sub
  }
  tags
  metrics {
    ...ImageMetric
  }
  roiOrigins {
    ...ListROI
  }
  fileOrigins {
    ...ListFile
  }
}
    ${ZarrStoreFragmentDoc}
${ChannelViewFragmentDoc}
${TransformationViewFragmentDoc}
${LabelViewFragmentDoc}
${TimepointViewFragmentDoc}
${OpticsViewFragmentDoc}
${SnapshotFragmentDoc}
${VideoFragmentDoc}
${HistoryFragmentDoc}
${ImageMetricFragmentDoc}
${ListRoiFragmentDoc}
${ListFileFragmentDoc}`;
export const InstrumentFragmentDoc = gql`
    fragment Instrument on Instrument {
  model
  name
  serialNumber
}
    `;
export const ObjectiveFragmentDoc = gql`
    fragment Objective on Objective {
  na
  name
  serialNumber
}
    `;
export const StageFragmentDoc = gql`
    fragment Stage on Stage {
  id
  views {
    ...TransformationView
  }
  pinned
  name
}
    ${TransformationViewFragmentDoc}`;
export const ListStageFragmentDoc = gql`
    fragment ListStage on Stage {
  id
  name
}
    `;
export const ParquetStoreFragmentDoc = gql`
    fragment ParquetStore on ParquetStore {
  id
  key
  bucket
  path
}
    `;
export const TableFragmentDoc = gql`
    fragment Table on Table {
  origins {
    id
  }
  id
  name
  store {
    ...ParquetStore
  }
}
    ${ParquetStoreFragmentDoc}`;
export const CreateAntibodyDocument = gql`
    mutation CreateAntibody($name: String!, $epitope: String) {
  createAntibody(input: {name: $name, epitope: $epitope}) {
    id
    name
  }
}
    `;
export type CreateAntibodyMutationFn = Apollo.MutationFunction<CreateAntibodyMutation, CreateAntibodyMutationVariables>;

/**
 * __useCreateAntibodyMutation__
 *
 * To run a mutation, you first call `useCreateAntibodyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateAntibodyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createAntibodyMutation, { data, loading, error }] = useCreateAntibodyMutation({
 *   variables: {
 *      name: // value for 'name'
 *      epitope: // value for 'epitope'
 *   },
 * });
 */
export function useCreateAntibodyMutation(baseOptions?: Apollo.MutationHookOptions<CreateAntibodyMutation, CreateAntibodyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateAntibodyMutation, CreateAntibodyMutationVariables>(CreateAntibodyDocument, options);
      }
export type CreateAntibodyMutationHookResult = ReturnType<typeof useCreateAntibodyMutation>;
export type CreateAntibodyMutationResult = Apollo.MutationResult<CreateAntibodyMutation>;
export type CreateAntibodyMutationOptions = Apollo.BaseMutationOptions<CreateAntibodyMutation, CreateAntibodyMutationVariables>;
export const EnsureAntibodyDocument = gql`
    mutation EnsureAntibody($name: String!, $epitope: String) {
  ensureAntibody(input: {name: $name, epitope: $epitope}) {
    id
    name
  }
}
    `;
export type EnsureAntibodyMutationFn = Apollo.MutationFunction<EnsureAntibodyMutation, EnsureAntibodyMutationVariables>;

/**
 * __useEnsureAntibodyMutation__
 *
 * To run a mutation, you first call `useEnsureAntibodyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEnsureAntibodyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [ensureAntibodyMutation, { data, loading, error }] = useEnsureAntibodyMutation({
 *   variables: {
 *      name: // value for 'name'
 *      epitope: // value for 'epitope'
 *   },
 * });
 */
export function useEnsureAntibodyMutation(baseOptions?: Apollo.MutationHookOptions<EnsureAntibodyMutation, EnsureAntibodyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<EnsureAntibodyMutation, EnsureAntibodyMutationVariables>(EnsureAntibodyDocument, options);
      }
export type EnsureAntibodyMutationHookResult = ReturnType<typeof useEnsureAntibodyMutation>;
export type EnsureAntibodyMutationResult = Apollo.MutationResult<EnsureAntibodyMutation>;
export type EnsureAntibodyMutationOptions = Apollo.BaseMutationOptions<EnsureAntibodyMutation, EnsureAntibodyMutationVariables>;
export const CreateCameraDocument = gql`
    mutation CreateCamera($serialNumber: String!, $name: String, $pixelSizeX: Micrometers, $pixelSizeY: Micrometers, $sensorSizeX: Int, $sensorSizeY: Int) {
  createCamera(
    input: {name: $name, pixelSizeX: $pixelSizeX, serialNumber: $serialNumber, pixelSizeY: $pixelSizeY, sensorSizeX: $sensorSizeX, sensorSizeY: $sensorSizeY}
  ) {
    id
    name
  }
}
    `;
export type CreateCameraMutationFn = Apollo.MutationFunction<CreateCameraMutation, CreateCameraMutationVariables>;

/**
 * __useCreateCameraMutation__
 *
 * To run a mutation, you first call `useCreateCameraMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateCameraMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createCameraMutation, { data, loading, error }] = useCreateCameraMutation({
 *   variables: {
 *      serialNumber: // value for 'serialNumber'
 *      name: // value for 'name'
 *      pixelSizeX: // value for 'pixelSizeX'
 *      pixelSizeY: // value for 'pixelSizeY'
 *      sensorSizeX: // value for 'sensorSizeX'
 *      sensorSizeY: // value for 'sensorSizeY'
 *   },
 * });
 */
export function useCreateCameraMutation(baseOptions?: Apollo.MutationHookOptions<CreateCameraMutation, CreateCameraMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateCameraMutation, CreateCameraMutationVariables>(CreateCameraDocument, options);
      }
export type CreateCameraMutationHookResult = ReturnType<typeof useCreateCameraMutation>;
export type CreateCameraMutationResult = Apollo.MutationResult<CreateCameraMutation>;
export type CreateCameraMutationOptions = Apollo.BaseMutationOptions<CreateCameraMutation, CreateCameraMutationVariables>;
export const EnsureCameraDocument = gql`
    mutation EnsureCamera($serialNumber: String!, $name: String, $pixelSizeX: Micrometers, $pixelSizeY: Micrometers, $sensorSizeX: Int, $sensorSizeY: Int) {
  ensureCamera(
    input: {name: $name, pixelSizeX: $pixelSizeX, serialNumber: $serialNumber, pixelSizeY: $pixelSizeY, sensorSizeX: $sensorSizeX, sensorSizeY: $sensorSizeY}
  ) {
    id
    name
  }
}
    `;
export type EnsureCameraMutationFn = Apollo.MutationFunction<EnsureCameraMutation, EnsureCameraMutationVariables>;

/**
 * __useEnsureCameraMutation__
 *
 * To run a mutation, you first call `useEnsureCameraMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEnsureCameraMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [ensureCameraMutation, { data, loading, error }] = useEnsureCameraMutation({
 *   variables: {
 *      serialNumber: // value for 'serialNumber'
 *      name: // value for 'name'
 *      pixelSizeX: // value for 'pixelSizeX'
 *      pixelSizeY: // value for 'pixelSizeY'
 *      sensorSizeX: // value for 'sensorSizeX'
 *      sensorSizeY: // value for 'sensorSizeY'
 *   },
 * });
 */
export function useEnsureCameraMutation(baseOptions?: Apollo.MutationHookOptions<EnsureCameraMutation, EnsureCameraMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<EnsureCameraMutation, EnsureCameraMutationVariables>(EnsureCameraDocument, options);
      }
export type EnsureCameraMutationHookResult = ReturnType<typeof useEnsureCameraMutation>;
export type EnsureCameraMutationResult = Apollo.MutationResult<EnsureCameraMutation>;
export type EnsureCameraMutationOptions = Apollo.BaseMutationOptions<EnsureCameraMutation, EnsureCameraMutationVariables>;
export const CreateChannelDocument = gql`
    mutation CreateChannel($name: String!) {
  createChannel(input: {name: $name}) {
    id
    name
  }
}
    `;
export type CreateChannelMutationFn = Apollo.MutationFunction<CreateChannelMutation, CreateChannelMutationVariables>;

/**
 * __useCreateChannelMutation__
 *
 * To run a mutation, you first call `useCreateChannelMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateChannelMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createChannelMutation, { data, loading, error }] = useCreateChannelMutation({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useCreateChannelMutation(baseOptions?: Apollo.MutationHookOptions<CreateChannelMutation, CreateChannelMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateChannelMutation, CreateChannelMutationVariables>(CreateChannelDocument, options);
      }
export type CreateChannelMutationHookResult = ReturnType<typeof useCreateChannelMutation>;
export type CreateChannelMutationResult = Apollo.MutationResult<CreateChannelMutation>;
export type CreateChannelMutationOptions = Apollo.BaseMutationOptions<CreateChannelMutation, CreateChannelMutationVariables>;
export const EnsureChannelDocument = gql`
    mutation EnsureChannel($name: String!) {
  ensureChannel(input: {name: $name}) {
    id
    name
  }
}
    `;
export type EnsureChannelMutationFn = Apollo.MutationFunction<EnsureChannelMutation, EnsureChannelMutationVariables>;

/**
 * __useEnsureChannelMutation__
 *
 * To run a mutation, you first call `useEnsureChannelMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEnsureChannelMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [ensureChannelMutation, { data, loading, error }] = useEnsureChannelMutation({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useEnsureChannelMutation(baseOptions?: Apollo.MutationHookOptions<EnsureChannelMutation, EnsureChannelMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<EnsureChannelMutation, EnsureChannelMutationVariables>(EnsureChannelDocument, options);
      }
export type EnsureChannelMutationHookResult = ReturnType<typeof useEnsureChannelMutation>;
export type EnsureChannelMutationResult = Apollo.MutationResult<EnsureChannelMutation>;
export type EnsureChannelMutationOptions = Apollo.BaseMutationOptions<EnsureChannelMutation, EnsureChannelMutationVariables>;
export const CreateDatasetDocument = gql`
    mutation CreateDataset($name: String!) {
  createDataset(input: {name: $name}) {
    id
    name
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
export const UpdateDatasetDocument = gql`
    mutation UpdateDataset($id: ID!, $name: String!) {
  updateDataset(input: {id: $id, name: $name}) {
    id
    name
  }
}
    `;
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
  pinDataset(input: {id: $id, pin: $pin}) {
    ...Dataset
  }
}
    ${DatasetFragmentDoc}`;
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
export const PutDatasetsInDatasetDocument = gql`
    mutation PutDatasetsInDataset($selfs: [ID!]!, $other: ID!) {
  putDatasetsInDataset(input: {selfs: $selfs, other: $other}) {
    ...Dataset
  }
}
    ${DatasetFragmentDoc}`;
export type PutDatasetsInDatasetMutationFn = Apollo.MutationFunction<PutDatasetsInDatasetMutation, PutDatasetsInDatasetMutationVariables>;

/**
 * __usePutDatasetsInDatasetMutation__
 *
 * To run a mutation, you first call `usePutDatasetsInDatasetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePutDatasetsInDatasetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [putDatasetsInDatasetMutation, { data, loading, error }] = usePutDatasetsInDatasetMutation({
 *   variables: {
 *      selfs: // value for 'selfs'
 *      other: // value for 'other'
 *   },
 * });
 */
export function usePutDatasetsInDatasetMutation(baseOptions?: Apollo.MutationHookOptions<PutDatasetsInDatasetMutation, PutDatasetsInDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PutDatasetsInDatasetMutation, PutDatasetsInDatasetMutationVariables>(PutDatasetsInDatasetDocument, options);
      }
export type PutDatasetsInDatasetMutationHookResult = ReturnType<typeof usePutDatasetsInDatasetMutation>;
export type PutDatasetsInDatasetMutationResult = Apollo.MutationResult<PutDatasetsInDatasetMutation>;
export type PutDatasetsInDatasetMutationOptions = Apollo.BaseMutationOptions<PutDatasetsInDatasetMutation, PutDatasetsInDatasetMutationVariables>;
export const ReleaseDatasetsFromDatasetDocument = gql`
    mutation ReleaseDatasetsFromDataset($selfs: [ID!]!, $other: ID!) {
  releaseDatasetsFromDataset(input: {selfs: $selfs, other: $other}) {
    ...Dataset
  }
}
    ${DatasetFragmentDoc}`;
export type ReleaseDatasetsFromDatasetMutationFn = Apollo.MutationFunction<ReleaseDatasetsFromDatasetMutation, ReleaseDatasetsFromDatasetMutationVariables>;

/**
 * __useReleaseDatasetsFromDatasetMutation__
 *
 * To run a mutation, you first call `useReleaseDatasetsFromDatasetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReleaseDatasetsFromDatasetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [releaseDatasetsFromDatasetMutation, { data, loading, error }] = useReleaseDatasetsFromDatasetMutation({
 *   variables: {
 *      selfs: // value for 'selfs'
 *      other: // value for 'other'
 *   },
 * });
 */
export function useReleaseDatasetsFromDatasetMutation(baseOptions?: Apollo.MutationHookOptions<ReleaseDatasetsFromDatasetMutation, ReleaseDatasetsFromDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReleaseDatasetsFromDatasetMutation, ReleaseDatasetsFromDatasetMutationVariables>(ReleaseDatasetsFromDatasetDocument, options);
      }
export type ReleaseDatasetsFromDatasetMutationHookResult = ReturnType<typeof useReleaseDatasetsFromDatasetMutation>;
export type ReleaseDatasetsFromDatasetMutationResult = Apollo.MutationResult<ReleaseDatasetsFromDatasetMutation>;
export type ReleaseDatasetsFromDatasetMutationOptions = Apollo.BaseMutationOptions<ReleaseDatasetsFromDatasetMutation, ReleaseDatasetsFromDatasetMutationVariables>;
export const PutImagesInDatasetDocument = gql`
    mutation PutImagesInDataset($selfs: [ID!]!, $other: ID!) {
  putImagesInDataset(input: {selfs: $selfs, other: $other}) {
    ...Dataset
  }
}
    ${DatasetFragmentDoc}`;
export type PutImagesInDatasetMutationFn = Apollo.MutationFunction<PutImagesInDatasetMutation, PutImagesInDatasetMutationVariables>;

/**
 * __usePutImagesInDatasetMutation__
 *
 * To run a mutation, you first call `usePutImagesInDatasetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePutImagesInDatasetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [putImagesInDatasetMutation, { data, loading, error }] = usePutImagesInDatasetMutation({
 *   variables: {
 *      selfs: // value for 'selfs'
 *      other: // value for 'other'
 *   },
 * });
 */
export function usePutImagesInDatasetMutation(baseOptions?: Apollo.MutationHookOptions<PutImagesInDatasetMutation, PutImagesInDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PutImagesInDatasetMutation, PutImagesInDatasetMutationVariables>(PutImagesInDatasetDocument, options);
      }
export type PutImagesInDatasetMutationHookResult = ReturnType<typeof usePutImagesInDatasetMutation>;
export type PutImagesInDatasetMutationResult = Apollo.MutationResult<PutImagesInDatasetMutation>;
export type PutImagesInDatasetMutationOptions = Apollo.BaseMutationOptions<PutImagesInDatasetMutation, PutImagesInDatasetMutationVariables>;
export const ReleaseImagesFromDatasetDocument = gql`
    mutation ReleaseImagesFromDataset($selfs: [ID!]!, $other: ID!) {
  releaseImagesFromDataset(input: {selfs: $selfs, other: $other}) {
    ...Dataset
  }
}
    ${DatasetFragmentDoc}`;
export type ReleaseImagesFromDatasetMutationFn = Apollo.MutationFunction<ReleaseImagesFromDatasetMutation, ReleaseImagesFromDatasetMutationVariables>;

/**
 * __useReleaseImagesFromDatasetMutation__
 *
 * To run a mutation, you first call `useReleaseImagesFromDatasetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReleaseImagesFromDatasetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [releaseImagesFromDatasetMutation, { data, loading, error }] = useReleaseImagesFromDatasetMutation({
 *   variables: {
 *      selfs: // value for 'selfs'
 *      other: // value for 'other'
 *   },
 * });
 */
export function useReleaseImagesFromDatasetMutation(baseOptions?: Apollo.MutationHookOptions<ReleaseImagesFromDatasetMutation, ReleaseImagesFromDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReleaseImagesFromDatasetMutation, ReleaseImagesFromDatasetMutationVariables>(ReleaseImagesFromDatasetDocument, options);
      }
export type ReleaseImagesFromDatasetMutationHookResult = ReturnType<typeof useReleaseImagesFromDatasetMutation>;
export type ReleaseImagesFromDatasetMutationResult = Apollo.MutationResult<ReleaseImagesFromDatasetMutation>;
export type ReleaseImagesFromDatasetMutationOptions = Apollo.BaseMutationOptions<ReleaseImagesFromDatasetMutation, ReleaseImagesFromDatasetMutationVariables>;
export const PutFilesInDatasetDocument = gql`
    mutation PutFilesInDataset($selfs: [ID!]!, $other: ID!) {
  putFilesInDataset(input: {selfs: $selfs, other: $other}) {
    ...Dataset
  }
}
    ${DatasetFragmentDoc}`;
export type PutFilesInDatasetMutationFn = Apollo.MutationFunction<PutFilesInDatasetMutation, PutFilesInDatasetMutationVariables>;

/**
 * __usePutFilesInDatasetMutation__
 *
 * To run a mutation, you first call `usePutFilesInDatasetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePutFilesInDatasetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [putFilesInDatasetMutation, { data, loading, error }] = usePutFilesInDatasetMutation({
 *   variables: {
 *      selfs: // value for 'selfs'
 *      other: // value for 'other'
 *   },
 * });
 */
export function usePutFilesInDatasetMutation(baseOptions?: Apollo.MutationHookOptions<PutFilesInDatasetMutation, PutFilesInDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PutFilesInDatasetMutation, PutFilesInDatasetMutationVariables>(PutFilesInDatasetDocument, options);
      }
export type PutFilesInDatasetMutationHookResult = ReturnType<typeof usePutFilesInDatasetMutation>;
export type PutFilesInDatasetMutationResult = Apollo.MutationResult<PutFilesInDatasetMutation>;
export type PutFilesInDatasetMutationOptions = Apollo.BaseMutationOptions<PutFilesInDatasetMutation, PutFilesInDatasetMutationVariables>;
export const ReleaseFilesFromDatasetDocument = gql`
    mutation ReleaseFilesFromDataset($selfs: [ID!]!, $other: ID!) {
  releaseFilesFromDataset(input: {selfs: $selfs, other: $other}) {
    ...Dataset
  }
}
    ${DatasetFragmentDoc}`;
export type ReleaseFilesFromDatasetMutationFn = Apollo.MutationFunction<ReleaseFilesFromDatasetMutation, ReleaseFilesFromDatasetMutationVariables>;

/**
 * __useReleaseFilesFromDatasetMutation__
 *
 * To run a mutation, you first call `useReleaseFilesFromDatasetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReleaseFilesFromDatasetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [releaseFilesFromDatasetMutation, { data, loading, error }] = useReleaseFilesFromDatasetMutation({
 *   variables: {
 *      selfs: // value for 'selfs'
 *      other: // value for 'other'
 *   },
 * });
 */
export function useReleaseFilesFromDatasetMutation(baseOptions?: Apollo.MutationHookOptions<ReleaseFilesFromDatasetMutation, ReleaseFilesFromDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReleaseFilesFromDatasetMutation, ReleaseFilesFromDatasetMutationVariables>(ReleaseFilesFromDatasetDocument, options);
      }
export type ReleaseFilesFromDatasetMutationHookResult = ReturnType<typeof useReleaseFilesFromDatasetMutation>;
export type ReleaseFilesFromDatasetMutationResult = Apollo.MutationResult<ReleaseFilesFromDatasetMutation>;
export type ReleaseFilesFromDatasetMutationOptions = Apollo.BaseMutationOptions<ReleaseFilesFromDatasetMutation, ReleaseFilesFromDatasetMutationVariables>;
export const RevertDatasetDocument = gql`
    mutation RevertDataset($dataset: ID!, $history: ID!) {
  revertDataset(input: {id: $dataset, historyId: $history}) {
    id
    name
    description
  }
}
    `;
export type RevertDatasetMutationFn = Apollo.MutationFunction<RevertDatasetMutation, RevertDatasetMutationVariables>;

/**
 * __useRevertDatasetMutation__
 *
 * To run a mutation, you first call `useRevertDatasetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRevertDatasetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [revertDatasetMutation, { data, loading, error }] = useRevertDatasetMutation({
 *   variables: {
 *      dataset: // value for 'dataset'
 *      history: // value for 'history'
 *   },
 * });
 */
export function useRevertDatasetMutation(baseOptions?: Apollo.MutationHookOptions<RevertDatasetMutation, RevertDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RevertDatasetMutation, RevertDatasetMutationVariables>(RevertDatasetDocument, options);
      }
export type RevertDatasetMutationHookResult = ReturnType<typeof useRevertDatasetMutation>;
export type RevertDatasetMutationResult = Apollo.MutationResult<RevertDatasetMutation>;
export type RevertDatasetMutationOptions = Apollo.BaseMutationOptions<RevertDatasetMutation, RevertDatasetMutationVariables>;
export const CreateEraDocument = gql`
    mutation CreateEra($name: String!, $begin: DateTime) {
  createEra(input: {name: $name, begin: $begin}) {
    id
    begin
  }
}
    `;
export type CreateEraMutationFn = Apollo.MutationFunction<CreateEraMutation, CreateEraMutationVariables>;

/**
 * __useCreateEraMutation__
 *
 * To run a mutation, you first call `useCreateEraMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateEraMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createEraMutation, { data, loading, error }] = useCreateEraMutation({
 *   variables: {
 *      name: // value for 'name'
 *      begin: // value for 'begin'
 *   },
 * });
 */
export function useCreateEraMutation(baseOptions?: Apollo.MutationHookOptions<CreateEraMutation, CreateEraMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateEraMutation, CreateEraMutationVariables>(CreateEraDocument, options);
      }
export type CreateEraMutationHookResult = ReturnType<typeof useCreateEraMutation>;
export type CreateEraMutationResult = Apollo.MutationResult<CreateEraMutation>;
export type CreateEraMutationOptions = Apollo.BaseMutationOptions<CreateEraMutation, CreateEraMutationVariables>;
export const From_File_LikeDocument = gql`
    mutation from_file_like($file: FileLike!, $name: String!, $origins: [ID!], $dataset: ID) {
  fromFileLike(
    input: {file: $file, name: $name, origins: $origins, dataset: $dataset}
  ) {
    ...File
  }
}
    ${FileFragmentDoc}`;
export type From_File_LikeMutationFn = Apollo.MutationFunction<From_File_LikeMutation, From_File_LikeMutationVariables>;

/**
 * __useFrom_File_LikeMutation__
 *
 * To run a mutation, you first call `useFrom_File_LikeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useFrom_File_LikeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [fromFileLikeMutation, { data, loading, error }] = useFrom_File_LikeMutation({
 *   variables: {
 *      file: // value for 'file'
 *      name: // value for 'name'
 *      origins: // value for 'origins'
 *      dataset: // value for 'dataset'
 *   },
 * });
 */
export function useFrom_File_LikeMutation(baseOptions?: Apollo.MutationHookOptions<From_File_LikeMutation, From_File_LikeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<From_File_LikeMutation, From_File_LikeMutationVariables>(From_File_LikeDocument, options);
      }
export type From_File_LikeMutationHookResult = ReturnType<typeof useFrom_File_LikeMutation>;
export type From_File_LikeMutationResult = Apollo.MutationResult<From_File_LikeMutation>;
export type From_File_LikeMutationOptions = Apollo.BaseMutationOptions<From_File_LikeMutation, From_File_LikeMutationVariables>;
export const RequestFileUploadDocument = gql`
    mutation RequestFileUpload($key: String!, $datalayer: String!) {
  requestFileUpload(input: {key: $key, datalayer: $datalayer}) {
    ...Credentials
  }
}
    ${CredentialsFragmentDoc}`;
export type RequestFileUploadMutationFn = Apollo.MutationFunction<RequestFileUploadMutation, RequestFileUploadMutationVariables>;

/**
 * __useRequestFileUploadMutation__
 *
 * To run a mutation, you first call `useRequestFileUploadMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestFileUploadMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestFileUploadMutation, { data, loading, error }] = useRequestFileUploadMutation({
 *   variables: {
 *      key: // value for 'key'
 *      datalayer: // value for 'datalayer'
 *   },
 * });
 */
export function useRequestFileUploadMutation(baseOptions?: Apollo.MutationHookOptions<RequestFileUploadMutation, RequestFileUploadMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RequestFileUploadMutation, RequestFileUploadMutationVariables>(RequestFileUploadDocument, options);
      }
export type RequestFileUploadMutationHookResult = ReturnType<typeof useRequestFileUploadMutation>;
export type RequestFileUploadMutationResult = Apollo.MutationResult<RequestFileUploadMutation>;
export type RequestFileUploadMutationOptions = Apollo.BaseMutationOptions<RequestFileUploadMutation, RequestFileUploadMutationVariables>;
export const RequestFileAccessDocument = gql`
    mutation RequestFileAccess($store: ID!, $duration: Int) {
  requestFileAccess(input: {store: $store, duration: $duration}) {
    ...AccessCredentials
  }
}
    ${AccessCredentialsFragmentDoc}`;
export type RequestFileAccessMutationFn = Apollo.MutationFunction<RequestFileAccessMutation, RequestFileAccessMutationVariables>;

/**
 * __useRequestFileAccessMutation__
 *
 * To run a mutation, you first call `useRequestFileAccessMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestFileAccessMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestFileAccessMutation, { data, loading, error }] = useRequestFileAccessMutation({
 *   variables: {
 *      store: // value for 'store'
 *      duration: // value for 'duration'
 *   },
 * });
 */
export function useRequestFileAccessMutation(baseOptions?: Apollo.MutationHookOptions<RequestFileAccessMutation, RequestFileAccessMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RequestFileAccessMutation, RequestFileAccessMutationVariables>(RequestFileAccessDocument, options);
      }
export type RequestFileAccessMutationHookResult = ReturnType<typeof useRequestFileAccessMutation>;
export type RequestFileAccessMutationResult = Apollo.MutationResult<RequestFileAccessMutation>;
export type RequestFileAccessMutationOptions = Apollo.BaseMutationOptions<RequestFileAccessMutation, RequestFileAccessMutationVariables>;
export const CreateFluorophoreDocument = gql`
    mutation CreateFluorophore($name: String!, $excitationWavelength: Micrometers, $emissionWavelength: Micrometers) {
  createFluorophore(
    input: {name: $name, excitationWavelength: $excitationWavelength, emissionWavelength: $emissionWavelength}
  ) {
    id
    name
  }
}
    `;
export type CreateFluorophoreMutationFn = Apollo.MutationFunction<CreateFluorophoreMutation, CreateFluorophoreMutationVariables>;

/**
 * __useCreateFluorophoreMutation__
 *
 * To run a mutation, you first call `useCreateFluorophoreMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateFluorophoreMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createFluorophoreMutation, { data, loading, error }] = useCreateFluorophoreMutation({
 *   variables: {
 *      name: // value for 'name'
 *      excitationWavelength: // value for 'excitationWavelength'
 *      emissionWavelength: // value for 'emissionWavelength'
 *   },
 * });
 */
export function useCreateFluorophoreMutation(baseOptions?: Apollo.MutationHookOptions<CreateFluorophoreMutation, CreateFluorophoreMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateFluorophoreMutation, CreateFluorophoreMutationVariables>(CreateFluorophoreDocument, options);
      }
export type CreateFluorophoreMutationHookResult = ReturnType<typeof useCreateFluorophoreMutation>;
export type CreateFluorophoreMutationResult = Apollo.MutationResult<CreateFluorophoreMutation>;
export type CreateFluorophoreMutationOptions = Apollo.BaseMutationOptions<CreateFluorophoreMutation, CreateFluorophoreMutationVariables>;
export const EnsureFluorophoreDocument = gql`
    mutation EnsureFluorophore($name: String!, $excitationWavelength: Micrometers, $emissionWavelength: Micrometers) {
  ensureFluorophore(
    input: {name: $name, excitationWavelength: $excitationWavelength, emissionWavelength: $emissionWavelength}
  ) {
    id
    name
  }
}
    `;
export type EnsureFluorophoreMutationFn = Apollo.MutationFunction<EnsureFluorophoreMutation, EnsureFluorophoreMutationVariables>;

/**
 * __useEnsureFluorophoreMutation__
 *
 * To run a mutation, you first call `useEnsureFluorophoreMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEnsureFluorophoreMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [ensureFluorophoreMutation, { data, loading, error }] = useEnsureFluorophoreMutation({
 *   variables: {
 *      name: // value for 'name'
 *      excitationWavelength: // value for 'excitationWavelength'
 *      emissionWavelength: // value for 'emissionWavelength'
 *   },
 * });
 */
export function useEnsureFluorophoreMutation(baseOptions?: Apollo.MutationHookOptions<EnsureFluorophoreMutation, EnsureFluorophoreMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<EnsureFluorophoreMutation, EnsureFluorophoreMutationVariables>(EnsureFluorophoreDocument, options);
      }
export type EnsureFluorophoreMutationHookResult = ReturnType<typeof useEnsureFluorophoreMutation>;
export type EnsureFluorophoreMutationResult = Apollo.MutationResult<EnsureFluorophoreMutation>;
export type EnsureFluorophoreMutationOptions = Apollo.BaseMutationOptions<EnsureFluorophoreMutation, EnsureFluorophoreMutationVariables>;
export const From_Array_LikeDocument = gql`
    mutation from_array_like($array: ArrayLike!, $name: String!, $origins: [ID!], $channelViews: [PartialChannelViewInput!], $transformationViews: [PartialTransformationViewInput!], $labelViews: [PartialLabelViewInput!], $timepointViews: [PartialTimepointViewInput!], $opticsViews: [PartialOpticsViewInput!]) {
  fromArrayLike(
    input: {array: $array, name: $name, origins: $origins, channelViews: $channelViews, transformationViews: $transformationViews, labelViews: $labelViews, timepointViews: $timepointViews, opticsViews: $opticsViews}
  ) {
    ...Image
  }
}
    ${ImageFragmentDoc}`;
export type From_Array_LikeMutationFn = Apollo.MutationFunction<From_Array_LikeMutation, From_Array_LikeMutationVariables>;

/**
 * __useFrom_Array_LikeMutation__
 *
 * To run a mutation, you first call `useFrom_Array_LikeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useFrom_Array_LikeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [fromArrayLikeMutation, { data, loading, error }] = useFrom_Array_LikeMutation({
 *   variables: {
 *      array: // value for 'array'
 *      name: // value for 'name'
 *      origins: // value for 'origins'
 *      channelViews: // value for 'channelViews'
 *      transformationViews: // value for 'transformationViews'
 *      labelViews: // value for 'labelViews'
 *      timepointViews: // value for 'timepointViews'
 *      opticsViews: // value for 'opticsViews'
 *   },
 * });
 */
export function useFrom_Array_LikeMutation(baseOptions?: Apollo.MutationHookOptions<From_Array_LikeMutation, From_Array_LikeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<From_Array_LikeMutation, From_Array_LikeMutationVariables>(From_Array_LikeDocument, options);
      }
export type From_Array_LikeMutationHookResult = ReturnType<typeof useFrom_Array_LikeMutation>;
export type From_Array_LikeMutationResult = Apollo.MutationResult<From_Array_LikeMutation>;
export type From_Array_LikeMutationOptions = Apollo.BaseMutationOptions<From_Array_LikeMutation, From_Array_LikeMutationVariables>;
export const RequestUploadDocument = gql`
    mutation RequestUpload($key: String!, $datalayer: String!) {
  requestUpload(input: {key: $key, datalayer: $datalayer}) {
    ...Credentials
  }
}
    ${CredentialsFragmentDoc}`;
export type RequestUploadMutationFn = Apollo.MutationFunction<RequestUploadMutation, RequestUploadMutationVariables>;

/**
 * __useRequestUploadMutation__
 *
 * To run a mutation, you first call `useRequestUploadMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestUploadMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestUploadMutation, { data, loading, error }] = useRequestUploadMutation({
 *   variables: {
 *      key: // value for 'key'
 *      datalayer: // value for 'datalayer'
 *   },
 * });
 */
export function useRequestUploadMutation(baseOptions?: Apollo.MutationHookOptions<RequestUploadMutation, RequestUploadMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RequestUploadMutation, RequestUploadMutationVariables>(RequestUploadDocument, options);
      }
export type RequestUploadMutationHookResult = ReturnType<typeof useRequestUploadMutation>;
export type RequestUploadMutationResult = Apollo.MutationResult<RequestUploadMutation>;
export type RequestUploadMutationOptions = Apollo.BaseMutationOptions<RequestUploadMutation, RequestUploadMutationVariables>;
export const RequestAccessDocument = gql`
    mutation RequestAccess($store: ID!, $duration: Int) {
  requestAccess(input: {store: $store, duration: $duration}) {
    ...AccessCredentials
  }
}
    ${AccessCredentialsFragmentDoc}`;
export type RequestAccessMutationFn = Apollo.MutationFunction<RequestAccessMutation, RequestAccessMutationVariables>;

/**
 * __useRequestAccessMutation__
 *
 * To run a mutation, you first call `useRequestAccessMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestAccessMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestAccessMutation, { data, loading, error }] = useRequestAccessMutation({
 *   variables: {
 *      store: // value for 'store'
 *      duration: // value for 'duration'
 *   },
 * });
 */
export function useRequestAccessMutation(baseOptions?: Apollo.MutationHookOptions<RequestAccessMutation, RequestAccessMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RequestAccessMutation, RequestAccessMutationVariables>(RequestAccessDocument, options);
      }
export type RequestAccessMutationHookResult = ReturnType<typeof useRequestAccessMutation>;
export type RequestAccessMutationResult = Apollo.MutationResult<RequestAccessMutation>;
export type RequestAccessMutationOptions = Apollo.BaseMutationOptions<RequestAccessMutation, RequestAccessMutationVariables>;
export const PinImageDocument = gql`
    mutation PinImage($id: ID!, $pin: Boolean!) {
  pinImage(input: {id: $id, pin: $pin}) {
    ...Image
  }
}
    ${ImageFragmentDoc}`;
export type PinImageMutationFn = Apollo.MutationFunction<PinImageMutation, PinImageMutationVariables>;

/**
 * __usePinImageMutation__
 *
 * To run a mutation, you first call `usePinImageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePinImageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pinImageMutation, { data, loading, error }] = usePinImageMutation({
 *   variables: {
 *      id: // value for 'id'
 *      pin: // value for 'pin'
 *   },
 * });
 */
export function usePinImageMutation(baseOptions?: Apollo.MutationHookOptions<PinImageMutation, PinImageMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PinImageMutation, PinImageMutationVariables>(PinImageDocument, options);
      }
export type PinImageMutationHookResult = ReturnType<typeof usePinImageMutation>;
export type PinImageMutationResult = Apollo.MutationResult<PinImageMutation>;
export type PinImageMutationOptions = Apollo.BaseMutationOptions<PinImageMutation, PinImageMutationVariables>;
export const CreateInstrumentDocument = gql`
    mutation CreateInstrument($serialNumber: String!, $name: String, $model: String) {
  createInstrument(
    input: {name: $name, model: $model, serialNumber: $serialNumber}
  ) {
    id
    name
  }
}
    `;
export type CreateInstrumentMutationFn = Apollo.MutationFunction<CreateInstrumentMutation, CreateInstrumentMutationVariables>;

/**
 * __useCreateInstrumentMutation__
 *
 * To run a mutation, you first call `useCreateInstrumentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateInstrumentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createInstrumentMutation, { data, loading, error }] = useCreateInstrumentMutation({
 *   variables: {
 *      serialNumber: // value for 'serialNumber'
 *      name: // value for 'name'
 *      model: // value for 'model'
 *   },
 * });
 */
export function useCreateInstrumentMutation(baseOptions?: Apollo.MutationHookOptions<CreateInstrumentMutation, CreateInstrumentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateInstrumentMutation, CreateInstrumentMutationVariables>(CreateInstrumentDocument, options);
      }
export type CreateInstrumentMutationHookResult = ReturnType<typeof useCreateInstrumentMutation>;
export type CreateInstrumentMutationResult = Apollo.MutationResult<CreateInstrumentMutation>;
export type CreateInstrumentMutationOptions = Apollo.BaseMutationOptions<CreateInstrumentMutation, CreateInstrumentMutationVariables>;
export const EnsureInstrumentDocument = gql`
    mutation EnsureInstrument($serialNumber: String!, $name: String, $model: String) {
  ensureInstrument(
    input: {name: $name, model: $model, serialNumber: $serialNumber}
  ) {
    id
    name
  }
}
    `;
export type EnsureInstrumentMutationFn = Apollo.MutationFunction<EnsureInstrumentMutation, EnsureInstrumentMutationVariables>;

/**
 * __useEnsureInstrumentMutation__
 *
 * To run a mutation, you first call `useEnsureInstrumentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEnsureInstrumentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [ensureInstrumentMutation, { data, loading, error }] = useEnsureInstrumentMutation({
 *   variables: {
 *      serialNumber: // value for 'serialNumber'
 *      name: // value for 'name'
 *      model: // value for 'model'
 *   },
 * });
 */
export function useEnsureInstrumentMutation(baseOptions?: Apollo.MutationHookOptions<EnsureInstrumentMutation, EnsureInstrumentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<EnsureInstrumentMutation, EnsureInstrumentMutationVariables>(EnsureInstrumentDocument, options);
      }
export type EnsureInstrumentMutationHookResult = ReturnType<typeof useEnsureInstrumentMutation>;
export type EnsureInstrumentMutationResult = Apollo.MutationResult<EnsureInstrumentMutation>;
export type EnsureInstrumentMutationOptions = Apollo.BaseMutationOptions<EnsureInstrumentMutation, EnsureInstrumentMutationVariables>;
export const CreateObjectiveDocument = gql`
    mutation CreateObjective($serialNumber: String!, $name: String, $na: Float, $magnification: Float) {
  createObjective(
    input: {name: $name, na: $na, serialNumber: $serialNumber, magnification: $magnification}
  ) {
    id
    name
  }
}
    `;
export type CreateObjectiveMutationFn = Apollo.MutationFunction<CreateObjectiveMutation, CreateObjectiveMutationVariables>;

/**
 * __useCreateObjectiveMutation__
 *
 * To run a mutation, you first call `useCreateObjectiveMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateObjectiveMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createObjectiveMutation, { data, loading, error }] = useCreateObjectiveMutation({
 *   variables: {
 *      serialNumber: // value for 'serialNumber'
 *      name: // value for 'name'
 *      na: // value for 'na'
 *      magnification: // value for 'magnification'
 *   },
 * });
 */
export function useCreateObjectiveMutation(baseOptions?: Apollo.MutationHookOptions<CreateObjectiveMutation, CreateObjectiveMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateObjectiveMutation, CreateObjectiveMutationVariables>(CreateObjectiveDocument, options);
      }
export type CreateObjectiveMutationHookResult = ReturnType<typeof useCreateObjectiveMutation>;
export type CreateObjectiveMutationResult = Apollo.MutationResult<CreateObjectiveMutation>;
export type CreateObjectiveMutationOptions = Apollo.BaseMutationOptions<CreateObjectiveMutation, CreateObjectiveMutationVariables>;
export const EnsureObjectiveDocument = gql`
    mutation EnsureObjective($serialNumber: String!, $name: String, $na: Float, $magnification: Float) {
  ensureObjective(
    input: {name: $name, na: $na, serialNumber: $serialNumber, magnification: $magnification}
  ) {
    id
    name
  }
}
    `;
export type EnsureObjectiveMutationFn = Apollo.MutationFunction<EnsureObjectiveMutation, EnsureObjectiveMutationVariables>;

/**
 * __useEnsureObjectiveMutation__
 *
 * To run a mutation, you first call `useEnsureObjectiveMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEnsureObjectiveMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [ensureObjectiveMutation, { data, loading, error }] = useEnsureObjectiveMutation({
 *   variables: {
 *      serialNumber: // value for 'serialNumber'
 *      name: // value for 'name'
 *      na: // value for 'na'
 *      magnification: // value for 'magnification'
 *   },
 * });
 */
export function useEnsureObjectiveMutation(baseOptions?: Apollo.MutationHookOptions<EnsureObjectiveMutation, EnsureObjectiveMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<EnsureObjectiveMutation, EnsureObjectiveMutationVariables>(EnsureObjectiveDocument, options);
      }
export type EnsureObjectiveMutationHookResult = ReturnType<typeof useEnsureObjectiveMutation>;
export type EnsureObjectiveMutationResult = Apollo.MutationResult<EnsureObjectiveMutation>;
export type EnsureObjectiveMutationOptions = Apollo.BaseMutationOptions<EnsureObjectiveMutation, EnsureObjectiveMutationVariables>;
export const CreateSnapshotDocument = gql`
    mutation CreateSnapshot($image: ID!, $file: Upload!) {
  createSnapshot(input: {file: $file, image: $image}) {
    ...Snapshot
  }
}
    ${SnapshotFragmentDoc}`;
export type CreateSnapshotMutationFn = Apollo.MutationFunction<CreateSnapshotMutation, CreateSnapshotMutationVariables>;

/**
 * __useCreateSnapshotMutation__
 *
 * To run a mutation, you first call `useCreateSnapshotMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateSnapshotMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createSnapshotMutation, { data, loading, error }] = useCreateSnapshotMutation({
 *   variables: {
 *      image: // value for 'image'
 *      file: // value for 'file'
 *   },
 * });
 */
export function useCreateSnapshotMutation(baseOptions?: Apollo.MutationHookOptions<CreateSnapshotMutation, CreateSnapshotMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateSnapshotMutation, CreateSnapshotMutationVariables>(CreateSnapshotDocument, options);
      }
export type CreateSnapshotMutationHookResult = ReturnType<typeof useCreateSnapshotMutation>;
export type CreateSnapshotMutationResult = Apollo.MutationResult<CreateSnapshotMutation>;
export type CreateSnapshotMutationOptions = Apollo.BaseMutationOptions<CreateSnapshotMutation, CreateSnapshotMutationVariables>;
export const CreateStageDocument = gql`
    mutation CreateStage($name: String!) {
  createStage(input: {name: $name}) {
    id
    name
  }
}
    `;
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
  pinStage(input: {id: $id, pin: $pin}) {
    ...Stage
  }
}
    ${StageFragmentDoc}`;
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
export const From_Parquet_LikeDocument = gql`
    mutation from_parquet_like($dataframe: ParquetLike!, $name: String!, $origins: [ID!], $dataset: ID) {
  fromParquetLike(
    input: {dataframe: $dataframe, name: $name, origins: $origins, dataset: $dataset}
  ) {
    ...Table
  }
}
    ${TableFragmentDoc}`;
export type From_Parquet_LikeMutationFn = Apollo.MutationFunction<From_Parquet_LikeMutation, From_Parquet_LikeMutationVariables>;

/**
 * __useFrom_Parquet_LikeMutation__
 *
 * To run a mutation, you first call `useFrom_Parquet_LikeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useFrom_Parquet_LikeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [fromParquetLikeMutation, { data, loading, error }] = useFrom_Parquet_LikeMutation({
 *   variables: {
 *      dataframe: // value for 'dataframe'
 *      name: // value for 'name'
 *      origins: // value for 'origins'
 *      dataset: // value for 'dataset'
 *   },
 * });
 */
export function useFrom_Parquet_LikeMutation(baseOptions?: Apollo.MutationHookOptions<From_Parquet_LikeMutation, From_Parquet_LikeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<From_Parquet_LikeMutation, From_Parquet_LikeMutationVariables>(From_Parquet_LikeDocument, options);
      }
export type From_Parquet_LikeMutationHookResult = ReturnType<typeof useFrom_Parquet_LikeMutation>;
export type From_Parquet_LikeMutationResult = Apollo.MutationResult<From_Parquet_LikeMutation>;
export type From_Parquet_LikeMutationOptions = Apollo.BaseMutationOptions<From_Parquet_LikeMutation, From_Parquet_LikeMutationVariables>;
export const RequestTableUploadDocument = gql`
    mutation RequestTableUpload($key: String!, $datalayer: String!) {
  requestTableUpload(input: {key: $key, datalayer: $datalayer}) {
    ...Credentials
  }
}
    ${CredentialsFragmentDoc}`;
export type RequestTableUploadMutationFn = Apollo.MutationFunction<RequestTableUploadMutation, RequestTableUploadMutationVariables>;

/**
 * __useRequestTableUploadMutation__
 *
 * To run a mutation, you first call `useRequestTableUploadMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestTableUploadMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestTableUploadMutation, { data, loading, error }] = useRequestTableUploadMutation({
 *   variables: {
 *      key: // value for 'key'
 *      datalayer: // value for 'datalayer'
 *   },
 * });
 */
export function useRequestTableUploadMutation(baseOptions?: Apollo.MutationHookOptions<RequestTableUploadMutation, RequestTableUploadMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RequestTableUploadMutation, RequestTableUploadMutationVariables>(RequestTableUploadDocument, options);
      }
export type RequestTableUploadMutationHookResult = ReturnType<typeof useRequestTableUploadMutation>;
export type RequestTableUploadMutationResult = Apollo.MutationResult<RequestTableUploadMutation>;
export type RequestTableUploadMutationOptions = Apollo.BaseMutationOptions<RequestTableUploadMutation, RequestTableUploadMutationVariables>;
export const RequestTableAccessDocument = gql`
    mutation RequestTableAccess($store: ID!, $duration: Int) {
  requestTableAccess(input: {store: $store, duration: $duration}) {
    ...AccessCredentials
  }
}
    ${AccessCredentialsFragmentDoc}`;
export type RequestTableAccessMutationFn = Apollo.MutationFunction<RequestTableAccessMutation, RequestTableAccessMutationVariables>;

/**
 * __useRequestTableAccessMutation__
 *
 * To run a mutation, you first call `useRequestTableAccessMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestTableAccessMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestTableAccessMutation, { data, loading, error }] = useRequestTableAccessMutation({
 *   variables: {
 *      store: // value for 'store'
 *      duration: // value for 'duration'
 *   },
 * });
 */
export function useRequestTableAccessMutation(baseOptions?: Apollo.MutationHookOptions<RequestTableAccessMutation, RequestTableAccessMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RequestTableAccessMutation, RequestTableAccessMutationVariables>(RequestTableAccessDocument, options);
      }
export type RequestTableAccessMutationHookResult = ReturnType<typeof useRequestTableAccessMutation>;
export type RequestTableAccessMutationResult = Apollo.MutationResult<RequestTableAccessMutation>;
export type RequestTableAccessMutationOptions = Apollo.BaseMutationOptions<RequestTableAccessMutation, RequestTableAccessMutationVariables>;
export const CreateViewCollectionDocument = gql`
    mutation CreateViewCollection($name: String!) {
  createViewCollection(input: {name: $name}) {
    id
    name
  }
}
    `;
export type CreateViewCollectionMutationFn = Apollo.MutationFunction<CreateViewCollectionMutation, CreateViewCollectionMutationVariables>;

/**
 * __useCreateViewCollectionMutation__
 *
 * To run a mutation, you first call `useCreateViewCollectionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateViewCollectionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createViewCollectionMutation, { data, loading, error }] = useCreateViewCollectionMutation({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useCreateViewCollectionMutation(baseOptions?: Apollo.MutationHookOptions<CreateViewCollectionMutation, CreateViewCollectionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateViewCollectionMutation, CreateViewCollectionMutationVariables>(CreateViewCollectionDocument, options);
      }
export type CreateViewCollectionMutationHookResult = ReturnType<typeof useCreateViewCollectionMutation>;
export type CreateViewCollectionMutationResult = Apollo.MutationResult<CreateViewCollectionMutation>;
export type CreateViewCollectionMutationOptions = Apollo.BaseMutationOptions<CreateViewCollectionMutation, CreateViewCollectionMutationVariables>;
export const GetCameraDocument = gql`
    query GetCamera($id: ID!) {
  camera(id: $id) {
    ...Camera
  }
}
    ${CameraFragmentDoc}`;

/**
 * __useGetCameraQuery__
 *
 * To run a query within a React component, call `useGetCameraQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCameraQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCameraQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetCameraQuery(baseOptions: Apollo.QueryHookOptions<GetCameraQuery, GetCameraQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetCameraQuery, GetCameraQueryVariables>(GetCameraDocument, options);
      }
export function useGetCameraLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetCameraQuery, GetCameraQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetCameraQuery, GetCameraQueryVariables>(GetCameraDocument, options);
        }
export type GetCameraQueryHookResult = ReturnType<typeof useGetCameraQuery>;
export type GetCameraLazyQueryHookResult = ReturnType<typeof useGetCameraLazyQuery>;
export type GetCameraQueryResult = Apollo.QueryResult<GetCameraQuery, GetCameraQueryVariables>;
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
export function useGetDatasetQuery(baseOptions: Apollo.QueryHookOptions<GetDatasetQuery, GetDatasetQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetDatasetQuery, GetDatasetQueryVariables>(GetDatasetDocument, options);
      }
export function useGetDatasetLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetDatasetQuery, GetDatasetQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetDatasetQuery, GetDatasetQueryVariables>(GetDatasetDocument, options);
        }
export type GetDatasetQueryHookResult = ReturnType<typeof useGetDatasetQuery>;
export type GetDatasetLazyQueryHookResult = ReturnType<typeof useGetDatasetLazyQuery>;
export type GetDatasetQueryResult = Apollo.QueryResult<GetDatasetQuery, GetDatasetQueryVariables>;
export const GetDatasetsDocument = gql`
    query GetDatasets($filters: DatasetFilter, $pagination: OffsetPaginationInput) {
  datasets(filters: $filters, pagination: $pagination) {
    ...ListDataset
  }
}
    ${ListDatasetFragmentDoc}`;

/**
 * __useGetDatasetsQuery__
 *
 * To run a query within a React component, call `useGetDatasetsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetDatasetsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetDatasetsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useGetDatasetsQuery(baseOptions?: Apollo.QueryHookOptions<GetDatasetsQuery, GetDatasetsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetDatasetsQuery, GetDatasetsQueryVariables>(GetDatasetsDocument, options);
      }
export function useGetDatasetsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetDatasetsQuery, GetDatasetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetDatasetsQuery, GetDatasetsQueryVariables>(GetDatasetsDocument, options);
        }
export type GetDatasetsQueryHookResult = ReturnType<typeof useGetDatasetsQuery>;
export type GetDatasetsLazyQueryHookResult = ReturnType<typeof useGetDatasetsLazyQuery>;
export type GetDatasetsQueryResult = Apollo.QueryResult<GetDatasetsQuery, GetDatasetsQueryVariables>;
export const GetFileDocument = gql`
    query GetFile($id: ID!) {
  file(id: $id) {
    ...File
  }
}
    ${FileFragmentDoc}`;

/**
 * __useGetFileQuery__
 *
 * To run a query within a React component, call `useGetFileQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFileQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetFileQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetFileQuery(baseOptions: Apollo.QueryHookOptions<GetFileQuery, GetFileQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetFileQuery, GetFileQueryVariables>(GetFileDocument, options);
      }
export function useGetFileLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetFileQuery, GetFileQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetFileQuery, GetFileQueryVariables>(GetFileDocument, options);
        }
export type GetFileQueryHookResult = ReturnType<typeof useGetFileQuery>;
export type GetFileLazyQueryHookResult = ReturnType<typeof useGetFileLazyQuery>;
export type GetFileQueryResult = Apollo.QueryResult<GetFileQuery, GetFileQueryVariables>;
export const ImagesDocument = gql`
    query Images {
  images {
    id
  }
}
    `;

/**
 * __useImagesQuery__
 *
 * To run a query within a React component, call `useImagesQuery` and pass it any options that fit your needs.
 * When your component renders, `useImagesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useImagesQuery({
 *   variables: {
 *   },
 * });
 */
export function useImagesQuery(baseOptions?: Apollo.QueryHookOptions<ImagesQuery, ImagesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ImagesQuery, ImagesQueryVariables>(ImagesDocument, options);
      }
export function useImagesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ImagesQuery, ImagesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ImagesQuery, ImagesQueryVariables>(ImagesDocument, options);
        }
export type ImagesQueryHookResult = ReturnType<typeof useImagesQuery>;
export type ImagesLazyQueryHookResult = ReturnType<typeof useImagesLazyQuery>;
export type ImagesQueryResult = Apollo.QueryResult<ImagesQuery, ImagesQueryVariables>;
export const GetImageDocument = gql`
    query GetImage($id: ID!) {
  image(id: $id) {
    ...Image
  }
}
    ${ImageFragmentDoc}`;

/**
 * __useGetImageQuery__
 *
 * To run a query within a React component, call `useGetImageQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetImageQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetImageQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetImageQuery(baseOptions: Apollo.QueryHookOptions<GetImageQuery, GetImageQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetImageQuery, GetImageQueryVariables>(GetImageDocument, options);
      }
export function useGetImageLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetImageQuery, GetImageQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetImageQuery, GetImageQueryVariables>(GetImageDocument, options);
        }
export type GetImageQueryHookResult = ReturnType<typeof useGetImageQuery>;
export type GetImageLazyQueryHookResult = ReturnType<typeof useGetImageLazyQuery>;
export type GetImageQueryResult = Apollo.QueryResult<GetImageQuery, GetImageQueryVariables>;
export const GetImagesDocument = gql`
    query GetImages($filters: ImageFilter, $pagination: OffsetPaginationInput) {
  images(filters: $filters, pagination: $pagination) {
    ...ListImage
  }
}
    ${ListImageFragmentDoc}`;

/**
 * __useGetImagesQuery__
 *
 * To run a query within a React component, call `useGetImagesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetImagesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetImagesQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useGetImagesQuery(baseOptions?: Apollo.QueryHookOptions<GetImagesQuery, GetImagesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetImagesQuery, GetImagesQueryVariables>(GetImagesDocument, options);
      }
export function useGetImagesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetImagesQuery, GetImagesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetImagesQuery, GetImagesQueryVariables>(GetImagesDocument, options);
        }
export type GetImagesQueryHookResult = ReturnType<typeof useGetImagesQuery>;
export type GetImagesLazyQueryHookResult = ReturnType<typeof useGetImagesLazyQuery>;
export type GetImagesQueryResult = Apollo.QueryResult<GetImagesQuery, GetImagesQueryVariables>;
export const GetInstrumentDocument = gql`
    query GetInstrument($id: ID!) {
  instrument(id: $id) {
    ...Instrument
  }
}
    ${InstrumentFragmentDoc}`;

/**
 * __useGetInstrumentQuery__
 *
 * To run a query within a React component, call `useGetInstrumentQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetInstrumentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetInstrumentQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetInstrumentQuery(baseOptions: Apollo.QueryHookOptions<GetInstrumentQuery, GetInstrumentQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetInstrumentQuery, GetInstrumentQueryVariables>(GetInstrumentDocument, options);
      }
export function useGetInstrumentLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetInstrumentQuery, GetInstrumentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetInstrumentQuery, GetInstrumentQueryVariables>(GetInstrumentDocument, options);
        }
export type GetInstrumentQueryHookResult = ReturnType<typeof useGetInstrumentQuery>;
export type GetInstrumentLazyQueryHookResult = ReturnType<typeof useGetInstrumentLazyQuery>;
export type GetInstrumentQueryResult = Apollo.QueryResult<GetInstrumentQuery, GetInstrumentQueryVariables>;
export const GetObjectiveDocument = gql`
    query GetObjective($id: ID!) {
  objective(id: $id) {
    ...Objective
  }
}
    ${ObjectiveFragmentDoc}`;

/**
 * __useGetObjectiveQuery__
 *
 * To run a query within a React component, call `useGetObjectiveQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetObjectiveQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetObjectiveQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetObjectiveQuery(baseOptions: Apollo.QueryHookOptions<GetObjectiveQuery, GetObjectiveQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetObjectiveQuery, GetObjectiveQueryVariables>(GetObjectiveDocument, options);
      }
export function useGetObjectiveLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetObjectiveQuery, GetObjectiveQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetObjectiveQuery, GetObjectiveQueryVariables>(GetObjectiveDocument, options);
        }
export type GetObjectiveQueryHookResult = ReturnType<typeof useGetObjectiveQuery>;
export type GetObjectiveLazyQueryHookResult = ReturnType<typeof useGetObjectiveLazyQuery>;
export type GetObjectiveQueryResult = Apollo.QueryResult<GetObjectiveQuery, GetObjectiveQueryVariables>;
export const GetStageDocument = gql`
    query GetStage($id: ID!) {
  stage(id: $id) {
    ...Stage
  }
}
    ${StageFragmentDoc}`;

/**
 * __useGetStageQuery__
 *
 * To run a query within a React component, call `useGetStageQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetStageQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetStageQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetStageQuery(baseOptions: Apollo.QueryHookOptions<GetStageQuery, GetStageQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetStageQuery, GetStageQueryVariables>(GetStageDocument, options);
      }
export function useGetStageLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetStageQuery, GetStageQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetStageQuery, GetStageQueryVariables>(GetStageDocument, options);
        }
export type GetStageQueryHookResult = ReturnType<typeof useGetStageQuery>;
export type GetStageLazyQueryHookResult = ReturnType<typeof useGetStageLazyQuery>;
export type GetStageQueryResult = Apollo.QueryResult<GetStageQuery, GetStageQueryVariables>;
export const GetStagesDocument = gql`
    query GetStages($filters: StageFilter, $pagination: OffsetPaginationInput) {
  stages(filters: $filters, pagination: $pagination) {
    ...ListStage
  }
}
    ${ListStageFragmentDoc}`;

/**
 * __useGetStagesQuery__
 *
 * To run a query within a React component, call `useGetStagesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetStagesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetStagesQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useGetStagesQuery(baseOptions?: Apollo.QueryHookOptions<GetStagesQuery, GetStagesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetStagesQuery, GetStagesQueryVariables>(GetStagesDocument, options);
      }
export function useGetStagesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetStagesQuery, GetStagesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetStagesQuery, GetStagesQueryVariables>(GetStagesDocument, options);
        }
export type GetStagesQueryHookResult = ReturnType<typeof useGetStagesQuery>;
export type GetStagesLazyQueryHookResult = ReturnType<typeof useGetStagesLazyQuery>;
export type GetStagesQueryResult = Apollo.QueryResult<GetStagesQuery, GetStagesQueryVariables>;
export const GetTableDocument = gql`
    query GetTable($id: ID!) {
  table(id: $id) {
    ...Table
  }
}
    ${TableFragmentDoc}`;

/**
 * __useGetTableQuery__
 *
 * To run a query within a React component, call `useGetTableQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTableQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTableQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetTableQuery(baseOptions: Apollo.QueryHookOptions<GetTableQuery, GetTableQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetTableQuery, GetTableQueryVariables>(GetTableDocument, options);
      }
export function useGetTableLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetTableQuery, GetTableQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetTableQuery, GetTableQueryVariables>(GetTableDocument, options);
        }
export type GetTableQueryHookResult = ReturnType<typeof useGetTableQuery>;
export type GetTableLazyQueryHookResult = ReturnType<typeof useGetTableLazyQuery>;
export type GetTableQueryResult = Apollo.QueryResult<GetTableQuery, GetTableQueryVariables>;